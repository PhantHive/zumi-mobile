// src/components/MiniPlayer.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusic } from '../contexts/MusicContext';
import { apiClient } from '../services/apiClient';
import { colors, spacing, borderRadius } from '../styles/theme';
import { images } from '../utils/assets';
import { extractColorsFromImage, ExtractedColors, hexToRgba } from '../utils/colorExtractor';

const MiniPlayer: React.FC = () => {
    const {
        currentSong,
        isPlaying,
        pauseSong,
        resumeSong,
        nextSong,
        previousSong,
    } = useMusic();

    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(180); // Default 3 minutes
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [dynamicColors, setDynamicColors] = useState<ExtractedColors | null>(null);

    // Animated values for smooth color transitions (Spotify-style)
    const colorFadeAnim = useRef(new Animated.Value(1)).current;

    // Wave animations
    const wave1 = useRef(new Animated.Value(0)).current;
    const wave2 = useRef(new Animated.Value(0)).current;
    const wave3 = useRef(new Animated.Value(0)).current;

    // Load thumbnail and extract colors when song changes
    useEffect(() => {
        const loadThumbnailAndColors = async () => {
            if (currentSong?.thumbnailUrl) {
                try {
                    // Fade out current colors
                    Animated.timing(colorFadeAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: false,
                    }).start();

                    const url = await apiClient.getThumbnailUrlWithAuth(currentSong.thumbnailUrl);
                    setThumbnailUrl(url);

                    // Extract colors from the thumbnail - this now works properly!
                    const colors = await extractColorsFromImage(url);
                    setDynamicColors(colors);

                    // Fade in new colors smoothly
                    Animated.timing(colorFadeAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: false,
                    }).start();
                } catch (error) {
                    // Missing thumbnails are normal, use placeholder silently
                    setThumbnailUrl(null);
                    setDynamicColors(null);
                    colorFadeAnim.setValue(1);
                }
            } else {
                setThumbnailUrl(null);
                setDynamicColors(null);
            }
        };
        loadThumbnailAndColors();
    }, [currentSong?.thumbnailUrl]);

    useEffect(() => {
        // Animate waves continuously
        const createWaveAnimation = (animatedValue: Animated.Value, duration: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(animatedValue, {
                        toValue: 0,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        createWaveAnimation(wave1, 8000).start();
        createWaveAnimation(wave2, 5000).start();
        createWaveAnimation(wave3, 7000).start();
    }, []);

    useEffect(() => {
        // Simulate progress (in real app, this would come from audio player)
        if (isPlaying) {
            const interval = setInterval(() => {
                setCurrentTime((prev) => {
                    const next = prev + 1;
                    if (next >= duration) {
                        return 0;
                    }
                    return next;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isPlaying, duration]);

    useEffect(() => {
        if (duration > 0) {
            setProgress((currentTime / duration) * 100);
        }
    }, [currentTime, duration]);

    if (!currentSong) return null;

    const handlePlayPause = () => {
        if (isPlaying) {
            pauseSong();
        } else {
            resumeSong();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get dynamic colors or fallback to defaults - now with smooth interpolation
    const backgroundColor = colorFadeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(10, 0, 20, 0.98)', dynamicColors
            ? hexToRgba(dynamicColors.background, 0.98)
            : 'rgba(10, 0, 20, 0.98)']
    });

    const gradientColor = dynamicColors
        ? hexToRgba(dynamicColors.secondary, 0.4)
        : 'rgba(74, 58, 110, 0.3)';

    const accentColor = dynamicColors?.primary || colors.accent;
    const waveColor = dynamicColors?.secondary || colors.primary;

    return (
        <Animated.View style={[styles.container, { backgroundColor }]}>
            {/* Gradient overlay for depth - Spotify/Deezer style with richer effect */}
            {dynamicColors && (
                <>
                    <Animated.View
                        style={[
                            styles.gradientOverlay,
                            {
                                backgroundColor: gradientColor,
                                opacity: colorFadeAnim,
                            }
                        ]}
                    />
                    {/* Additional radial gradient effect from top */}
                    <Animated.View
                        style={[
                            styles.gradientTop,
                            {
                                backgroundColor: hexToRgba(dynamicColors.primary, 0.15),
                                opacity: colorFadeAnim,
                            }
                        ]}
                    />
                    {/* Subtle bottom accent */}
                    <Animated.View
                        style={[
                            styles.gradientBottom,
                            {
                                backgroundColor: hexToRgba(dynamicColors.detail, 0.08),
                                opacity: colorFadeAnim,
                            }
                        ]}
                    />
                </>
            )}

            {/* Progress Section */}
            <View style={styles.progressSection}>
                <View style={styles.progressWrapper}>
                    <View style={styles.progressBar}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${progress}%`,
                                    backgroundColor: accentColor
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.timeDisplay}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </Text>
                </View>
            </View>

            {/* Player Content */}
            <View style={styles.playerContent}>
                <View style={styles.thumbnailWrapper}>
                    <Image
                        source={thumbnailUrl ? { uri: thumbnailUrl } : images.placeholder}
                        style={styles.thumbnail}
                        defaultSource={images.placeholder}
                        resizeMode="cover"
                    />
                    {/* Glow effect around thumbnail when colors are extracted */}
                    {dynamicColors && (
                        <Animated.View
                            style={[
                                styles.thumbnailGlow,
                                {
                                    backgroundColor: hexToRgba(dynamicColors.primary, 0.3),
                                    opacity: colorFadeAnim,
                                }
                            ]}
                        />
                    )}
                </View>

                <View style={styles.songInfo}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentSong.title}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                        {currentSong.artist}
                    </Text>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity onPress={previousSong} style={styles.controlButton}>
                        <Ionicons name="play-skip-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handlePlayPause}
                        style={[styles.playButton, { backgroundColor: accentColor }]}
                    >
                        <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={28}
                            color={colors.text}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={nextSong} style={styles.controlButton}>
                        <Ionicons name="play-skip-forward" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Wave Animations with dynamic colors */}
            <View style={styles.spectrumContainer}>
                <Animated.View
                    style={[
                        styles.wave,
                        styles.wave1,
                        {
                            backgroundColor: waveColor,
                            transform: [{
                                translateX: wave1.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -100],
                                })
                            }]
                        }
                    ]}
                />
                <Animated.View
                    style={[
                        styles.wave,
                        styles.wave2,
                        {
                            backgroundColor: waveColor,
                            transform: [{
                                translateX: wave2.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -80],
                                })
                            }]
                        }
                    ]}
                />
                <Animated.View
                    style={[
                        styles.wave,
                        styles.wave3,
                        {
                            backgroundColor: waveColor,
                            transform: [{
                                translateX: wave3.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -120],
                                })
                            }]
                        }
                    ]}
                />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 0, 20, 0.98)',
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        zIndex: 100,
        overflow: 'hidden',
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -2,
    },
    gradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        zIndex: -2,
    },
    gradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '30%',
        zIndex: -2,
    },
    progressSection: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xs,
    },
    progressWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        gap: spacing.sm,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 2,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 2,
    },
    timeDisplay: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.6)',
        minWidth: 70,
    },
    playerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    thumbnailWrapper: {
        position: 'relative',
    },
    thumbnail: {
        width: 56,
        height: 56,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    thumbnailGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 10,
        zIndex: -1,
    },
    songInfo: {
        flex: 1,
    },
    title: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 15,
        marginBottom: 2,
    },
    artist: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    controlButton: {
        padding: 4,
    },
    playButton: {
        backgroundColor: colors.accent,
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    spectrumContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 30,
        overflow: 'hidden',
        zIndex: -1,
    },
    wave: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '200%',
        height: '100%',
        backgroundColor: colors.primary,
    },
    wave1: {
        bottom: 0,
        opacity: 0.08,
    },
    wave2: {
        bottom: 6,
        opacity: 0.05,
    },
    wave3: {
        bottom: 12,
        opacity: 0.03,
    },
});

export default MiniPlayer;
