// src/screens/LoadingScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../styles/theme';
import { images } from '../utils/assets';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LoadingScreenProps {
    message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    // Wave animations
    const wave1 = useRef(new Animated.Value(0)).current;
    const wave2 = useRef(new Animated.Value(0)).current;
    const wave3 = useRef(new Animated.Value(0)).current;
    const wave4 = useRef(new Animated.Value(0)).current;

    const [currentMessage, setCurrentMessage] = useState(message || 'Getting things ready for you...');

    const loadingMessages = [
        'Getting things ready for you...',
        'Checking for updates...',
        'Loading your music...',
        'Preparing the experience...',
        'Tuning the vibes...',
        'Almost there...',
    ];

    useEffect(() => {
        // Icon entrance animation
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

        // Gentle rotation animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(rotateAnim, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Wave animations with different speeds
        const createWaveAnimation = (animValue: Animated.Value, duration: number, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(animValue, {
                        toValue: 1,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        createWaveAnimation(wave1, 4000, 0);
        createWaveAnimation(wave2, 5000, 500);
        createWaveAnimation(wave3, 6000, 1000);
        createWaveAnimation(wave4, 4500, 1500);
    }, []);

    // Cycle through messages
    useEffect(() => {
        if (!message) {
            const interval = setInterval(() => {
                setCurrentMessage((prev) => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 2500);

            return () => clearInterval(interval);
        } else {
            setCurrentMessage(message);
        }
    }, [message]);

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['-5deg', '5deg'],
    });

    const wave1TranslateX = wave1.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -SCREEN_WIDTH],
    });

    const wave2TranslateX = wave2.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -SCREEN_WIDTH * 0.8],
    });

    const wave3TranslateX = wave3.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -SCREEN_WIDTH * 1.2],
    });

    const wave4TranslateX = wave4.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -SCREEN_WIDTH * 0.9],
    });

    return (
        <View style={styles.container}>
            {/* Animated gradient background */}
            <LinearGradient
                colors={['#1a0b2e', '#2d1b4e', '#4a2c6e', '#2d1b4e', '#1a0b2e']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Flowing wave layers */}
            <Animated.View
                style={[
                    styles.wave,
                    styles.wave1,
                    { transform: [{ translateX: wave1TranslateX }] }
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(147, 112, 219, 0.1)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.waveGradient}
                />
            </Animated.View>

            <Animated.View
                style={[
                    styles.wave,
                    styles.wave2,
                    { transform: [{ translateX: wave2TranslateX }] }
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(110, 79, 143, 0.15)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.waveGradient}
                />
            </Animated.View>

            <Animated.View
                style={[
                    styles.wave,
                    styles.wave3,
                    { transform: [{ translateX: wave3TranslateX }] }
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(186, 143, 255, 0.08)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.waveGradient}
                />
            </Animated.View>

            <Animated.View
                style={[
                    styles.wave,
                    styles.wave4,
                    { transform: [{ translateX: wave4TranslateX }] }
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(74, 58, 110, 0.12)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.waveGradient}
                />
            </Animated.View>

            {/* Content */}
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [
                            { scale: scaleAnim },
                            { rotate: rotation },
                        ],
                    },
                ]}
            >
                {/* Zumi Icon with glow */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconGlow} />
                    <Image
                        source={images.zumi}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                </View>
            </Animated.View>

            {/* Loading message */}
            <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
                <Text style={styles.message}>{currentMessage}</Text>
                <View style={styles.dotsContainer}>
                    <LoadingDot delay={0} />
                    <LoadingDot delay={200} />
                    <LoadingDot delay={400} />
                </View>
            </Animated.View>
        </View>
    );
};

const LoadingDot: React.FC<{ delay: number }> = ({ delay }) => {
    const opacity = useRef(new Animated.Value(0.3)).current;
    const scale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 600,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0.3,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(scale, {
                        toValue: 1.2,
                        duration: 600,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 0.8,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.dot,
                {
                    opacity,
                    transform: [{ scale }],
                },
            ]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a0b2e',
        overflow: 'hidden',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    wave: {
        position: 'absolute',
        width: SCREEN_WIDTH * 2,
        height: '100%',
    },
    wave1: {
        top: '10%',
    },
    wave2: {
        top: '30%',
    },
    wave3: {
        top: '50%',
    },
    wave4: {
        top: '70%',
    },
    waveGradient: {
        flex: 1,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        position: 'relative',
        width: 160,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        width: 140,
        height: 140,
        zIndex: 2,
    },
    iconGlow: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: colors.accent,
        opacity: 0.2,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 40,
        elevation: 10,
    },
    messageContainer: {
        position: 'absolute',
        bottom: 100,
        alignItems: 'center',
    },
    message: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.accent,
    },
});

export default LoadingScreen;