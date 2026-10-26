import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/utils/prisma';
import argon2 from 'argon2';

describe('Authentication API', () => {
  let userCookies: string[] = [];
  let testUserId: number;
  let resetToken: string;

  describe('POST /api/auth/register', () => {
    it('should register a new user and return an OTP', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          identifier: 'test@example.com',
          method: 'email',
          password: 'password123',
          role: 'CLIPPER'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('OTP sent successfully');
      expect(res.body.userId).toBeDefined();
      expect(res.body.code).toBeDefined();
      
      testUserId = res.body.userId;
    });

    it('should prevent duplicate registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          identifier: 'test@example.com', // Duplicate
          method: 'email',
          password: 'password123',
          role: 'CLIPPER'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/User already exists/);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify the OTP and log the user in', async () => {
      const verification = await prisma.verificationCode.findFirst({
        where: { userId: testUserId }
      });
      
      const res = await request(app)
        .post('/api/auth/verify')
        .send({
          userId: testUserId,
          code: verification?.code
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.emailVerified).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();
      
      // Store cookies for subsequent requests
      userCookies = res.headers['set-cookie'] as any;
    });
  });

  describe('POST /api/auth/login', () => {
    it('should fail with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should log in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      userCookies = res.headers['set-cookie'] as any;
    });
  });

  describe('GET /api/auth/me', () => {
    it('should fail if unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return user info if authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', userCookies);
      
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      // Assert no password hash is returned
      expect(res.body.user.passwordHash).toBeUndefined();
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send reset instructions', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ identifier: 'test@example.com' });
      
      expect(res.status).toBe(200);
      expect(res.body.resetToken).toBeDefined(); // Only exposed in test env
      
      resetToken = res.body.resetToken;
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'newpassword456'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reset successfully');

      // Verify the new password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'newpassword456'
        });
      expect(loginRes.status).toBe(200);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear the token cookie', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', userCookies);
      
      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'][0]).toMatch(/token=;/);
    });
  });
});
