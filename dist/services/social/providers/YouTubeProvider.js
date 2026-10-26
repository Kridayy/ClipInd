"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeProvider = void 0;
class YouTubeProvider {
    clientId = process.env.YOUTUBE_CLIENT_ID || '';
    clientSecret = process.env.YOUTUBE_CLIENT_SECRET || '';
    async connectAccount(code, redirectUri) {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });
        if (!res.ok) {
            throw new Error('Failed to connect YouTube account');
        }
        const data = await res.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
        };
    }
    async getProfile(accessToken) {
        const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
            throw new Error('Failed to fetch YouTube profile');
        }
        const data = await res.json();
        if (!data.items || data.items.length === 0) {
            throw new Error('No YouTube channel found');
        }
        const channel = data.items[0];
        return {
            id: channel.id,
            username: channel.snippet.customUrl || channel.snippet.title,
            profileUrl: `https://youtube.com/channel/${channel.id}`,
        };
    }
    validatePostUrl(url) {
        // Matches youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = url.match(regex);
        if (!match || !match[1]) {
            throw new Error('Invalid YouTube URL');
        }
        return match[1];
    }
    async getPostMetrics(postId, accessToken) {
        // If accessToken is provided, use it (allows seeing private video stats if owned).
        // Otherwise fallback to API key for public stats.
        const headers = {};
        let url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${postId}`;
        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }
        else {
            url += `&key=${process.env.YOUTUBE_API_KEY || ''}`;
        }
        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error('Failed to fetch YouTube video metrics');
        }
        const data = await res.json();
        if (!data.items || data.items.length === 0) {
            throw new Error('YouTube video not found');
        }
        const video = data.items[0];
        const stats = video.statistics;
        return {
            views: parseInt(stats.viewCount || '0', 10),
            likes: parseInt(stats.likeCount || '0', 10),
            comments: parseInt(stats.commentCount || '0', 10),
            shares: 0, // YouTube API doesn't expose shares publicly
            authorId: video.snippet.channelId,
        };
    }
    async refreshToken(refreshToken) {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        });
        if (!res.ok) {
            throw new Error('Failed to refresh YouTube token');
        }
        const data = await res.json();
        return {
            accessToken: data.access_token,
            expiresIn: data.expires_in,
        };
    }
}
exports.YouTubeProvider = YouTubeProvider;
