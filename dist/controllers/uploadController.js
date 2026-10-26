"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.uploadFile = void 0;
const client_1 = require("@prisma/client");
const LocalDiskProvider_1 = require("../services/storage/LocalDiskProvider");
const prisma = new client_1.PrismaClient();
const storageProvider = new LocalDiskProvider_1.LocalDiskProvider(); // Easy to swap with S3Provider later
const uploadFile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        // Storage Provider handles physical storage
        const { url, key } = await storageProvider.upload(file.buffer, file.originalname, file.mimetype);
        // Database tracks the asset
        const asset = await prisma.asset.create({
            data: {
                url,
                key,
                fileType: file.mimetype,
                size: file.size,
                ownerId: userId
            }
        });
        res.status(201).json(asset);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.uploadFile = uploadFile;
const deleteFile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const key = req.params.key;
        const asset = await prisma.asset.findUnique({ where: { key } });
        if (!asset) {
            res.status(404).json({ error: 'Asset not found' });
            return;
        }
        if (asset.ownerId !== userId && userRole !== 'ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        // Remove from physical storage
        await storageProvider.delete(key);
        // Remove from DB
        await prisma.asset.delete({ where: { key } });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteFile = deleteFile;
