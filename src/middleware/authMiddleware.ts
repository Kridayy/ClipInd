import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'clipind_super_secret_jwt_key_2026';
const prisma = new PrismaClient();

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.cookies.token;
  
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if user is suspended in DB
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isSuspended: true }
    });

    if (!user || user.isSuspended) {
      res.status(403).json({ error: 'Account suspended' });
      return;
    }

    (req as any).user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
};
