// src/screens/LoadingScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../styles/theme';

const LoadingScreen: React.FC = () => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.container}
        >
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Replace with actual Zumi image */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>🎵</Text>
                    </View>
                </View>

                <Text style={styles.title}>Zumi Music</Text>
                <Text style={styles.subtitle}>Loading your kawaii playlist...</Text>

                <View style={styles.dotsContainer}>
                    <LoadingDot delay={0} />
                    <LoadingDot delay={200} />
                    <LoadingDot delay={400} />
                </View>
            </Animated.View>
        </LinearGradient>
    );
};

const LoadingDot: React.FC<{ delay: number }> = ({ delay }) => {
    const opacity = useRef(new Animated.Value(0.2)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 600,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.2,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return <Animated.View style={[styles.dot, { opacity }]} />;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    avatarContainer: {
        marginBottom: spacing.xl,
    },
    avatar: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.accentLight,
    },
    avatarText: {
        fontSize: 80,
    },
    title: {
        ...typography.h1,
        color: colors.text,
        marginBottom: spacing.sm,
        fontWeight: 'bold',
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.accent,
    },
});

export default LoadingScreen;