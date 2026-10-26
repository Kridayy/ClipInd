import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const payoutMethodSchema = z.object({
  type: z.string().min(1),
  identifier: z.string().min(1),
});

const payoutRequestSchema = z.object({
  amount: z.number().positive(),
  methodId: z.number().int().positive(),
});

export const getWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const transactions = await prisma.transaction.findMany({
      where: { userId },
    });

    const balance = transactions.reduce((acc, t) => acc + t.amount, 0);
    const totalEarned = transactions
      .filter((t) => t.type === 'CLIP_EARNING' || t.type === 'BONUS')
      .reduce((acc, t) => acc + t.amount, 0);

    res.json({ balance, totalEarned });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const methods = await prisma.payoutMethod.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(methods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const addMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { type, identifier } = payoutMethodSchema.parse(req.body);

    const method = await prisma.payoutMethod.create({
      data: {
        userId,
        type,
        identifier,
      },
    });
    res.status(201).json(method);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors[0].message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const removeMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const method = await prisma.payoutMethod.findUnique({
      where: { id: Number(id) },
    });

    if (!method) {
      res.status(404).json({ error: 'Method not found' });
      return;
    }

    if (method.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // We can't delete if there are pending requests, but for MVP we will just delete it 
    // or cascading will handle it if we set it up. Actually, requests restrict deletion.
    // Let's just delete it and if it fails, throw 400.
    try {
      await prisma.payoutMethod.delete({
        where: { id: Number(id) },
      });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: 'Cannot delete method that is currently in use for a payout request' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const payouts = await prisma.payoutRequest.findMany({
      where: { userId },
      include: { method: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payouts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const requestPayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { amount, methodId } = payoutRequestSchema.parse(req.body);

    const method = await prisma.payoutMethod.findUnique({
      where: { id: methodId },
    });

    if (!method || method.userId !== userId) {
      res.status(400).json({ error: 'Invalid payout method' });
      return;
    }

    try {
      const payout = await prisma.$transaction(async (tx) => {
        // Calculate current balance
        const transactions = await tx.transaction.findMany({
          where: { userId },
        });
        const balance = transactions.reduce((acc, t) => acc + t.amount, 0);

        if (balance < amount) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        // Create transaction to deduct funds
        await tx.transaction.create({
          data: {
            userId,
            amount: -amount,
            type: 'PAYOUT',
            reference: `Payout requested to ${method.type}`,
          },
        });

        // Create payout request
        const request = await tx.payoutRequest.create({
          data: {
            userId,
            amount,
            methodId,
            status: 'PENDING',
          },
        });

        return request;
      });

      res.status(201).json(payout);
    } catch (e: any) {
      if (e.message === 'INSUFFICIENT_BALANCE') {
        res.status(400).json({ error: 'Insufficient balance' });
        return;
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors[0].message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
