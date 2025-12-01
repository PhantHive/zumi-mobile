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

