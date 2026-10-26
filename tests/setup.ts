import { prisma } from '../src/utils/prisma';

beforeAll(async () => {
  // Clear the database before all tests
  await prisma.transaction.deleteMany();
  await prisma.payoutRequest.deleteMany();
  await prisma.payoutMethod.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.metricSnapshot.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.resetToken.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
