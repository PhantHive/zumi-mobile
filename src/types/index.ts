// src/types/index.ts
export interface Song {
    id: number;
    title: string;
    artist: string;
    genre: string;
    duration?: number;
    filepath: string;
    albumId: string;
    thumbnailUrl?: string;
    // Enhanced metadata
    uploadedBy?: string; // Email of uploader
    visibility?: 'public' | 'private'; // Song visibility
    year?: number;
    bpm?: number;
    mood?: string;
    language?: string;
    lyrics?: string;
    playCount?: number;
    likedBy?: string[]; // Array of user emails who liked this
    tags?: string[];
}

export interface Album {
    id: string;
    name: string;
    coverImage?: string;
    songs: Song[];
}

export const GENRES = [
    'Epic Rap',
    'K-Pop',
    'Lo-fi Emotional',
    'Inspirational Pop',
    'Ambient Cinematic',
] as const;

export type Genre = (typeof GENRES)[number];

export interface UserData {
    id: string;
    email: string;
    name: string;
    picture?: string;
    preferences?: {
        theme?: 'light' | 'dark';
        visualizerEnabled?: boolean;
        pinEnabled?: boolean;
    };
}

export interface AuthTokens {
    accessToken: string;
    serverToken: string;
}

export interface UserPreferences {
    pinEnabled: boolean;
    pinCode?: string; // Hashed PIN
    autoLockMinutes?: number;
}

// Re-export update types for convenience
export * from './update';
// Re-export YouTube types
export * from './youtube';
