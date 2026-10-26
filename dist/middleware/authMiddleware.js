"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const JWT_SECRET = process.env.JWT_SECRET || 'clipind_super_secret_jwt_key_2026';
const prisma = new client_1.PrismaClient();
const requireAuth = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Check if user is suspended in DB
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { isSuspended: true }
        });
        if (!user || user.isSuspended) {
            res.status(403).json({ error: 'Account suspended' });
            return;
        }
        req.user = payload;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};
exports.requireAuth = requireAuth;
const requireRole = (roles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
