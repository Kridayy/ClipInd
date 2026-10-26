"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCampaignStatus = exports.createCampaign = exports.getMyCampaigns = exports.getCampaignById = exports.getCampaigns = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
const campaignSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    business: zod_1.z.string().min(1, 'Business name is required'),
    niche: zod_1.z.string().min(1, 'Niche is required'),
    platforms: zod_1.z.array(zod_1.z.string()).default([]),
    description: zod_1.z.string().min(1, 'Description is required'),
    brief: zod_1.z.object({
        do: zod_1.z.string().optional(),
        dont: zod_1.z.string().optional(),
        hook: zod_1.z.string().optional(),
        caption: zod_1.z.string().optional(),
        cta: zod_1.z.string().optional(),
        hashtags: zod_1.z.string().optional(),
        length: zod_1.z.string().optional(),
        platforms: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
    assets: zod_1.z.object({
        logo: zod_1.z.string().nullable().optional(),
        referenceLinks: zod_1.z.array(zod_1.z.string()).optional(),
        audioNotes: zod_1.z.string().optional(),
    }).optional(),
    banner: zod_1.z.string().nullable().optional(),
    rate: zod_1.z.number().positive('Rate must be positive'),
    budget: zod_1.z.number().positive('Budget must be positive'),
    endDate: zod_1.z.string().nullable().optional(),
});
const getCampaigns = async (req, res) => {
    try {
        const campaigns = await prisma.campaign.findMany({
            where: {
                status: client_1.CampaignStatus.LIVE,
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getCampaigns = getCampaigns;
const getCampaignById = async (req, res) => {
    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        if (!campaign) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }
        // Authorization check: if campaign is not live, only owner (or admin) can view it
        if (campaign.status !== 'LIVE') {
            const user = req.user;
            if (!user || (user.userId !== campaign.ownerId && user.role !== 'ADMIN')) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }
        }
        res.json(campaign);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getCampaignById = getCampaignById;
const getMyCampaigns = async (req, res) => {
    try {
        const userId = req.user.userId;
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
            status: c.status === client_1.CampaignStatus.LIVE ? "Live" : c.status === client_1.CampaignStatus.PAUSED ? "Paused" : "Ended",
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
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getMyCampaigns = getMyCampaigns;
const createCampaign = async (req, res) => {
    try {
        const validatedData = campaignSchema.parse(req.body);
        const userId = req.user.userId;
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
                status: client_1.CampaignStatus.LIVE,
            },
        });
        res.status(201).json(campaign);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.createCampaign = createCampaign;
const updateCampaignStatus = async (req, res) => {
    try {
        const { action } = req.params;
        let status = client_1.CampaignStatus.LIVE;
        if (action === 'pause')
            status = client_1.CampaignStatus.PAUSED;
        else if (action === 'end')
            status = client_1.CampaignStatus.ENDED;
        else if (action === 'resume')
            status = client_1.CampaignStatus.LIVE;
        else {
            res.status(400).json({ error: 'Invalid action' });
            return;
        }
        const campaign = await prisma.campaign.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        if (!campaign) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }
        if (campaign.ownerId !== req.user?.userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const updated = await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status },
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.updateCampaignStatus = updateCampaignStatus;
