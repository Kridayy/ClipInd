import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'clipind_super_secret_jwt_key_2026';

describe('Campaigns API', () => {
  let businessToken: string;
  let clipperToken: string;
  let businessUserId: number;

  beforeAll(async () => {
    // Clear DB
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

    // Create Business User
    const businessUser = await prisma.user.create({
      data: {
        name: 'Test Business',
        username: 'test_business',
        email: 'business@test.com',
        passwordHash: 'dummy',
        role: 'BUSINESS',
      }
    });
    businessUserId = businessUser.id;
    businessToken = jwt.sign({ userId: businessUser.id, role: 'BUSINESS' }, JWT_SECRET);

    // Create Clipper User
    const clipperUser = await prisma.user.create({
      data: {
        name: 'Test Clipper',
        username: 'test_clipper',
        email: 'clipper@test.com',
        passwordHash: 'dummy',
        role: 'CLIPPER',
      }
    });
    clipperToken = jwt.sign({ userId: clipperUser.id, role: 'CLIPPER' }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  let campaignId: number;

  it('should allow business to create a campaign', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', [`token=${businessToken}`])
      .send({
        title: 'New Campaign',
        business: 'Test Business',
        niche: 'Tech',
        rate: 50,
        budget: 10000,
        description: 'Test description',
        platforms: ['Instagram Reels']
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    campaignId = res.body.id;
  });

  it('should not allow clipper to create a campaign', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', [`token=${clipperToken}`])
      .send({
        title: 'New Campaign',
        business: 'Test Clipper',
        niche: 'Tech',
        rate: 50,
        budget: 10000,
        description: 'Test description',
        platforms: ['Instagram Reels']
      });

    expect(res.status).toBe(403);
  });

  it('should list campaigns for business', async () => {
    const res = await request(app)
      .get('/api/campaigns/business/me')
      .set('Cookie', [`token=${businessToken}`]);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('New Campaign');
  });

  it('should list live campaigns for clippers', async () => {
    const res = await request(app)
      .get('/api/campaigns')
      .set('Cookie', [`token=${clipperToken}`]);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(1);
  });

  it('should allow business to pause their campaign', async () => {
    const res = await request(app)
      .post(`/api/campaigns/${campaignId}/pause`)
      .set('Cookie', [`token=${businessToken}`]);
      
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAUSED');
  });

  it('should not list paused campaigns for clippers', async () => {
    const res = await request(app)
      .get('/api/campaigns')
      .set('Cookie', [`token=${clipperToken}`]);
      
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0); // Because we paused it
  });

});
