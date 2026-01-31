// src/services/youtubeSearchService.ts
import env from '../config/env';
import { apiClient } from './apiClient';

export interface YouTubeSearchResult {
    id: string;
    title: string;
    uploader: string;
    thumbnail: string;
    durationSeconds: number | null;
    url: string;
}

// Parse ISO 8601 duration (PT#H#M#S) into seconds
function parseISODurationToSeconds(duration?: string): number {
    if (!duration) return 0;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const mins = parseInt(match[2] || '0', 10);
    const secs = parseInt(match[3] || '0', 10);
    return hours * 3600 + mins * 60 + secs;
}

export async function searchYouTube(query: string, limit: number = 10): Promise<YouTubeSearchResult[]> {
    if (!query || !query.trim()) return [];

    const apiKey = env.youtubeApiKey || '';

    if (apiKey) {
        // Use YouTube Data API v3 (client-side)
        try {
            // First get search results to retrieve videoIds
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${Math.min(limit, 50)}&q=${encodeURIComponent(query)}&key=${apiKey}`;
            const searchRes = await fetch(searchUrl);
            if (!searchRes.ok) {
                const text = await searchRes.text().catch(() => '');
                throw new Error(`YouTube search failed: ${searchRes.status} ${text}`);
            }
            const searchJson = await searchRes.json();
            const ids = (searchJson.items || []).map((it: any) => it.id?.videoId).filter(Boolean);
            if (ids.length === 0) return [];

            // Then fetch video details to get duration and better thumbnails
            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids.join(',')}&key=${apiKey}`;
            const detailsRes = await fetch(detailsUrl);
            if (!detailsRes.ok) {
                const text = await detailsRes.text().catch(() => '');
                throw new Error(`YouTube videos fetch failed: ${detailsRes.status} ${text}`);
            }
            const detailsJson = await detailsRes.json();
            return (detailsJson.items || []).map((it: any) => {
                const id = it.id;
                const snippet = it.snippet || {};
                const contentDetails = it.contentDetails || {};
                const thumbnail = (snippet.thumbnails && (snippet.thumbnails.medium || snippet.thumbnails.default)) ? (snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url) : '';
                const duration = contentDetails.duration ? parseISODurationToSeconds(contentDetails.duration) : null;
                return {
                    id,
                    title: snippet.title || id,
                    uploader: snippet.channelTitle || '',
                    thumbnail,
                    durationSeconds: duration,
                    url: `https://www.youtube.com/watch?v=${id}`,
                } as YouTubeSearchResult;
            });
        } catch (err: any) {
            // If there's an error using the API key, fallback to server proxy
            console.warn('YouTube client search failed, falling back to server proxy:', err.message || err);
        }
    }

    // Fallback to server-side proxy
    try {
        const response: any = await apiClient.get(`/api/youtube/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        // server expected to return { data: [] } or raw array
        const data = (response && (response.data || response)) || [];
        return (data || []).map((it: any) => ({
            id: it.id || (it.url ? (new URL(it.url)).searchParams.get('v') || '' : ''),
            title: it.title || it.name || '',
            uploader: it.uploader || it.channel || it.channelTitle || '',
            thumbnail: it.thumbnail || it.thumbnails || '',
            durationSeconds: it.durationSeconds != null ? it.durationSeconds : (it.duration ? parseISODurationToSeconds(it.duration) : null),
            url: it.url || `https://www.youtube.com/watch?v=${it.id}`,
        }));
    } catch (err: any) {
        console.error('Server-side YouTube search proxy failed:', err);
        throw err;
    }
}
