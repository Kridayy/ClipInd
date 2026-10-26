import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'clipind_super_secret_jwt_key_2026';

const generateToken = (userId: number, role: string) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Submission API', () => {
  let clipperToken: string;
  let businessToken: string;
  let otherBusinessToken: string;
  let clipperId: number;
  let businessId: number;
  let campaignId: number;
  let submissionId: number;

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
      data: { name: 'Clipper', username: 'clipper2', email: 'clipper2@test.com', passwordHash: 'hash', role: 'CLIPPER' }
    });
    clipperId = clipper.id;
    clipperToken = generateToken(clipper.id, 'CLIPPER');

    const business = await prisma.user.create({
      data: { name: 'Business', username: 'business2', email: 'biz2@test.com', passwordHash: 'hash', role: 'BUSINESS' }
    });
    businessId = business.id;
    businessToken = generateToken(business.id, 'BUSINESS');

    const otherBusiness = await prisma.user.create({
      data: { name: 'Other', username: 'otherbiz2', email: 'other2@test.com', passwordHash: 'hash', role: 'BUSINESS' }
    });
    otherBusinessToken = generateToken(otherBusiness.id, 'BUSINESS');

    const campaign = await prisma.campaign.create({
      data: {
        title: 'Test Campaign',
        businessName: 'Biz Inc',
        niche: 'Gaming',
        platforms: ['youtube'],
        description: 'Test',
        rate: 50,
        budget: 10000,
        status: 'LIVE',
        ownerId: business.id
      }
    });
    campaignId = campaign.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow clipper to submit a clip', async () => {
    const res = await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set('Cookie', `token=${clipperToken}`)
      .send({ platform: 'youtube', postUrl: 'https://youtube.com/watch?v=123', submittedViews: 1000 });
    
    expect(res.status).toBe(201);
    expect(res.body.postUrl).toBe('https://youtube.com/watch?v=123');
    submissionId = res.body.id;
  });

  it('should prevent duplicate submissions', async () => {
    const res = await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set('Cookie', `token=${clipperToken}`)
      .send({ platform: 'youtube', postUrl: 'https://youtube.com/watch?v=123', submittedViews: 1000 });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Duplicate submission');
  });

  it('should not allow other business to approve', async () => {
    const res = await request(app)
      .post(`/api/submissions/${submissionId}/approve`)
      .set('Cookie', `token=${otherBusinessToken}`)
      .send({});
    
    expect(res.status).toBe(403);
  });

  it('should allow business to approve submission', async () => {
    // Inject MetricSnapshot first
    await prisma.metricSnapshot.create({
      data: {
        submissionId,
        views: 2000, // 2000 views * 50 rate / 1000 = 100 earnings
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
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.earnings).toBe(100);
  });
});
