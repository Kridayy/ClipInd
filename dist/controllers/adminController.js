"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = exports.updatePayout = exports.getPayouts = exports.getSubmissions = exports.getCampaigns = exports.suspendUser = exports.getUsers = exports.updateReport = exports.getReports = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getReports = async (req, res) => {
    try {
        const reports = await prisma.report.findMany({
            include: { reporter: { select: { id: true, name: true, username: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getReports = getReports;
const updateReport = async (req, res) => {
    try {
        const reportId = parseInt(req.params.id, 10);
        const { status } = req.body;
        if (!Object.values(client_1.ReportStatus).includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        const report = await prisma.report.update({
            where: { id: reportId },
            data: { status }
        });
        res.json(report);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateReport = updateReport;
const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, username: true, email: true, role: true, isSuspended: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getUsers = getUsers;
const suspendUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.suspendUser = suspendUser;
const getCampaigns = async (req, res) => {
    try {
        const campaigns = await prisma.campaign.findMany({
            include: { owner: { select: { name: true, username: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(campaigns);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCampaigns = getCampaigns;
const getSubmissions = async (req, res) => {
    try {
        const submissions = await prisma.submission.findMany({
            include: { clipper: { select: { name: true, username: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(submissions);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getSubmissions = getSubmissions;
const getPayouts = async (req, res) => {
    try {
        const payouts = await prisma.payoutRequest.findMany({
            include: { user: { select: { name: true, username: true } }, method: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payouts);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getPayouts = getPayouts;
const updatePayout = async (req, res) => {
    try {
        const payoutId = parseInt(req.params.id, 10);
        const { status } = req.body;
        if (!Object.values(client_1.PayoutStatus).includes(status)) {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updatePayout = updatePayout;
const getTransactions = async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            include: { user: { select: { name: true, username: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(transactions);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getTransactions = getTransactions;
