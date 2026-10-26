import { PrismaClient, CampaignStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if we already have seed campaigns or any user
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Admin',
      username: 'admin',
      email: 'admin@clipind.com',
      passwordHash: 'dummy_hash', // In a real app this should be hashed
      role: 'ADMIN',
    },
  });

  const business = await prisma.user.upsert({
    where: { username: 'global_creator_network' },
    update: {},
    create: {
      name: 'Global Creator Network',
      username: 'global_creator_network',
      email: 'contact@globalcreatornetwork.com',
      passwordHash: 'dummy_hash',
      role: 'BUSINESS',
    },
  });

  const existingCampaigns = await prisma.campaign.count();
  
  if (existingCampaigns === 0) {
    console.log('Seeding initial campaigns...');
    await prisma.campaign.createMany({
      data: [
        {
          title: "Podcast Growth Campaign",
          businessName: "Global Creator Network",
          niche: "Podcasts",
          rate: 50,
          budget: 150000,
          status: CampaignStatus.LIVE,
          description: "Create engaging short-form clips from approved podcast episodes and publish them to Indian audiences.",
          ownerId: business.id,
        },
        {
          title: "AI & Future of Work",
          businessName: "Future Labs",
          niche: "Technology",
          rate: 60,
          budget: 90000,
          status: CampaignStatus.LIVE,
          description: "Turn long-form conversations about AI, startups and careers into short, high-retention videos.",
          ownerId: business.id,
        },
        {
          title: "Entrepreneur Stories",
          businessName: "Founders Studio",
          niche: "Business",
          rate: 45,
          budget: 75000,
          status: CampaignStatus.LIVE,
          description: "Clip founder interviews and business lessons for Instagram Reels and YouTube Shorts.",
          ownerId: business.id,
        }
      ]
    });
    console.log('Seed campaigns created.');
  } else {
    console.log('Campaigns already exist. Skipping seed.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
