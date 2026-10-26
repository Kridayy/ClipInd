"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockProvider = void 0;
class MockProvider {
    async connectAccount(code, redirectUri) {
        return {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600,
        };
    }
    async getProfile(accessToken) {
        return {
            id: 'mock_channel_123',
            username: 'mock_user',
            profileUrl: 'https://youtube.com/channel/mock_channel_123',
        };
    }
    validatePostUrl(url) {
        if (!url.includes('youtube') && !url.includes('youtu.be')) {
            throw new Error('Invalid Mock URL');
        }
        return 'mock_video_id';
    }
    async getPostMetrics(postId, accessToken) {
        // Generate deterministic mock metrics for testing based on the postId
        if (postId === 'mock_video_id') {
            return {
                views: 15000,
                likes: 1200,
                comments: 300,
                shares: 50,
                authorId: 'mock_channel_123',
            };
        }
        // Fallback default
        return {
            views: 100,
            likes: 10,
            comments: 1,
            shares: 0,
            authorId: 'mock_channel_123'
        };
    }
    async refreshToken(refreshToken) {
        return {
            accessToken: 'new-mock-access-token',
            expiresIn: 3600,
        };
    }
}
exports.MockProvider = MockProvider;
