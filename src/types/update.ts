// src/types/update.ts
export interface UpdateInfo {
    version: string;
    versionCode: number;
    downloadUrl: string;
    releaseNotes: string;
    minVersion: string;
    forceUpdate: boolean;
    releaseDate: string;
}

export interface UpdateCheckResult {
    hasUpdate: boolean;
    updateInfo: UpdateInfo | null;
}

export interface DownloadProgress {
    totalBytes: number;
    downloadedBytes: number;
    progress: number; // 0-100
}
