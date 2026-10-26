import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'clipind_super_secret_jwt_key_2026';

const generateToken = (userId: number, role: string) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Admin, Reports and Analytics API', () => {
  let adminToken: string;
  let clipperToken: string;
  let adminId: number;
  let clipperId: number;
  let reportId: number;

  beforeAll(async () => {
    // Clear the database before all tests
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

    const admin = await prisma.user.create({
      data: { name: 'Admin', username: 'admin1', email: 'admin@test.com', passwordHash: 'hash', role: 'ADMIN' }
    });
    adminId = admin.id;
    adminToken = generateToken(admin.id, 'ADMIN');

    const clipper = await prisma.user.create({
      data: { name: 'Clip', username: 'clip1', email: 'clip@test.com', passwordHash: 'hash', role: 'CLIPPER' }
    });
    clipperId = clipper.id;
    clipperToken = generateToken(clipper.id, 'CLIPPER');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow user to submit a report', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Cookie', `token=${clipperToken}`)
      .send({ targetId: 999, targetType: 'CAMPAIGN', reason: 'Spam' });
    
    expect(res.status).toBe(201);
    expect(res.body.reason).toBe('Spam');
    reportId = res.body.id;
  });

  it('should allow admin to view reports', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Cookie', `token=${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe(reportId);
  });

  it('should block non-admin from admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Cookie', `token=${clipperToken}`);
    
    expect(res.status).toBe(403);
  });

  it('should allow admin to update report status', async () => {
    const res = await request(app)
      .patch(`/api/admin/reports/${reportId}`)
      .set('Cookie', `token=${adminToken}`)
      .send({ status: 'RESOLVED' });
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RESOLVED');
  });

  it('should allow admin to suspend a user', async () => {
    const res = await request(app)
      .post(`/api/admin/users/${clipperId}/suspend`)
      .set('Cookie', `token=${adminToken}`)
      .send({ isSuspended: true });
    
    expect(res.status).toBe(200);
    expect(res.body.isSuspended).toBe(true);
  });

  it('should block suspended user from authenticated actions', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Cookie', `token=${clipperToken}`)
      .send({ targetType: 'USER', reason: 'Testing' });
    
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Account suspended');
  });
});
