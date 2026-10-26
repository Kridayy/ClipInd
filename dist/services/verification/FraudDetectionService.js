"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudDetectionService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class FraudDetectionService {
    /**
     * Analyzes a submission and its new metric snapshot for fraudulent activity.
     */
    async analyze(submission, newSnapshot, expectedAuthorId, actualAuthorId) {
        let score = 0.0;
        const flags = [];
        // 1. Account Mismatch Signal
        if (expectedAuthorId && actualAuthorId && expectedAuthorId !== actualAuthorId) {
            flags.push('AUTHOR_MISMATCH');
            score += 0.8; // High suspicion
        }
        // 2. Velocity Signal (Impossible views jump)
        if (submission.snapshots && submission.snapshots.length > 0) {
            const lastSnapshot = submission.snapshots[submission.snapshots.length - 1];
            const timeDiffHours = (newSnapshot.capturedAt.getTime() - lastSnapshot.capturedAt.getTime()) / (1000 * 60 * 60);
            if (timeDiffHours > 0) {
                const viewDiff = newSnapshot.views - lastSnapshot.views;
                const velocity = viewDiff / timeDiffHours;
                // e.g., gaining 1 million views per hour might be flagged depending on the account size
                // For MVP, arbitrary high velocity threshold
                if (velocity > 500000) {
                    flags.push('HIGH_VELOCITY');
                    score += 0.5;
                }
                // Views shouldn't decrease significantly
                if (viewDiff < 0) {
                    flags.push('NEGATIVE_VIEWS');
                    score += 0.3;
                }
            }
        }
        // 3. Suspicious Engagement Ratio (e.g. 100,000 views but 0 likes)
        if (newSnapshot.views > 10000) {
            const engagement = newSnapshot.likes + newSnapshot.comments;
            const ratio = engagement / newSnapshot.views;
            if (ratio < 0.0001) { // 0.01% engagement
                flags.push('LOW_ENGAGEMENT_RATIO');
                score += 0.4;
            }
        }
        const isSuspicious = score >= 0.7;
        return { isSuspicious, flags, score };
    }
}
exports.FraudDetectionService = FraudDetectionService;
