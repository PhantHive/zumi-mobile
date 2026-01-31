// service.js - PlaybackService for react-native-track-player
// This file MUST be at the root and export the service function directly

console.log('📦📦📦 service.js FILE LOADED');

module.exports = async function() {
    console.log('🚀🚀🚀 PlaybackService FUNCTION CALLED');

    const TrackPlayer = require('react-native-track-player');
    const { Event } = require('react-native-track-player');

    console.log('🎵🎵🎵 PlaybackService STARTED - TrackPlayer imported');

    // Register listeners synchronously
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        console.log('▶️▶️▶️ RemotePlay');
        TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        console.log('⏸️⏸️⏸️ RemotePause');
        TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        console.log('⏭️⏭️⏭️ RemoteNext');
        TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        console.log('⏮️⏮️⏮️ RemotePrevious');
        TrackPlayer.skipToPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
        console.log('⏩⏩⏩ RemoteSeek:', position);
        TrackPlayer.seekTo(position);
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        console.log('⏹️⏹️⏹️ RemoteStop');
        TrackPlayer.stop();
    });

    console.log('✅✅✅ PlaybackService READY - All listeners registered');
};
