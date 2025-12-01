// src/utils/assets.ts
/**
 * Local asset references for images, audio, and videos
 * Use these to import assets from the assets/ folder
 */

export const images = {
    mascot: require('../../assets/images/mascot.png'),
    zumi: require('../../assets/images/zumi.png'),
    placeholder: require('../../assets/images/placeholder.jpg'),
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
    zumiHi1: require('../../assets/images/zumi-interactions/zumi-hi-1.mp4'),
    zumiHi2: require('../../assets/images/zumi-interactions/zumi-hi-2.mp4'),
    zumiHi3: require('../../assets/images/zumi-interactions/zumi-hi-3.mp4'),
    zumiWave: require('../../assets/images/zumi-interactions/zumi-wave.mp4'),
};

// Helper function to get a random voice
export const getRandomVoice = () => {
    const voiceList = [voices.zumi1, voices.zumi2, voices.zumi3, voices.zumi4, voices.zumi5, voices.zumiHi];
    return voiceList[Math.floor(Math.random() * voiceList.length)];
};

// Helper function to get a random video
export const getRandomVideo = () => {
    const videoList = [videos.zumiHi1, videos.zumiHi2, videos.zumiHi3, videos.zumiWave];
    return videoList[Math.floor(Math.random() * videoList.length)];
};
