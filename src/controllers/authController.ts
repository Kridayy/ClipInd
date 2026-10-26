import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { otpService } from '../services/otpService';
import { emailService } from '../services/emailService';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'clipind_super_secret_jwt_key_2026';

const registerSchema = z.object({
  name: z.string().min(1),
  identifier: z.string().min(1), // email or mobile
  method: z.enum(['email', 'mobile']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['CLIPPER', 'BUSINESS', 'ADMIN']).default('CLIPPER')
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    const email = data.method === 'email' ? data.identifier : null;
    const mobile = data.method === 'mobile' ? data.identifier : null;

    // Prevent duplicate accounts
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          mobile ? { mobile } : {}
        ].filter(x => Object.keys(x).length > 0)
      }
    });

    if (existingUser) {
      res.status(400).json({ error: 'User already exists with this ' + data.method });
      return;
    }

    const passwordHash = await argon2.hash(data.password);
    const username = data.name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 10000);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        username,
        email,
        mobile,
        passwordHash,
        role: data.role as any,
        emailVerified: false,
        mobileVerified: false
      }
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    await prisma.verificationCode.create({
      data: {
        code,
        userId: user.id,
        type: data.method.toUpperCase(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
      }
    });

    await otpService.sendOtp(data.identifier, code);

    // Development only: return OTP so tests can access it if needed
    if (process.env.NODE_ENV === 'test') {
       res.json({ message: 'OTP sent successfully', userId: user.id, code });
       return;
    }

    res.json({ message: 'OTP sent successfully', userId: user.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, code } = req.body;
    
    const verification = await prisma.verificationCode.findFirst({
      where: {
        userId: Number(userId),
        code,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verification) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: Number(userId) },
      data: verification.type === 'EMAIL' ? { emailVerified: true } : { mobileVerified: true }
    });

    // Delete used OTP
    await prisma.verificationCode.delete({ where: { id: verification.id } });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { mobile: identifier },
          { username: identifier }
        ]
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.userId }
    });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.body;
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { mobile: identifier },
          { username: identifier }
        ]
      }
    });

    // Always return a success message to prevent account enumeration
    if (!user) {
      res.json({ message: 'If an account exists, reset instructions have been sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    
    await prisma.resetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    if (user.email) {
      await emailService.sendPasswordReset(user.email, resetToken);
    } else if (user.mobile) {
      await otpService.sendOtp(user.mobile, `Reset token: ${resetToken}`);
    }

    if (process.env.NODE_ENV === 'test') {
      res.json({ message: 'If an account exists, reset instructions have been sent.', resetToken });
      return;
    }

    res.json({ message: 'If an account exists, reset instructions have been sent.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    const resetRecord = await prisma.resetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const passwordHash = await argon2.hash(newPassword);

    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash }
    });

    await prisma.resetToken.delete({ where: { id: resetRecord.id } });

    res.json({ message: 'Password reset successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
