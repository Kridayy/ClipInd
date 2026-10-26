"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationService = void 0;
const client_1 = require("@prisma/client");
const YouTubeProvider_1 = require("../social/providers/YouTubeProvider");
const MockProvider_1 = require("../social/providers/MockProvider");
const FraudDetectionService_1 = require("./FraudDetectionService");
const prisma = new client_1.PrismaClient();
class VerificationService {
    fraudService;
    isTestEnv = process.env.NODE_ENV === 'test';
    constructor() {
        this.fraudService = new FraudDetectionService_1.FraudDetectionService();
    }
    getProvider(platform) {
        if (this.isTestEnv) {
            return new MockProvider_1.MockProvider();
        }
        switch (platform.toUpperCase()) {
            case 'YOUTUBE':
                return new YouTubeProvider_1.YouTubeProvider();
            case 'INSTAGRAM':
                // Not implemented for Phase 8, default to Mock or throw
                throw new Error('Instagram verification not yet implemented');
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
    async verifySubmission(submissionId) {
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { campaign: true, clipper: { include: { socialAccounts: true } }, snapshots: { orderBy: { capturedAt: 'asc' } } }
        });
        if (!submission)
            throw new Error('Submission not found');
        const provider = this.getProvider(submission.platform);
        // 1. Validate Post URL
        const postId = provider.validatePostUrl(submission.postUrl);
        // 2. Find connected social account for this platform
        const socialAccount = submission.clipper.socialAccounts.find(acc => acc.platform.toString() === submission.platform.toUpperCase());
        // 3. Fetch Metrics
        const metrics = await provider.getPostMetrics(postId, socialAccount?.accessToken);
        // 4. Fraud Check
        const fraudResult = await this.fraudService.analyze(submission, { ...metrics, id: 0, submissionId, capturedAt: new Date() }, socialAccount?.providerAccountId, metrics.authorId);
        // 5. Create Snapshot & Update Submission
        const verifiedViews = metrics.views; // Simplified for MVP (real world might discount some views)
        const earnings = Math.floor(verifiedViews / 1000 * submission.rate);
        // Cap earnings against campaign budget could go here, but is handled in submission/wallet flows in production.
        await prisma.$transaction([
            prisma.metricSnapshot.create({
                data: {
                    submissionId: submission.id,
                    views: metrics.views,
                    likes: metrics.likes,
                    comments: metrics.comments,
                    shares: metrics.shares
                }
            }),
            prisma.submission.update({
                where: { id: submission.id },
                data: {
                    verifiedViews,
                    earnings,
                    fraudScore: fraudResult.score,
                    fraudFlags: JSON.stringify(fraudResult.flags),
                    isSuspicious: fraudResult.isSuspicious
                }
            })
        ]);
    }
}
exports.VerificationService = VerificationService;
