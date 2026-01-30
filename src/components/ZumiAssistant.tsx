// src/components/ZumiAssistant.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    TouchableWithoutFeedback,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Gyroscope } from 'expo-sensors';
import { useMusic } from '../contexts/MusicContext';
import { useCarMode } from '../contexts/CarModeContext';
import { colors, spacing, typography, borderRadius } from '../styles/theme';
import { videos, getRandomVideo } from '../utils/assets';

const INACTIVITY_TIMEOUT = 120000; // 2 minutes
const GYROSCOPE_THRESHOLD = 0.5; // Sensitivity for gyroscope movement

interface ZumiAssistantProps {
    onUserActivity?: () => void;
}

const ZumiAssistant: React.FC<ZumiAssistantProps> = ({ onUserActivity }) => {
    const { isCarMode } = useCarMode();
    const { playRandomSong } = useMusic();
    const [showControls, setShowControls] = useState(false);
    const [currentVideo, setCurrentVideo] = useState(videos.zumiWave);
    const [isInForeground, setIsInForeground] = useState(false);
    const videoRef = useRef<Video>(null);
    const fadeAnim = useRef(new Animated.Value(0.3)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const foregroundAnim = useRef(new Animated.Value(0)).current;
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
    const gyroscopeSubscription = useRef<any>(null);

    useEffect(() => {
        // Subtle breathing animation
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0.65,
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
                        toValue: 0.45,
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

    // Inactivity detection
    useEffect(() => {
        resetInactivityTimer();
        return () => {
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
            }
        };
    }, []);

    // Gyroscope detection - only active when Zumi is in foreground
    useEffect(() => {
        if (isInForeground) {
            startGyroscopeDetection();
        } else {
            stopGyroscopeDetection();
        }

        return () => {
            stopGyroscopeDetection();
        };
    }, [isInForeground]);

    const startGyroscopeDetection = () => {
        Gyroscope.setUpdateInterval(100);
        gyroscopeSubscription.current = Gyroscope.addListener((data) => {
            const { x, y, z } = data;
            const movement = Math.abs(x) + Math.abs(y) + Math.abs(z);

            if (movement > GYROSCOPE_THRESHOLD) {
                resetInactivityTimer();
            }
        });
    };

    const stopGyroscopeDetection = () => {
        if (gyroscopeSubscription.current) {
            gyroscopeSubscription.current.remove();
            gyroscopeSubscription.current = null;
        }
    };

    const resetInactivityTimer = () => {
        // Clear existing timer
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
        }

        // If Zumi is in foreground, hide it
        if (isInForeground) {
            hideZumiFromForeground();
        }

        // Notify parent of user activity
        onUserActivity?.();

        // Start new timer
        inactivityTimer.current = setTimeout(() => {
            showZumiInForeground();
        }, INACTIVITY_TIMEOUT);
    };

    const showZumiInForeground = () => {
        setIsInForeground(true);
        Animated.timing(foregroundAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
        }).start();
    };

    const hideZumiFromForeground = () => {
        Animated.timing(foregroundAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
        }).start(() => {
            setIsInForeground(false);
        });
    };

    const handleZumiPress = async () => {
        setShowControls(!showControls);
        resetInactivityTimer();

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
        resetInactivityTimer();
    };

    const handleScreenTouch = () => {
        resetInactivityTimer();
    };

    if (isCarMode) return null;

    return (
        <>
            {/* Background Hologram - always behind */}
            <Animated.View
                style={[
                    styles.hologramOverlay,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }
                ]}
                pointerEvents="none"
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

            {/* Foreground Zumi - appears after inactivity */}
            {isInForeground && (
                <TouchableWithoutFeedback onPress={handleScreenTouch}>
                    <Animated.View
                        style={[
                            styles.foregroundContainer,
                            {
                                opacity: foregroundAnim,
                                transform: [
                                    {
                                        scale: foregroundAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                    },
                                ],
                            }
                        ]}
                    >
                        <Video
                            source={currentVideo}
                            style={styles.foregroundVideo}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay
                            isLooping
                            isMuted
                        />
                        <Text style={styles.foregroundText}>Tap anywhere to continue...</Text>
                    </Animated.View>
                </TouchableWithoutFeedback>
            )}

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
                        onPress={() => {
                            setShowControls(false);
                            resetInactivityTimer();
                        }}
                    >
                        <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    // Hologram background overlay - brighter
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
        opacity: 0.45, // Increased from 0.25 to 0.45
    },
    // Foreground Zumi - appears after inactivity
    foregroundContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998, // Just below mini player (9999)
        backgroundColor: 'rgba(10, 0, 25, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    foregroundVideo: {
        width: '100%',
        height: '100%',
    },
    foregroundText: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.7,
        letterSpacing: 0.5,
    },
    // Interactive Zumi button - clean and minimal
    zumiButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 70,
        height: 70,
        borderRadius: 35,
        zIndex: 1000,
        backgroundColor: 'rgba(181, 101, 216, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(181, 101, 216, 0.3)',
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
        opacity: 0.25,
        zIndex: -1,
    },
    // Control panel - elegant and minimal
    controlPanel: {
        position: 'absolute',
        top: 130,
        right: 20,
        backgroundColor: 'rgba(10, 0, 25, 0.95)',
        borderRadius: 16,
        padding: 14,
        gap: 8,
        zIndex: 1001,
        minWidth: 170,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(181, 101, 216, 0.2)',
    },
    controlButton: {
        backgroundColor: 'rgba(181, 101, 216, 0.15)',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 0,
    },
    closeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'transparent',
    },
    buttonText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});

export default ZumiAssistant;
