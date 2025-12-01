// src/components/ZumiAssistant.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useMusic } from '../contexts/MusicContext';
import { colors, spacing, typography, borderRadius } from '../styles/theme';
import { videos, getRandomVideo } from '../utils/assets';

const ZumiAssistant: React.FC = () => {
    const { playRandomSong } = useMusic();
    const [showControls, setShowControls] = useState(false);
    const [currentVideo, setCurrentVideo] = useState(videos.zumiWave);
    const videoRef = useRef<Video>(null);
    const fadeAnim = useRef(new Animated.Value(0.3)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Subtle breathing animation
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0.5,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1.05,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0.3,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();
    }, []);

    const handleZumiPress = async () => {
        setShowControls(!showControls);

        // Play random interaction video
        const randomVideo = getRandomVideo();
        setCurrentVideo(randomVideo);

        if (videoRef.current) {
            await videoRef.current.replayAsync();
        }
    };

    const handleChooseSong = () => {
        playRandomSong();
        setShowControls(false);
    };

    return (
        <>
            {/* Hologram Overlay Background */}
            <Animated.View
                style={[
                    styles.hologramOverlay,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }
                ]}
            >
                <Video
                    ref={videoRef}
                    source={currentVideo}
                    style={styles.hologramVideo}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted
                />
            </Animated.View>

            {/* Interactive Zumi Button */}
            <TouchableOpacity
                style={styles.zumiButton}
                onPress={handleZumiPress}
                activeOpacity={0.8}
            >
                <Video
                    source={videos.zumiWave}
                    style={styles.zumiButtonVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                    isLooping
                    isMuted
                />
                <View style={styles.pinkGlow} />
            </TouchableOpacity>

            {/* Control Panel */}
            {showControls && (
                <Animated.View style={styles.controlPanel}>
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={handleZumiPress}
                    >
                        <Text style={styles.buttonText}>Hi Zumi! 👋</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={handleChooseSong}
                    >
                        <Text style={styles.buttonText}>Choose a song 🎵</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, styles.closeButton]}
                        onPress={() => setShowControls(false)}
                    >
                        <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    // Hologram background overlay
    hologramOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        pointerEvents: 'none',
    },
    hologramVideo: {
        width: '100%',
        height: '100%',
        opacity: 0.27, // Subtle but visible
    },
    // Interactive Zumi button
    zumiButton: {
        position: 'absolute',
        top: 60,
        right: 16,
        width: 70,
        height: 70,
        borderRadius: 35,
        zIndex: 1000,
        backgroundColor: 'rgba(181, 101, 216, 0.15)',
    },
    zumiButtonVideo: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
    },
    pinkGlow: {
        position: 'absolute',
        top: -8,
        left: -8,
        right: -8,
        bottom: -8,
        borderRadius: 43,
        backgroundColor: colors.accentPurple,
        opacity: 0.4,
        zIndex: -1,
    },
    // Control panel
    controlPanel: {
        position: 'absolute',
        top: 140,
        right: 16,
        backgroundColor: 'rgba(20, 0, 30, 0.95)',
        borderRadius: 16,
        padding: 12,
        gap: 8,
        zIndex: 1001,
        minWidth: 160,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    controlButton: {
        backgroundColor: colors.accent,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    closeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    buttonText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '600',
    },
});

export default ZumiAssistant;
