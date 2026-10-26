import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'clipind_super_secret_jwt_key_2026';

const generateToken = (userId: number, role: string) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Wallet & Immutable Ledger API', () => {
  let clipperToken: string;
  let businessToken: string;
  let clipperId: number;
  let businessId: number;
  let campaignId: number;
  let submissionId: number;
  let methodId: number;

  beforeAll(async () => {
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

    const clipper = await prisma.user.create({
      data: { name: 'Clipper', username: 'clipper3', email: 'clipper3@test.com', passwordHash: 'hash', role: 'CLIPPER' }
    });
    clipperId = clipper.id;
    clipperToken = generateToken(clipper.id, 'CLIPPER');

    const business = await prisma.user.create({
      data: { name: 'Business', username: 'business3', email: 'biz3@test.com', passwordHash: 'hash', role: 'BUSINESS' }
    });
    businessId = business.id;
    businessToken = generateToken(business.id, 'BUSINESS');

    const campaign = await prisma.campaign.create({
      data: {
        title: 'Test Campaign',
        businessName: 'Biz Inc',
        niche: 'Gaming',
        platforms: ['youtube'],
        description: 'Test',
        rate: 50,
        budget: 5000,
        status: 'LIVE',
        ownerId: business.id
      }
    });
    campaignId = campaign.id;

    const submission = await prisma.submission.create({
      data: {
        campaignId,
        clipperId,
        platform: 'youtube',
        postUrl: 'https://youtube.com/watch?v=123',
        submittedViews: 1000,
        rate: 50
      }
    });
    submissionId = submission.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create an immutable transaction upon approval', async () => {
    await prisma.metricSnapshot.create({
      data: {
        submissionId,
        views: 2000, // 2000 views * 50 / 1000 = 100 earnings
        likes: 100,
        comments: 10,
        shares: 5
      }
    });

    const res = await request(app)
      .post(`/api/submissions/${submissionId}/approve`)
      .set('Cookie', `token=${businessToken}`)
      .send({});
    
    expect(res.status).toBe(200);
    expect(res.body.earnings).toBe(100);

    const txs = await prisma.transaction.findMany({ where: { userId: clipperId } });
    expect(txs.length).toBe(1);
    expect(txs[0].amount).toBe(100);
    expect(txs[0].type).toBe('CLIP_EARNING');
  });

  it('should prevent duplicate transaction if already approved', async () => {
    const res = await request(app)
      .post(`/api/submissions/${submissionId}/approve`)
      .set('Cookie', `token=${businessToken}`)
      .send({});
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Submission already approved');
  });

  it('should enforce campaign budget constraints', async () => {
    const sub2 = await prisma.submission.create({
      data: { campaignId, clipperId, platform: 'youtube', postUrl: 'https://youtube.com/watch?v=456', submittedViews: 100000, rate: 50 }
    });

    await prisma.metricSnapshot.create({
      data: { submissionId: sub2.id, views: 200000, likes: 0, comments: 0, shares: 0 } // 200000 * 50 / 1000 = 10000 (exceeds 5000 budget)
    });

    const res = await request(app)
      .post(`/api/submissions/${sub2.id}/approve`)
      .set('Cookie', `token=${businessToken}`)
      .send({});
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Campaign budget exceeded');
  });

  it('should allow adding a payout method', async () => {
    const res = await request(app)
      .post('/api/wallet/methods')
      .set('Cookie', `token=${clipperToken}`)
      .send({ type: 'UPI', identifier: 'test@upi' });
    
    expect(res.status).toBe(201);
    methodId = res.body.id;
  });

  it('should successfully request a payout and deduct balance', async () => {
    const res = await request(app)
      .post('/api/wallet/payout')
      .set('Cookie', `token=${clipperToken}`)
      .send({ amount: 50, methodId });
    
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(50);
  });

  it('should prevent payout exceeding available balance', async () => {
    const res = await request(app)
      .post('/api/wallet/payout')
      .set('Cookie', `token=${clipperToken}`)
      .send({ amount: 100, methodId }); // only 50 left
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Insufficient balance');
  });
});
