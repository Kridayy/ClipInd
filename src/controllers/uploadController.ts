import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { LocalDiskProvider } from '../services/storage/LocalDiskProvider';

const prisma = new PrismaClient();
const storageProvider = new LocalDiskProvider(); // Easy to swap with S3Provider later

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const key = req.params.key as string;

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
