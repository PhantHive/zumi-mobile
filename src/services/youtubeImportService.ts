// src/services/youtubeImportService.ts
import { apiClient } from './apiClient';

export interface ImportResult {
    url: string;
    data?: any;
    error?: string;
}

const MAX_IMPORT = 5;

export async function importYoutube(urls: string[]): Promise<ImportResult[]> {
    if (!urls || urls.length === 0) {
        throw new Error('No URLs provided');
    }

    // Normalize, dedupe and limit
    const cleaned = Array.from(
        new Set(
            urls
                .map((u) => (u || '').trim())
                .filter((u) => u.length > 0)
        )
    );

    const limited = cleaned.slice(0, MAX_IMPORT);

    try {
        const response = await apiClient.post<ImportResult[]>('/api/songs/import-youtube', { urls: limited });
        // Expecting the server to return an array of per-url results
        return response as any;
    } catch (error: any) {
        // Re-throw so callers can handle network/auth errors
        throw error;
    }
}
