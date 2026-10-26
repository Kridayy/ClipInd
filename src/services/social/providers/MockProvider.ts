import { SocialPlatformProvider, SocialProfile, PostMetrics, TokenResponse } from '../SocialPlatformProvider';

export class MockProvider implements SocialPlatformProvider {
  async connectAccount(code: string, redirectUri: string): Promise<TokenResponse> {
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
    };
  }

  async getProfile(accessToken: string): Promise<SocialProfile> {
    return {
      id: 'mock_channel_123',
      username: 'mock_user',
      profileUrl: 'https://youtube.com/channel/mock_channel_123',
    };
  }

  validatePostUrl(url: string): string {
    if (!url.includes('youtube') && !url.includes('youtu.be')) {
      throw new Error('Invalid Mock URL');
    }
    return 'mock_video_id';
  }

  async getPostMetrics(postId: string, accessToken?: string): Promise<PostMetrics> {
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

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return {
      accessToken: 'new-mock-access-token',
      expiresIn: 3600,
    };
  }
}
