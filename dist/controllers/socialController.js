"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectAccount = exports.getAccounts = exports.handleCallback = exports.getAuthUrl = void 0;
const client_1 = require("@prisma/client");
const MockProvider_1 = require("../services/social/providers/MockProvider");
const YouTubeProvider_1 = require("../services/social/providers/YouTubeProvider");
const prisma = new client_1.PrismaClient();
const isTestEnv = process.env.NODE_ENV === 'test';
const getProvider = (platform) => {
    if (isTestEnv)
        return new MockProvider_1.MockProvider();
    if (platform === 'YOUTUBE')
        return new YouTubeProvider_1.YouTubeProvider();
    throw new Error(`Unsupported platform ${platform}`);
};
const getAuthUrl = async (req, res) => {
    try {
        const platform = req.params.platform;
        const redirectUri = `${process.env.BASE_URL || 'http://localhost:3000'}/api/social/callback/${platform}`;
        // For MVP, just return the authorization URL
        // A real implementation would generate a state parameter to prevent CSRF
        let authUrl = '';
        if (platform.toUpperCase() === 'YOUTUBE') {
            authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.YOUTUBE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/youtube.readonly&access_type=offline`;
        }
        else {
            res.status(400).json({ error: 'Unsupported platform' });
            return;
        }
        res.json({ url: authUrl });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAuthUrl = getAuthUrl;
const handleCallback = async (req, res) => {
    try {
        const userId = req.user.userId;
        const platform = req.params.platform;
        const { code } = req.query;
        if (!code || typeof code !== 'string') {
            res.status(400).json({ error: 'Code is required' });
            return;
        }
        const provider = getProvider(platform.toUpperCase());
        const redirectUri = `${process.env.BASE_URL || 'http://localhost:3000'}/api/social/callback/${platform}`;
        const tokens = await provider.connectAccount(code, redirectUri);
        const profile = await provider.getProfile(tokens.accessToken);
        const expiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null;
        // Save or update SocialAccount
        await prisma.socialAccount.upsert({
            where: {
                platform_providerAccountId: {
                    platform: platform.toUpperCase(),
                    providerAccountId: profile.id
                }
            },
            update: {
                userId,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken || undefined,
                expiresAt,
                username: profile.username,
                profileUrl: profile.profileUrl
            },
            create: {
                userId,
                platform: platform.toUpperCase(),
                providerAccountId: profile.id,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt,
                username: profile.username,
                profileUrl: profile.profileUrl
            }
        });
        // In a real app we'd redirect to the frontend frontend dashboard
        res.json({ success: true, message: 'Account connected' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.handleCallback = handleCallback;
const getAccounts = async (req, res) => {
    try {
        const userId = req.user.userId;
        const accounts = await prisma.socialAccount.findMany({
            where: { userId },
            select: { id: true, platform: true, username: true, profileUrl: true } // Don't expose tokens
        });
        res.json(accounts);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAccounts = getAccounts;
const disconnectAccount = async (req, res) => {
    try {
        const userId = req.user.userId;
        const accountId = parseInt(req.params.id, 10);
        const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
        if (!account || account.userId !== userId) {
            res.status(404).json({ error: 'Account not found' });
            return;
        }
        await prisma.socialAccount.delete({ where: { id: accountId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.disconnectAccount = disconnectAccount;
