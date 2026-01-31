import TrackPlayer, {
    Capability,
    Event,
    State,
    RepeatMode,
    AppKilledPlaybackBehavior,
} from 'react-native-track-player';
import { applyDesiredRoute } from './audioRoutingService';
import { getNextSongCallback, getPreviousSongCallback } from './playbackService';
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
                notificationCapabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.SeekTo,
                ],
                progressUpdateEventInterval: 1,
                icon: require('../../assets/images/zumi-icon.png'),
            });

            await TrackPlayer.setRepeatMode(RepeatMode.Off);

            // Register event listeners HERE instead of in service.js
            console.log('🎧 Registering remote control event listeners...');

            TrackPlayer.addEventListener(Event.RemotePlay, async () => {
                console.log('▶️▶️▶️ RemotePlay event');
                await TrackPlayer.play();
            });

            TrackPlayer.addEventListener(Event.RemotePause, async () => {
                console.log('⏸️⏸️⏸️ RemotePause event');
                await TrackPlayer.pause();
            });

            TrackPlayer.addEventListener(Event.RemoteNext, async () => {
                console.log('⏭️⏭️⏭️ RemoteNext event');
                await TrackPlayer.skipToNext();
            });

            TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
                console.log('⏮️⏮️⏮️ RemotePrevious event');
                await TrackPlayer.skipToPrevious();
            });

            TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
                console.log('⏩⏩⏩ RemoteSeek event:', position);
                await TrackPlayer.seekTo(position);
            });

            console.log('✅ TrackPlayer initialized with MediaSession and event listeners');

            this.isInitialized = true;
        } catch (e) {
            console.error('❌ TrackPlayer init error:', e);
            throw e;
        }
    }

    async addAndPlay(track: any) {
        if (!track) throw new Error('Track is required');

        if (!this.isInitialized) await this.initialize();

        try {
            console.log('🎧 addAndPlay called with track:', track);

            if (!track.url && !track.uri) {
                console.warn('⚠️ track missing url/uri field, TrackPlayer may fail:', track);
            }

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

            console.log('🔄 Resetting player and adding track...');
            await TrackPlayer.reset();
            await TrackPlayer.add(track);

            try {
                await applyDesiredRoute();
            } catch (e) {
                console.warn('⚠️ applyDesiredRoute failed before play:', e);
            }

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
        try {
            await applyDesiredRoute();
        } catch (e) {
            console.warn('⚠️ applyDesiredRoute failed before resume:', e);
        }
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

    async reattachAfterRouting(delayMs = 200) {
        try {
            console.log('🔄 Reattaching audio after routing change...');

            const state = await this.getState();

            if (state === State.Playing) {
                const position = await this.getPosition();

                await TrackPlayer.pause();
                console.log('⏸️ Paused');

                await new Promise(res => setTimeout(res, delayMs));

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

export async function PlaybackService() {
    console.log('🎵🎵🎵 PlaybackService function called - setting up event listeners');

    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        console.log('▶️▶️▶️ RemotePlay event received');
        try {
            await applyDesiredRoute();
        } catch (e) {
            console.warn('⚠️ applyDesiredRoute failed for RemotePlay:', e);
        }
        await TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        console.log('⏸️⏸️⏸️ RemotePause event received');
        await TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        console.log('⏭️⏭️⏭️ RemoteNext event received - START');
        try {
            const nextCallback = getNextSongCallback();
            console.log('📞 Next callback is:', nextCallback ? 'REGISTERED' : 'NULL');
            if (nextCallback) {
                console.log('🎵 Calling nextSong callback NOW');
                nextCallback();
                console.log('✅ nextSong callback completed');
            } else {
                console.error('❌ No nextSong callback registered!');
            }
        } catch (error) {
            console.error('❌ Error in RemoteNext handler:', error);
        }
        console.log('⏭️⏭️⏭️ RemoteNext event received - END');
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        console.log('⏮️⏮️⏮️ RemotePrevious event received - START');
        try {
            const previousCallback = getPreviousSongCallback();
            console.log('📞 Previous callback is:', previousCallback ? 'REGISTERED' : 'NULL');
            if (previousCallback) {
                console.log('🎵 Calling previousSong callback NOW');
                previousCallback();
                console.log('✅ previousSong callback completed');
            } else {
                console.error('❌ No previousSong callback registered!');
            }
        } catch (error) {
            console.error('❌ Error in RemotePrevious handler:', error);
        }
        console.log('⏮️⏮️⏮️ RemotePrevious event received - END');
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
        console.log('⏩⏩⏩ RemoteSeek to', position);
        await TrackPlayer.seekTo(position);
    });

    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        console.log('⏹️⏹️⏹️ RemoteStop event received');
        try {
            await TrackPlayer.reset();
        } catch (e) {
            console.warn('⚠️ reset failed:', e);
            await TrackPlayer.pause();
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackError, (err) => {
        console.error('❌❌❌ PlaybackError event:', err);
    });

    TrackPlayer.addEventListener(Event.RemoteDuck, async (data) => {
        console.log('🔈🔈🔈 RemoteDuck', data);
        try {
            if (data.paused) {
                await TrackPlayer.pause();
            } else {
                await TrackPlayer.play();
            }
        } catch (e) {
            console.warn('⚠️ RemoteDuck handling failed:', e);
        }
    });

    console.log('✅✅✅ All event listeners registered in PlaybackService');
}