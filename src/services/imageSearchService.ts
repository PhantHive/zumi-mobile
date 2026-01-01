// src/services/imageSearchService.ts
// no react-native imports required here

// Simple image search service using Bing Image Search API (Azure Cognitive Services)
// Configure EXPO_PUBLIC_BING_API_KEY and optionally EXPO_PUBLIC_BING_REGION in env/app.json

const BING_KEY = process.env.EXPO_PUBLIC_BING_API_KEY || '';
const BING_REGION = process.env.EXPO_PUBLIC_BING_REGION || '';
const BING_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/images/search';

async function searchDuckDuckGo(query: string, count = 5): Promise<string[]> {
    try {
        const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json`;
        const images: string[] = [];
        let nextUrl: string | null = url;
        // DuckDuckGo returns paginated results; iterate until we have enough or no next
        while (nextUrl && images.length < count) {
            const res = await fetch(nextUrl, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) break;
            const payload = await res.json();
            if (Array.isArray(payload.results)) {
                for (const item of payload.results) {
                    if (item.image) images.push(item.image);
                    else if (item.thumbnail) images.push(item.thumbnail);
                    if (images.length >= count) break;
                }
            }
            // payload.next sometimes contains a relative path; convert to absolute if needed
            if (payload.next) {
                try {
                    const next = payload.next as string;
                    if (next.startsWith('http')) nextUrl = next;
                    else nextUrl = `https://duckduckgo.com${next}`;
                } catch (e) {
                    nextUrl = null;
                }
            } else {
                nextUrl = null;
            }
        }
        return images.slice(0, count);
    } catch (err) {
        console.warn('[imageSearchService] DuckDuckGo search failed', err);
        return [];
    }
}

export async function searchImages(query: string, count = 5): Promise<string[]> {
    // Try DuckDuckGo first (no API key required). This works in React Native because it's not restricted by browser CORS.
    try {
        const ddg = await searchDuckDuckGo(query, count);
        if (ddg && ddg.length > 0) return ddg;
    } catch (e) {
        // ignore and fallback to Bing if available
    }

    if (!BING_KEY) {
        console.warn('[imageSearchService] No BING API key configured (EXPO_PUBLIC_BING_API_KEY). Returning DuckDuckGo results (may be empty).');
        return [];
    }

    try {
        const url = `${BING_ENDPOINT}?q=${encodeURIComponent(query)}&count=${count}&safeSearch=Moderate`;
        const headers: Record<string, string> = {
            'Ocp-Apim-Subscription-Key': BING_KEY,
        };
        if (BING_REGION) headers['Ocp-Apim-Subscription-Region'] = BING_REGION;

        const res = await fetch(url, { headers });
        if (!res.ok) {
            console.warn('[imageSearchService] Bing search failed', res.status, await res.text());
            return [];
        }

        const payload = await res.json();
        const images: string[] = [];

        if (Array.isArray(payload.value)) {
            for (const item of payload.value) {
                // prefer contentUrl (full image) then thumbnailUrl
                if (item.contentUrl) images.push(item.contentUrl);
                else if (item.thumbnailUrl) images.push(item.thumbnailUrl);
                if (images.length >= count) break;
            }
        }

        return images;
    } catch (err) {
        console.warn('[imageSearchService] searchImages error', err);
        return [];
    }
}
