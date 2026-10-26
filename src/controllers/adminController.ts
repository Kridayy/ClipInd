import { Request, Response } from 'express';
import { PrismaClient, ReportStatus, PayoutStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const reports = await prisma.report.findMany({
      include: { reporter: { select: { id: true, name: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const reportId = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    if (!Object.values(ReportStatus).includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status }
    });

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, username: true, email: true, role: true, isSuspended: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const suspendUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id as string, 10);
    const { isSuspended } = req.body;

    if (typeof isSuspended !== 'boolean') {
      res.status(400).json({ error: 'isSuspended must be a boolean' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isSuspended },
      select: { id: true, name: true, isSuspended: true }
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: { owner: { select: { name: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(campaigns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const submissions = await prisma.submission.findMany({
      include: { clipper: { select: { name: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const payouts = await prisma.payoutRequest.findMany({
      include: { user: { select: { name: true, username: true } }, method: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(payouts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const payoutId = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    if (!Object.values(PayoutStatus).includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const payout = await prisma.payoutRequest.update({
      where: { id: payoutId },
      data: { status }
    });

    // Note: In a real system we would handle FAILED/CANCELLED by refunding the ledger.
    // For this prototype, we just update the status.

    res.json(payout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { user: { select: { name: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
