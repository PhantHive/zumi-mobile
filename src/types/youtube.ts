// src/types/youtube.ts
export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  duration: string;
  description: string;
}

export interface YouTubeDownloadResult {
  audioPath: string;
  thumbnailPath: string;
  metadata: {
    title: string;
    artist: string;
    duration: number;
    description: string;
  };
}

