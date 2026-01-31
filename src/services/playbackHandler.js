const TrackPlayer = require('react-native-track-player');
const { Event } = require('react-native-track-player');

console.log('📦📦📦 playbackHandler.js loaded');

module.exports = async function() {
    console.log('🎵🎵🎵 PlaybackService FUNCTION CALLED - Starting setup');

    // Register all event listeners immediately
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        console.log('▶️▶️▶️ RemotePlay event received');
        try {
            await TrackPlayer.play();
            console.log('✅ Play completed');
        } catch (e) {
            console.error('❌ RemotePlay error:', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        console.log('⏸️⏸️⏸️ RemotePause event received');
        try {
            await TrackPlayer.pause();
            console.log('✅ Pause completed');
        } catch (e) {
            console.error('❌ RemotePause error:', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        console.log('⏭️⏭️⏭️ RemoteNext event received');
        try {
            await TrackPlayer.skipToNext();
            console.log('✅ Skip to next completed');
        } catch (e) {
            console.error('❌ RemoteNext error:', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        console.log('⏮️⏮️⏮️ RemotePrevious event received');
        try {
            await TrackPlayer.skipToPrevious();
            console.log('✅ Skip to previous completed');
        } catch (e) {
            console.error('❌ RemotePrevious error:', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
        console.log('⏩⏩⏩ RemoteSeek to', position);
        try {
            await TrackPlayer.seekTo(position);
            console.log('✅ Seek completed to', position);
        } catch (e) {
            console.error('❌ RemoteSeek error:', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        console.log('⏹️⏹️⏹️ RemoteStop event received');
        try {
            await TrackPlayer.stop();
            console.log('✅ Stop completed');
        } catch (e) {
            console.error('❌ RemoteStop error:', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteJumpForward, async ({ interval }) => {
        console.log('⏩⏩⏩ RemoteJumpForward:', interval);
        try {
            const position = await TrackPlayer.getPosition();
            await TrackPlayer.seekTo(position + (interval || 10));
            console.log('✅ Jump forward completed');
        } catch (e) {
            console.error('❌ RemoteJumpForward error:', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async ({ interval }) => {
        console.log('⏪⏪⏪ RemoteJumpBackward:', interval);
        try {
            const position = await TrackPlayer.getPosition();
            await TrackPlayer.seekTo(Math.max(0, position - (interval || 10)));
            console.log('✅ Jump backward completed');
        } catch (e) {
            console.error('❌ RemoteJumpBackward error:', e);
        }
    });

    console.log('✅✅✅ PlaybackService setup complete - All event listeners registered');
};
