// src/services/trackPlayerService.ts
import TrackPlayer, {
    Capability,
    Event,
    State,
    RepeatMode,
    AppKilledPlaybackBehavior,
} from 'react-native-track-player';

class TrackPlayerService {
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) {
            console.log('🎵 TrackPlayer already initialized');
            return;
        }

        try {
            console.log('🎵 Setting up TrackPlayer...');

            await TrackPlayer.setupPlayer({
                autoUpdateMetadata: true,
                autoHandleInterruptions: true,
            });

            await TrackPlayer.updateOptions({
                android: {
                    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
                },
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.SeekTo,
                ],
                compactCapabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                ],
                progressUpdateEventInterval: 1,
            });

            await TrackPlayer.setRepeatMode(RepeatMode.Off);

            this.isInitialized = true;
            console.log('✅ TrackPlayer initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing TrackPlayer:', error);
            throw error;
        }
    }

    async addAndPlay(track: any) {
        try {
            if (!this.isInitialized) {
                console.log('⚠️ TrackPlayer not initialized, initializing now...');
                await this.initialize();
            }
            await TrackPlayer.reset();
            await TrackPlayer.add(track);
            await TrackPlayer.play();
        } catch (error) {
            console.error('❌ Error adding and playing track:', error);
            throw error;
        }
    }

    async play() {
        if (!this.isInitialized) await this.initialize();
        await TrackPlayer.play();
    }

    async pause() {
        if (!this.isInitialized) return;
        await TrackPlayer.pause();
    }

    async seekTo(position: number) {
        if (!this.isInitialized) return;
        await TrackPlayer.seekTo(position);
    }

    async skipToNext() {
        if (!this.isInitialized) return;
        await TrackPlayer.skipToNext();
    }

    async skipToPrevious() {
        if (!this.isInitialized) return;
        await TrackPlayer.skipToPrevious();
    }

    async getState() {
        if (!this.isInitialized) return State.None;
        return await TrackPlayer.getState();
    }

    async getPosition() {
        if (!this.isInitialized) return 0;
        return await TrackPlayer.getPosition();
    }

    async getDuration() {
        if (!this.isInitialized) return 0;
        return await TrackPlayer.getDuration();
    }
}

export const trackPlayerService = new TrackPlayerService();

// ⚠️ CRITIQUE: Cette fonction DOIT retourner une fonction async!
// Playback service for react-native-track-player
export async function PlaybackService() {
    console.log('🎵 PlaybackService registered');

    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        console.log('▶️ Remote Play');
        await TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        console.log('⏸️ Remote Pause');
        await TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        console.log('⏭️ Remote Next');
        await TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        console.log('⏮️ Remote Previous');
        await TrackPlayer.skipToPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
        console.log('⏩ Remote Seek to:', position);
        await TrackPlayer.seekTo(position);
    });

    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        console.log('⏹️ Remote Stop');
        await TrackPlayer.pause();
    });
}