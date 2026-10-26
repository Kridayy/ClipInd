import { Request, Response } from 'express';
import { PrismaClient, SocialPlatform } from '@prisma/client';
import { VerificationService } from '../services/verification/VerificationService';
import { MockProvider } from '../services/social/providers/MockProvider';
import { YouTubeProvider } from '../services/social/providers/YouTubeProvider';

const prisma = new PrismaClient();
const isTestEnv = process.env.NODE_ENV === 'test';

const getProvider = (platform: string) => {
  if (isTestEnv) return new MockProvider();
  if (platform === 'YOUTUBE') return new YouTubeProvider();
  throw new Error(`Unsupported platform ${platform}`);
};

export const getAuthUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const platform = req.params.platform as string;
    const redirectUri = `${process.env.BASE_URL || 'http://localhost:3000'}/api/social/callback/${platform}`;
    
    // For MVP, just return the authorization URL
    // A real implementation would generate a state parameter to prevent CSRF
    let authUrl = '';
    if (platform.toUpperCase() === 'YOUTUBE') {
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.YOUTUBE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/youtube.readonly&access_type=offline`;
    } else {
      res.status(400).json({ error: 'Unsupported platform' });
      return;
    }

    res.json({ url: authUrl });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const platform = req.params.platform as string;
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
          platform: platform.toUpperCase() as SocialPlatform,
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
        platform: platform.toUpperCase() as SocialPlatform,
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const accounts = await prisma.socialAccount.findMany({
      where: { userId },
      select: { id: true, platform: true, username: true, profileUrl: true } // Don't expose tokens
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const disconnectAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const accountId = parseInt(req.params.id as string, 10);

    const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
    
    if (!account || account.userId !== userId) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    await prisma.socialAccount.delete({ where: { id: accountId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
