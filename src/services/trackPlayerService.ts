// src/services/trackPlayerService.ts
import TrackPlayer, {
    Capability,
    Event,
    State,
    RepeatMode,
    AppKilledPlaybackBehavior,
} from 'react-native-track-player';

import { resizeArtworkForTrackPlayer } from '../utils/imageUtils';

class TrackPlayerService {
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('🎵 Initializing TrackPlayer...');

            await TrackPlayer.setupPlayer();

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
            console.log('✅ TrackPlayer initialized');
        } catch (e) {
            console.error('❌ TrackPlayer init error:', e);
            throw e;
        }
    }

    /**
     * Adds a single track (object) after preparing artwork and plays it.
     */
    async addAndPlay(track: any) {
        if (!track) throw new Error('Track is required');

        if (!this.isInitialized) await this.initialize();

        try {
            console.log('🎧 addAndPlay called with track:', track);

            if (!track.url && !track.uri) {
                console.warn('⚠️ track missing url/uri field, TrackPlayer may fail:', track);
            }

            // Prepare artwork safely
            if (track.artwork) {
                try {
                    const safeArtwork = await resizeArtworkForTrackPlayer(track.artwork);
                    if (safeArtwork) {
                        track.artwork = safeArtwork;
                        console.log('🖼️ Artwork prepared for track:', safeArtwork);
                    } else {
                        console.warn('⚠️ Artwork processing returned undefined — removing artwork');
                        delete track.artwork;
                    }
                } catch (artErr) {
                    console.warn('⚠️ Error processing artwork — removing artwork to avoid crash:', artErr);
                    delete track.artwork;
                }
            }

            console.log('📝 Resetting player and adding track...');
            await TrackPlayer.reset();
            await TrackPlayer.add(track);
            console.log('▶️ Starting playback...');
            await TrackPlayer.play();

            try {
                const state = await TrackPlayer.getState();
                console.log('ℹ️ TrackPlayer state after play:', state);
            } catch (sErr) {
                console.warn('⚠️ Could not read TrackPlayer state:', sErr);
            }
        } catch (e) {
            console.error('❌ addAndPlay error:', e);
            throw e;
        }
    }

    async addTracks(tracks: any[]) {
        if (!this.isInitialized) await this.initialize();
        if (!Array.isArray(tracks)) return;

        console.log('🎧 addTracks called with', tracks.length, 'tracks');

        const prepared: any[] = [];

        for (const t of tracks) {
            const copy = { ...t };
            if (copy.artwork) {
                try {
                    const safeArtwork = await resizeArtworkForTrackPlayer(copy.artwork);
                    if (safeArtwork) copy.artwork = safeArtwork;
                    else delete copy.artwork;
                } catch (e) {
                    delete copy.artwork;
                }
            }
            if (!copy.url && !copy.uri) {
                console.warn('⚠️ one of the tracks is missing url/uri:', copy);
            }
            prepared.push(copy);
        }

        console.log('🗂️ Adding prepared tracks to TrackPlayer:', prepared);
        await TrackPlayer.add(prepared);
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

    /**
     * Force audio system to pick up new route by pause/resume
     * CRITICAL for audio routing to work on Android!
     */
    async reattachAfterRouting(delayMs = 200) {
        try {
            console.log('🔄 Reattaching audio after routing change...');

            const state = await this.getState();

            if (state === State.Playing) {
                // Get current position
                const position = await this.getPosition();

                // Pause
                await TrackPlayer.pause();
                console.log('⏸️ Paused');

                // Wait for audio system to switch
                await new Promise(res => setTimeout(res, delayMs));

                // Resume from same position
                await TrackPlayer.seekTo(position);
                await TrackPlayer.play();
                console.log('▶️ Resumed');

                console.log('✅ Audio reattached successfully');
            } else {
                console.log('ℹ️ Not playing, no reattach needed');
            }
        } catch (e) {
            console.warn('⚠️ reattachAfterRouting failed:', e);
        }
    }
}

export const trackPlayerService = new TrackPlayerService();

// Playback service for react-native-track-player
export async function PlaybackService() {
    console.log('🎵 PlaybackService registered');

    const subscriptions: Array<{ remove: () => void } | (() => void) | any> = [];

    subscriptions.push(
        TrackPlayer.addEventListener(Event.RemotePlay, async () => {
            console.log('▶️ RemotePlay');
            await TrackPlayer.play();
        })
    );

    subscriptions.push(
        TrackPlayer.addEventListener(Event.RemotePause, async () => {
            console.log('⏸️ RemotePause');
            await TrackPlayer.pause();
        })
    );

    subscriptions.push(
        TrackPlayer.addEventListener(Event.RemoteNext, async () => {
            console.log('⏭️ RemoteNext');
            try {
                await TrackPlayer.skipToNext();
            } catch (e) {
                console.warn('⚠️ skipToNext failed:', e);
            }
        })
    );

    subscriptions.push(
        TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
            console.log('⏮️ RemotePrevious');
            try {
                await TrackPlayer.skipToPrevious();
            } catch (e) {
                console.warn('⚠️ skipToPrevious failed:', e);
            }
        })
    );

    subscriptions.push(
        TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
            console.log('⏩ RemoteSeek to', position);
            await TrackPlayer.seekTo(position);
        })
    );

    subscriptions.push(
        TrackPlayer.addEventListener(Event.RemoteStop, async () => {
            console.log('⏹️ RemoteStop');
            try {
                await TrackPlayer.reset();
            } catch (e) {
                console.warn('⚠️ reset failed:', e);
                await TrackPlayer.pause();
            }
        })
    );

    subscriptions.push(
        TrackPlayer.addEventListener(Event.PlaybackError, (err) => {
            console.error('❌ PlaybackError event:', err);
        })
    );

    subscriptions.push(
        TrackPlayer.addEventListener(Event.RemoteDuck, async (data) => {
            console.log('🔈 RemoteDuck', data);
            try {
                if (data.paused) {
                    await TrackPlayer.pause();
                } else {
                    await TrackPlayer.play();
                }
            } catch (e) {
                console.warn('⚠️ RemoteDuck handling failed:', e);
            }
        })
    );

    return;
}