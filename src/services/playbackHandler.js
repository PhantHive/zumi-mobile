const TrackPlayer = require('react-native-track-player');

let nextSongCallback = null;
let previousSongCallback = null;

function setPlaybackCallbacks(onNext, onPrevious) {
    console.log('📞📞📞 Setting playback callbacks');
    nextSongCallback = onNext;
    previousSongCallback = onPrevious;
}

module.exports = async function() {
    console.log('🎵🎵🎵 PlaybackService started - registering event listeners');

    TrackPlayer.addEventListener('remote-play', async () => {
        console.log('▶️▶️▶️ RemotePlay');
        await TrackPlayer.play();
    });

    TrackPlayer.addEventListener('remote-pause', async () => {
        console.log('⏸️⏸️⏸️ RemotePause');
        await TrackPlayer.pause();
    });

    TrackPlayer.addEventListener('remote-next', async () => {
        console.log('⏭️⏭️⏭️ RemoteNext received');
        if (nextSongCallback) {
            console.log('🎵 Calling next callback');
            nextSongCallback();
        } else {
            console.error('❌ No next callback');
        }
    });

    TrackPlayer.addEventListener('remote-previous', async () => {
        console.log('⏮️⏮️⏮️ RemotePrevious received');
        if (previousSongCallback) {
            console.log('🎵 Calling previous callback');
            previousSongCallback();
        } else {
            console.error('❌ No previous callback');
        }
    });

    TrackPlayer.addEventListener('remote-seek', async ({ position }) => {
        console.log('⏩⏩⏩ RemoteSeek to', position);
        await TrackPlayer.seekTo(position);
    });

    TrackPlayer.addEventListener('remote-stop', async () => {
        console.log('⏹️⏹️⏹️ RemoteStop');
        await TrackPlayer.pause();
    });

    console.log('✅✅✅ All listeners registered');
};

module.exports.setPlaybackCallbacks = setPlaybackCallbacks;