"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubmissionAnalytics = exports.getCampaignAnalytics = exports.getBusinessAnalytics = exports.getClipperAnalytics = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getClipperAnalytics = async (req, res) => {
    try {
        const userId = req.user.userId;
        const submissions = await prisma.submission.findMany({
            where: { clipperId: userId }
        });
        const totalVerifiedViews = submissions.reduce((sum, sub) => sum + (sub.verifiedViews || 0), 0);
        const totalEarnings = submissions.reduce((sum, sub) => sum + sub.earnings, 0);
        const clipsSubmitted = submissions.length;
        const approvedClips = submissions.filter(sub => sub.status === 'APPROVED').length;
        const approvalRate = clipsSubmitted > 0 ? (approvedClips / clipsSubmitted) * 100 : 0;
        const averageViews = clipsSubmitted > 0 ? totalVerifiedViews / clipsSubmitted : 0;
        res.json({
            totalVerifiedViews,
            totalEarnings,
            clipsSubmitted,
            approvalRate: Math.round(approvalRate),
            averageViews: Math.round(averageViews)
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getClipperAnalytics = getClipperAnalytics;
const getBusinessAnalytics = async (req, res) => {
    try {
        const userId = req.user.userId;
        const campaigns = await prisma.campaign.findMany({
            where: { ownerId: userId },
            include: {
                submissions: {
                    include: { clipper: true }
                }
            }
        });
        let totalVerifiedViews = 0;
        let campaignSpend = 0;
        let clipsReviewed = 0;
        let totalRates = 0;
        let submissionsCountForCPM = 0;
        const clippersMap = new Map();
        for (const campaign of campaigns) {
            for (const sub of campaign.submissions) {
                totalVerifiedViews += (sub.verifiedViews || 0);
                campaignSpend += sub.earnings;
                clipsReviewed++;
                if (sub.status === 'APPROVED' && sub.verifiedViews && sub.verifiedViews > 0) {
                    totalRates += (sub.earnings / sub.verifiedViews) * 1000;
                    submissionsCountForCPM++;
                }
                const clipperData = clippersMap.get(sub.clipperId) || { name: sub.clipper.name, views: 0, earnings: 0 };
                clipperData.views += (sub.verifiedViews || 0);
                clipperData.earnings += sub.earnings;
                clippersMap.set(sub.clipperId, clipperData);
            }
        }
        const averageCPM = submissionsCountForCPM > 0 ? totalRates / submissionsCountForCPM : 0;
        const topClippers = Array.from(clippersMap.values())
            .sort((a, b) => b.earnings - a.earnings)
            .slice(0, 5);
        res.json({
            totalVerifiedViews,
            campaignSpend,
            averageCPM: Math.round(averageCPM * 100) / 100,
            clipsReviewed,
            topClippers
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getBusinessAnalytics = getBusinessAnalytics;
const getCampaignAnalytics = async (req, res) => {
    try {
        const userId = req.user.userId;
        const campaignId = parseInt(req.params.id, 10);
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { submissions: true }
        });
        if (!campaign) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }
        if (campaign.ownerId !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const totalVerifiedViews = campaign.submissions.reduce((sum, sub) => sum + (sub.verifiedViews || 0), 0);
        const campaignSpend = campaign.submissions.reduce((sum, sub) => sum + sub.earnings, 0);
        const clipsSubmitted = campaign.submissions.length;
        const averageViews = clipsSubmitted > 0 ? totalVerifiedViews / clipsSubmitted : 0;
        res.json({
            totalVerifiedViews,
            campaignSpend,
            clipsSubmitted,
            averageViews: Math.round(averageViews)
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCampaignAnalytics = getCampaignAnalytics;
const getSubmissionAnalytics = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const submissionId = parseInt(req.params.id, 10);
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { campaign: true }
        });
        if (!submission) {
            res.status(404).json({ error: 'Submission not found' });
            return;
        }
        if (userRole === 'CLIPPER' && submission.clipperId !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (userRole === 'BUSINESS' && submission.campaign.ownerId !== userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        res.json({
            verifiedViews: submission.verifiedViews || 0,
            earnings: submission.earnings,
            status: submission.status
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getSubmissionAnalytics = getSubmissionAnalytics;
