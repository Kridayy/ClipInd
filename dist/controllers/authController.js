"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.me = exports.logout = exports.login = exports.verifyOtp = exports.register = void 0;
const prisma_1 = require("../utils/prisma");
const argon2_1 = __importDefault(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const otpService_1 = require("../services/otpService");
const emailService_1 = require("../services/emailService");
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = process.env.JWT_SECRET || 'clipind_super_secret_jwt_key_2026';
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    identifier: zod_1.z.string().min(1), // email or mobile
    method: zod_1.z.enum(['email', 'mobile']),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    role: zod_1.z.enum(['CLIPPER', 'BUSINESS', 'ADMIN']).default('CLIPPER')
});
const register = async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);
        const email = data.method === 'email' ? data.identifier : null;
        const mobile = data.method === 'mobile' ? data.identifier : null;
        // Prevent duplicate accounts
        const existingUser = await prisma_1.prisma.user.findFirst({
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
        const passwordHash = await argon2_1.default.hash(data.password);
        const username = data.name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 10000);
        const user = await prisma_1.prisma.user.create({
            data: {
                name: data.name,
                username,
                email,
                mobile,
                passwordHash,
                role: data.role,
                emailVerified: false,
                mobileVerified: false
            }
        });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma_1.prisma.verificationCode.create({
            data: {
                code,
                userId: user.id,
                type: data.method.toUpperCase(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
            }
        });
        await otpService_1.otpService.sendOtp(data.identifier, code);
        // Development only: return OTP so tests can access it if needed
        if (process.env.NODE_ENV === 'test') {
            res.json({ message: 'OTP sent successfully', userId: user.id, code });
            return;
        }
        res.json({ message: 'OTP sent successfully', userId: user.id });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.register = register;
const verifyOtp = async (req, res) => {
    try {
        const { userId, code } = req.body;
        const verification = await prisma_1.prisma.verificationCode.findFirst({
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
        const user = await prisma_1.prisma.user.update({
            where: { id: Number(userId) },
            data: verification.type === 'EMAIL' ? { emailVerified: true } : { mobileVerified: true }
        });
        // Delete used OTP
        await prisma_1.prisma.verificationCode.delete({ where: { id: verification.id } });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        const { passwordHash: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.verifyOtp = verifyOtp;
const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const user = await prisma_1.prisma.user.findFirst({
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
        const valid = await argon2_1.default.verify(user.passwordHash, password);
        if (!valid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        const { passwordHash: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.login = login;
const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};
exports.logout = logout;
const me = async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const { passwordHash: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.me = me;
const forgotPassword = async (req, res) => {
    try {
        const { identifier } = req.body;
        const user = await prisma_1.prisma.user.findFirst({
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
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        await prisma_1.prisma.resetToken.create({
            data: {
                token: resetToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
            }
        });
        if (user.email) {
            await emailService_1.emailService.sendPasswordReset(user.email, resetToken);
        }
        else if (user.mobile) {
            await otpService_1.otpService.sendOtp(user.mobile, `Reset token: ${resetToken}`);
        }
        if (process.env.NODE_ENV === 'test') {
            res.json({ message: 'If an account exists, reset instructions have been sent.', resetToken });
            return;
        }
        res.json({ message: 'If an account exists, reset instructions have been sent.' });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const resetRecord = await prisma_1.prisma.resetToken.findUnique({
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
        const passwordHash = await argon2_1.default.hash(newPassword);
        await prisma_1.prisma.user.update({
            where: { id: resetRecord.userId },
            data: { passwordHash }
        });
        await prisma_1.prisma.resetToken.delete({ where: { id: resetRecord.id } });
        res.json({ message: 'Password reset successfully' });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.resetPassword = resetPassword;
