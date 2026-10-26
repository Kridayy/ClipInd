import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'clipind_super_secret_jwt_key_2026';

const generateToken = (userId: number, role: string) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Social Platform Verification API', () => {
  let clipperToken: string;
  let clipperId: number;
  let campaignId: number;
  let submissionId: number;

  beforeAll(async () => {
    // Clear the database
    await prisma.transaction.deleteMany();
    await prisma.payoutRequest.deleteMany();
    await prisma.payoutMethod.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.report.deleteMany();
    await prisma.metricSnapshot.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.socialAccount.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.resetToken.deleteMany();
    await prisma.verificationCode.deleteMany();
    await prisma.user.deleteMany();

    const business = await prisma.user.create({
      data: { name: 'Biz', username: 'biz_social', email: 'biz@social.com', passwordHash: 'hash', role: 'BUSINESS' }
    });

    const clipper = await prisma.user.create({
      data: { name: 'Clip', username: 'clip_social', email: 'clip@social.com', passwordHash: 'hash', role: 'CLIPPER' }
    });
    clipperId = clipper.id;
    clipperToken = generateToken(clipper.id, 'CLIPPER');

    const campaign = await prisma.campaign.create({
      data: {
        title: 'Social Test Campaign',
        businessName: 'Biz Inc',
        description: 'Test description',
        ownerId: business.id,
        niche: 'Gaming',
        platforms: ['YOUTUBE'],
        rate: 5,
        budget: 1000,
        status: 'LIVE'
      }
    });
    campaignId = campaign.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should start OAuth flow', async () => {
    const res = await request(app)
      .get('/api/social/auth/youtube')
      .set('Cookie', `token=${clipperToken}`);

    expect(res.status).toBe(200);
    expect(res.body.url).toContain('accounts.google.com');
  });

  it('should handle OAuth callback and connect account', async () => {
    // We are running in TEST env, so MockProvider will be used, bypassing real OAuth
    const res = await request(app)
      .get('/api/social/callback/youtube?code=mock_oauth_code')
      .set('Cookie', `token=${clipperToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const accounts = await prisma.socialAccount.findMany({ where: { userId: clipperId } });
    expect(accounts.length).toBe(1);
    expect(accounts[0].platform).toBe('YOUTUBE');
    expect(accounts[0].username).toBe('mock_user');
  });

  it('should verify submission automatically on creation', async () => {
    const res = await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set('Cookie', `token=${clipperToken}`)
      .send({ platform: 'YOUTUBE', postUrl: 'https://youtube.com/watch?v=mock_video_id', submittedViews: 0 });

    expect(res.status).toBe(201);
    submissionId = res.body.id;

    // The verification is async, so we need to poll or wait for the DB to update
    await new Promise(resolve => setTimeout(resolve, 500));

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { snapshots: true }
    });

    expect(submission).toBeDefined();
    expect(submission?.verifiedViews).toBe(15000); // From MockProvider
    expect(submission?.earnings).toBe(15000 / 1000 * 5); // 15k views * $5 rate = $75
    expect(submission?.snapshots.length).toBe(1);
    expect(submission?.snapshots[0].likes).toBe(1200);
  });
});
