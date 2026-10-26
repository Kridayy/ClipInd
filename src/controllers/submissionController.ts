import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { VerificationService } from '../services/verification/VerificationService';

const prisma = new PrismaClient();
const verificationService = new VerificationService();

export const createSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: campaignId } = req.params;
    const { platform, postUrl, submittedViews } = req.body;
    const userId = (req as any).user.userId;
    const role = (req as any).user.role;

    if (role !== 'CLIPPER') {
      res.status(403).json({ error: 'Only clippers can submit clips' });
      return;
    }

    if (!platform || !postUrl || typeof submittedViews !== 'number') {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    try {
      new URL(postUrl);
    } catch (e) {
      res.status(400).json({ error: 'Invalid post URL' });
      return;
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: Number(campaignId) },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.status !== 'LIVE') {
      res.status(400).json({ error: 'Campaign is not live' });
      return;
    }

    if (campaign.endDate && new Date() > new Date(campaign.endDate)) {
      res.status(400).json({ error: 'Campaign has expired' });
      return;
    }

    if (campaign.budget <= 0) {
      res.status(400).json({ error: 'Campaign has no remaining budget' });
      return;
    }

    if (!campaign.platforms.includes(platform)) {
      res.status(400).json({ error: 'Platform not allowed by this campaign' });
      return;
    }

    // Check for duplicate submission
    const existing = await prisma.submission.findFirst({
      where: { campaignId: Number(campaignId), clipperId: userId, postUrl }
    });
    if (existing) {
      res.status(400).json({ error: 'Duplicate submission' });
      return;
    }

    const submission = await prisma.submission.create({
      data: {
        campaignId: campaign.id,
        clipperId: userId,
        platform,
        postUrl,
        submittedViews,
        rate: campaign.rate,
      },
    });

    await prisma.notification.create({
      data: {
        userId: campaign.ownerId,
        message: `New submission received for your campaign "${campaign.title}"`,
      }
    });

    // Run verification flow asynchronously to not block the request completely if API is slow
    verificationService.verifySubmission(submission.id).catch(err => {
      console.error('Verification failed for submission', submission.id, err);
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMySubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const submissions = await prisma.submission.findMany({
      where: { clipperId: userId },
      include: { campaign: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSubmissionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const submission = await prisma.submission.findUnique({
      where: { id: Number(id) },
      include: { campaign: true, clipper: { select: { id: true, name: true, username: true } } },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const userId = (req as any).user.userId;
    if (submission.clipperId !== userId && submission.campaign.ownerId !== userId) {
      res.status(403).json({ error: 'Not authorized to view this submission' });
      return;
    }

    res.json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const approveSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const submission = await prisma.submission.findUnique({
      where: { id: Number(id) },
      include: { campaign: true, snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    if (submission.campaign.ownerId !== userId) {
      res.status(403).json({ error: 'Only campaign owner can approve' });
      return;
    }

    if (submission.clipperId === userId) {
      res.status(403).json({ error: 'Cannot approve your own submission' });
      return;
    }

    // We should not rely on req.body.verifiedViews. We use the latest snapshot or submission verifiedViews
    let verifiedViews = submission.verifiedViews || 0;
    
    // Fallback: if they supplied it (e.g. admin override), we could use it, but for security we ignore client input
    // If the system hasn't calculated verifiedViews yet, we can't approve
    if (verifiedViews <= 0) {
      if (submission.snapshots.length > 0) {
        verifiedViews = submission.snapshots[0].views;
      } else {
        res.status(400).json({ error: 'No verified views available yet for this submission' });
        return;
      }
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const currentSub = await tx.submission.findUnique({ where: { id: submission.id } });
        if (currentSub?.status === 'APPROVED') {
          throw new Error('ALREADY_APPROVED');
        }

        // Check for double payout
        const existingTx = await tx.transaction.findFirst({
          where: { submissionId: submission.id, type: 'CLIP_EARNING' }
        });
        if (existingTx) {
          throw new Error('ALREADY_PAID');
        }

        const campaign = await tx.campaign.findUnique({
          where: { id: submission.campaignId },
          include: { submissions: { where: { status: 'APPROVED' } } }
        });

        const spent = campaign!.submissions.reduce((acc, sub) => acc + sub.earnings, 0);
        const earnings = Math.floor((verifiedViews / 1000) * submission.rate);

        if (spent + earnings > campaign!.budget) {
          throw new Error('BUDGET_EXCEEDED');
        }

        const updatedSub = await tx.submission.update({
          where: { id: submission.id },
          data: {
            status: 'APPROVED',
            verifiedViews,
            approvedViews: verifiedViews,
            earnings,
          },
          include: { campaign: true },
        });

        await tx.transaction.create({
          data: {
            userId: submission.clipperId,
            amount: earnings,
            type: 'CLIP_EARNING',
            submissionId: submission.id,
            reference: `Earnings for ${campaign!.title}`,
          }
        });

        await tx.notification.create({
          data: {
            userId: submission.clipperId,
            message: `Your submission for "${campaign!.title}" was approved. You earned ₹${earnings}!`,
          }
        });

        return updatedSub;
      });

      res.json(updated);
    } catch (e: any) {
      if (e.message === 'ALREADY_APPROVED') {
        res.status(400).json({ error: 'Submission already approved' });
        return;
      }
      if (e.message === 'ALREADY_PAID') {
        res.status(400).json({ error: 'Submission already paid out' });
        return;
      }
      if (e.message === 'BUDGET_EXCEEDED') {
        res.status(400).json({ error: 'Campaign budget exceeded' });
        return;
      }
      throw e;
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const rejectSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user.userId;

    const submission = await prisma.submission.findUnique({
      where: { id: Number(id) },
      include: { campaign: true },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    if (submission.campaign.ownerId !== userId) {
      res.status(403).json({ error: 'Only campaign owner can reject' });
      return;
    }

    const updated = await prisma.submission.update({
      where: { id: Number(id) },
      data: {
        status: 'REJECTED',
        feedback: reason,
      },
      include: { campaign: true },
    });

    await prisma.notification.create({
      data: {
        userId: submission.clipperId,
        message: `Your submission for "${submission.campaign.title}" was rejected. Reason: ${reason || 'N/A'}`,
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const requestChanges = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user.userId;

    const submission = await prisma.submission.findUnique({
      where: { id: Number(id) },
      include: { campaign: true },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    if (submission.campaign.ownerId !== userId) {
      res.status(403).json({ error: 'Only campaign owner can request changes' });
      return;
    }

    const updated = await prisma.submission.update({
      where: { id: Number(id) },
      data: {
        status: 'NEEDS_CHANGES',
        feedback: reason,
      },
      include: { campaign: true },
    });

    await prisma.notification.create({
      data: {
        userId: submission.clipperId,
        message: `Changes requested on your submission for "${submission.campaign.title}". Reason: ${reason || 'N/A'}`,
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
