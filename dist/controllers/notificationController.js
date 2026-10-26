"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationRead = exports.markRead = exports.markAsRead = exports.getNotifications = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.json(notifications);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.markAsRead = markAsRead;
const markRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        await prisma.notification.updateMany({
            where: { userId },
            data: { read: true }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.markRead = markRead;
const markNotificationRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationId = parseInt(req.params.id, 10);
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId }
        });
        if (!notification) {
            res.status(404).json({ error: 'Notification not found' });
            return;
        }
        if (notification.userId !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        await prisma.notification.update({
            where: { id: notificationId },
            data: { read: true }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.markNotificationRead = markNotificationRead;
