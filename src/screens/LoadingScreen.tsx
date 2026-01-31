// src/screens/LoadingScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { colors, spacing, typography } from '../styles/theme';
import { videos } from '../utils/assets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LoadingScreenProps {
    message?: string;
    progress?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, progress = 0 }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const [currentMessage, setCurrentMessage] = useState(message || 'Getting things ready for you...');

    // Update message based on progress
    useEffect(() => {
        if (progress < 20) {
            setCurrentMessage('Getting things ready for you...');
        } else if (progress < 40) {
            setCurrentMessage('Loading your music...');
        } else if (progress < 60) {
            setCurrentMessage('Fetching thumbnails...');
        } else if (progress < 80) {
            setCurrentMessage('Extracting colors...');
        } else if (progress < 95) {
            setCurrentMessage('Preparing the vibes...');
        } else {
            setCurrentMessage('Almost there...');
        }
    }, [progress]);

    // Animate progress bar
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1a0b2e', '#0a0015', '#1a0b2e']}
                style={styles.gradient}
            >
                {/* Background hologram video */}
                <Video
                    source={videos.zumiGreet}
                    style={styles.backgroundVideo}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted
                />

                {/* Content */}
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <Text style={styles.title}>Zumi Music</Text>

                    <Text style={styles.message}>{currentMessage}</Text>

                    {/* Progress bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarTrack}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: progressWidth,
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                    </View>
                </Animated.View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: '#0a0015',
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backgroundVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        opacity: 0.3,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: colors.accent,
        marginBottom: spacing.xl,
        textShadowColor: colors.accent,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
        letterSpacing: 2,
    },
    message: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xl,
        textAlign: 'center',
        opacity: 0.8,
    },
    progressBarContainer: {
        width: SCREEN_WIDTH * 0.7,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    progressBarTrack: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 3,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
    },
    progressText: {
        ...typography.caption,
        color: colors.accent,
        marginTop: spacing.md,
        fontSize: 16,
        fontWeight: '700',
    },
});

export default LoadingScreen;
