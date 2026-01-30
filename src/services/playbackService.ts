// src/services/playbackService.ts
import TrackPlayer, { Event } from 'react-native-track-player';

let nextSongCallback: (() => void) | null = null;
let previousSongCallback: (() => void) | null = null;

/**
 * Register callbacks that will be called when remote controls are used
 */
export function registerPlaybackCallbacks(
    onNext: () => void,
    onPrevious: () => void
) {
    nextSongCallback = onNext;
    previousSongCallback = onPrevious;
}

export function getNextSongCallback(): (() => void) | null {
    return nextSongCallback;
}

export function getPreviousSongCallback(): (() => void) | null {
    return previousSongCallback;
}

/**
 * TrackPlayer playback service
 * This handles remote control events (lock screen, notification, bluetooth controls)
 */
export async function PlaybackService() {
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        console.log('🎵 Remote Play');
        await TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        console.log('⏸️ Remote Pause');
        await TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        console.log('⏭️ Remote Next');
        if (nextSongCallback) {
            nextSongCallback();
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        console.log('⏮️ Remote Previous');
        if (previousSongCallback) {
            previousSongCallback();
        }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
        console.log('🔍 Remote Seek to:', position);
        await TrackPlayer.seekTo(position);
    });

    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        console.log('⏹️ Remote Stop');
        await TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteJumpForward, async ({ interval }) => {
        console.log('⏩ Remote Jump Forward:', interval);
        const position = await TrackPlayer.getPosition();
        await TrackPlayer.seekTo(position + (interval || 10));
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async ({ interval }) => {
        console.log('⏪ Remote Jump Backward:', interval);
        const position = await TrackPlayer.getPosition();
        await TrackPlayer.seekTo(Math.max(0, position - (interval || 10)));
    });
}
