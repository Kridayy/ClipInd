import { Request, Response } from 'express';
import { PrismaClient, CampaignStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const campaignSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  business: z.string().min(1, 'Business name is required'),
  niche: z.string().min(1, 'Niche is required'),
  platforms: z.array(z.string()).default([]),
  description: z.string().min(1, 'Description is required'),
  brief: z.object({
    do: z.string().optional(),
    dont: z.string().optional(),
    hook: z.string().optional(),
    caption: z.string().optional(),
    cta: z.string().optional(),
    hashtags: z.string().optional(),
    length: z.string().optional(),
    platforms: z.array(z.string()).optional(),
  }).optional(),
  assets: z.object({
    logo: z.string().nullable().optional(),
    referenceLinks: z.array(z.string()).optional(),
    audioNotes: z.string().optional(),
  }).optional(),
  banner: z.string().nullable().optional(),
  rate: z.number().positive('Rate must be positive'),
  budget: z.number().positive('Budget must be positive'),
  endDate: z.string().nullable().optional(),
});

export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: CampaignStatus.LIVE,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const mappedCampaigns = campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      business: c.businessName,
      niche: c.niche,
      rate: c.rate,
      budget: c.budget,
      views: "0",
      status: "Live",
      description: c.description,
      banner: c.banner,
      endDate: c.endDate?.toISOString() || null,
      brief: {
        do: c.do[0] || "",
        dont: c.dont[0] || "",
        hook: c.hookStyle || "",
        caption: c.captionStyle || "",
        cta: c.cta || "",
        hashtags: c.hashtags[0] || "",
        length: c.videoLength || "",
        platforms: c.platforms,
      },
      assets: {
        logo: c.logo,
        referenceLinks: c.referenceLinks,
        audioNotes: c.audioNotes || "",
      },
      // Note: Phase 3 does not have submissions implemented yet, so budget remaining = budget
      remainingBudget: c.budget
    }));

    res.json(mappedCampaigns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCampaignById = async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: parseInt(req.params.id as string) },
    });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    
    // Authorization check: if campaign is not live, only owner (or admin) can view it
    if (campaign.status !== 'LIVE') {
      const user = (req as any).user;
      if (!user || (user.userId !== campaign.ownerId && user.role !== 'ADMIN')) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }
    
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMyCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const campaigns = await prisma.campaign.findMany({
      where: { ownerId: userId },
      include: { owner: { select: { id: true, name: true, username: true } }, submissions: true },
      orderBy: { createdAt: 'desc' },
    });

    const mappedCampaigns = campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      business: c.businessName,
      niche: c.niche,
      rate: c.rate,
      budget: c.budget,
      views: "0",
      status: c.status === CampaignStatus.LIVE ? "Live" : c.status === CampaignStatus.PAUSED ? "Paused" : "Ended",
      description: c.description,
      banner: c.banner,
      endDate: c.endDate?.toISOString() || null,
      brief: {
        do: c.do[0] || "",
        dont: c.dont[0] || "",
        hook: c.hookStyle || "",
        caption: c.captionStyle || "",
        cta: c.cta || "",
        hashtags: c.hashtags[0] || "",
        length: c.videoLength || "",
        platforms: c.platforms,
      },
      assets: {
        logo: c.logo,
        referenceLinks: c.referenceLinks,
        audioNotes: c.audioNotes || "",
      },
      remainingBudget: c.budget,
      submissions: c.submissions,
    }));

    res.json(mappedCampaigns);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const validatedData = campaignSchema.parse(req.body);
    const userId = (req as any).user!.userId;

    const campaign = await prisma.campaign.create({
      data: {
        title: validatedData.title,
        businessName: validatedData.business,
        niche: validatedData.niche,
        platforms: validatedData.platforms,
        description: validatedData.description,
        do: validatedData.brief?.do ? [validatedData.brief.do] : [],
        dont: validatedData.brief?.dont ? [validatedData.brief.dont] : [],
        hookStyle: validatedData.brief?.hook || null,
        captionStyle: validatedData.brief?.caption || null,
        cta: validatedData.brief?.cta || null,
        hashtags: validatedData.brief?.hashtags ? [validatedData.brief.hashtags] : [],
        videoLength: validatedData.brief?.length || null,
        banner: validatedData.banner || null,
        logo: validatedData.assets?.logo || null,
        referenceLinks: validatedData.assets?.referenceLinks || [],
        audioNotes: validatedData.assets?.audioNotes || null,
        rate: validatedData.rate,
        budget: validatedData.budget,
        startDate: new Date(),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        owner: { connect: { id: userId } },
        status: CampaignStatus.LIVE,
      },
    });

    res.status(201).json(campaign);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors[0].message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateCampaignStatus = async (req: Request, res: Response) => {
  try {
    const { action } = req.params;
    let status: CampaignStatus = CampaignStatus.LIVE;
    
    if (action === 'pause') status = CampaignStatus.PAUSED;
    else if (action === 'end') status = CampaignStatus.ENDED;
    else if (action === 'resume') status = CampaignStatus.LIVE;
    else {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: parseInt(req.params.id as string) },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.ownerId !== (req as any).user?.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
