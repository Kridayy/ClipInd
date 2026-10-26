export interface SocialProfile {
  id: string;
  username: string;
  profileUrl: string;
}

export interface PostMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  authorId?: string; // To verify ownership against SocialProfile.id
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface SocialPlatformProvider {
  /**
   * Exchanges an authorization code for tokens.
   */
  connectAccount(code: string, redirectUri: string): Promise<TokenResponse>;
  
  /**
   * Fetches the user's profile using an access token.
   */
  getProfile(accessToken: string): Promise<SocialProfile>;
  
  /**
   * Validates a URL and extracts the canonical post ID.
   * Throws if URL is invalid for this platform.
   */
  validatePostUrl(url: string): string;
  
  /**
   * Fetches the public or private metrics for a post.
   */
  getPostMetrics(postId: string, accessToken?: string): Promise<PostMetrics>;
  
  /**
   * Refreshes an access token if supported.
   */
  refreshToken(refreshToken: string): Promise<TokenResponse>;
}
