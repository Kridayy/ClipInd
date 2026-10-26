import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'clipind_super_secret_jwt_key_2026';

const generateToken = (userId: number, role: string) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

describe('File Storage Abstraction API', () => {
  let clipperToken: string;
  let businessToken: string;
  let adminToken: string;
  let clipperId: number;
  let uploadedKey: string;

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

    const clipper = await prisma.user.create({
      data: { name: 'Clip', username: 'clip_upload', email: 'clip@upload.com', passwordHash: 'hash', role: 'CLIPPER' }
    });
    clipperId = clipper.id;
    clipperToken = generateToken(clipper.id, 'CLIPPER');

    const business = await prisma.user.create({
      data: { name: 'Biz', username: 'biz_upload', email: 'biz@upload.com', passwordHash: 'hash', role: 'BUSINESS' }
    });
    businessToken = generateToken(business.id, 'BUSINESS');

    const admin = await prisma.user.create({
      data: { name: 'Admin', username: 'admin_upload', email: 'admin@upload.com', passwordHash: 'hash', role: 'ADMIN' }
    });
    adminToken = generateToken(admin.id, 'ADMIN');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should upload a valid image file successfully', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', `token=${clipperToken}`)
      .attach('file', Buffer.from('fake image content'), { filename: 'avatar.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('url');
    expect(res.body).toHaveProperty('key');
    expect(res.body.fileType).toBe('image/png');
    expect(res.body.ownerId).toBe(clipperId);
    
    uploadedKey = res.body.key;
  });

  it('should reject non-image files', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', `token=${clipperToken}`)
      .attach('file', Buffer.from('fake exe content'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Only images are allowed');
  });

  it('should prevent deleting an asset owned by someone else', async () => {
    const res = await request(app)
      .delete(`/api/upload/${uploadedKey}`)
      .set('Cookie', `token=${businessToken}`); // Business trying to delete clipper's avatar

    expect(res.status).toBe(403);
  });

  it('should allow ADMIN to delete any asset', async () => {
    const res = await request(app)
      .delete(`/api/upload/${uploadedKey}`)
      .set('Cookie', `token=${adminToken}`); 

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
