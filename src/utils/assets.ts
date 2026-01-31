// src/utils/assets.ts
/**
 * Local asset references for images, audio, and videos
 * Use these to import assets from the assets/ folder
 */

export const images = {
    mascot: require('../../assets/splash-icon.png'),
    // Use the new app icon as the in-app avatar image (replacing old zumi.png)
    zumi: require('../../assets/images/zumi-icon.png'),
    placeholder: require('../../assets/images/placeholder.png'),
};

export const voices = {
    zumi1: require('../../assets/voices/zumi-1.mp3'),
    zumi2: require('../../assets/voices/zumi-2.mp3'),
    zumi3: require('../../assets/voices/zumi-3.mp3'),
    zumi4: require('../../assets/voices/zumi-4.mp3'),
    zumi5: require('../../assets/voices/zumi-5.mp3'),
    zumiHi: require('../../assets/voices/zumi-hi.mp3'),
};

export const videos = {
    // New consolidated interaction videos
    zumiGreet: require('../../assets/images/zumi-interactions/zumi-greet.mp4'),
    zumiEnjoyMusic: require('../../assets/images/zumi-interactions/zumi-enjoy-music.mp4'),
    zumiIdle: require('../../assets/images/zumi-interactions/zumi-idle.mp4'),
    // Loop clip: final 4 seconds of enjoy-music for smooth looping (create with ffmpeg)
    zumiEnjoyMusicLoop: require('../../assets/images/zumi-interactions/zumi-enjoy-music-loop.mp4'),
};

// Helper function to get a random voice
export const getRandomVoice = () => {
    const voiceList = [voices.zumi1, voices.zumi2, voices.zumi3, voices.zumi4, voices.zumi5, voices.zumiHi];
    return voiceList[Math.floor(Math.random() * voiceList.length)];
};

// Helper function to get a random video (use only the supported interactions)
export const getRandomVideo = () => {
    const videoList = [videos.zumiGreet, videos.zumiEnjoyMusic, videos.zumiIdle];
    return videoList[Math.floor(Math.random() * videoList.length)];
};
