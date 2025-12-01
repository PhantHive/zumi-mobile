// src/components/MiniPlayer.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusic } from '../contexts/MusicContext';
import { apiClient } from '../services/apiClient';
import { colors, spacing } from '../styles/theme';
import { images } from '../utils/assets';
import { extractColorsFromImage, hexToRgba } from '../utils/colorExtractor';
import type { ExtractedColors } from '../utils/colorExtractor';
import ImageWithLoader from './ImageWithLoader';

const MiniPlayer: React.FC = () => {
    const {
        currentSong,
        isPlaying,
        pauseSong,
        resumeSong,
        nextSong,
        previousSong,
        position,
        duration,
        seekTo,
    } = useMusic();

    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [dynamicColors, setDynamicColors] = useState<ExtractedColors | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const dragPositionRef = useRef(0);

    const colorFadeAnim = useRef(new Animated.Value(1)).current;
    const wave1 = useRef(new Animated.Value(0)).current;
    const wave2 = useRef(new Animated.Value(0)).current;
    const wave3 = useRef(new Animated.Value(0)).current;
    const progressHandleScale = useRef(new Animated.Value(0)).current;
    const progressBarTrackRef = useRef<View | null>(null);
    const trackLayoutRef = useRef<{ x: number; width: number }>({ x: 0, width: 0 });
    const durationRef = useRef(0);

    // Convert milliseconds to seconds for display
    const currentTime = Math.floor((isDragging ? dragPosition : position) / 1000);
    const totalDuration = Math.floor(duration / 1000);
    const progress = duration > 0 ? ((isDragging ? dragPosition : position) / duration) * 100 : 0;

    // Reset timer when song changes
    useEffect(() => {
        setIsDragging(false);
    }, [currentSong?.id]);

    useEffect(() => {
        const loadThumbnailAndColors = async () => {
            if (currentSong?.thumbnailUrl) {
                try {
                    Animated.timing(colorFadeAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: false,
                    }).start();

                    const url = await apiClient.getThumbnailUrlWithAuth(currentSong.thumbnailUrl);
                    setThumbnailUrl(url);

                    // Extract colors from filename, not full URL
                    const filename = currentSong.thumbnailUrl;
                    const colors = await extractColorsFromImage(filename);
                    setDynamicColors(colors);

                    Animated.timing(colorFadeAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: false,
                    }).start();
                } catch (error) {
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
    }, [currentSong?.thumbnailUrl, colorFadeAnim]);

    useEffect(() => {
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
    }, [wave1, wave2, wave3]);

    // Keep duration in a ref to avoid stale closure inside pan handlers
    useEffect(() => {
        durationRef.current = duration || 0;
    }, [duration]);

    // Pan responder for dragging the progress bar
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onShouldBlockNativeResponder: () => true,
            onPanResponderGrant: (evt) => {
                const d = durationRef.current;
                if (!d || d <= 0) {
                    console.log('[MiniPlayer] Grant ignored: no duration (ref=', d, ')');
                    return;
                }
                setIsDragging(true);
                const locX = evt.nativeEvent.locationX;
                const width = trackLayoutRef.current.width || 0;
                const relativeX = Math.max(0, Math.min(width, locX));
                const newProgress = width > 0 ? (relativeX / width) : 0;
                const newPosition = Math.max(0, Math.min(d, newProgress * d));
                console.log('[MiniPlayer] GRANT locX:', locX, 'width:', width, 'relativeX:', relativeX, 'progress:', newProgress, 'pos:', newPosition);
                dragPositionRef.current = newPosition;
                setDragPosition(newPosition);
                Animated.spring(progressHandleScale, {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 5,
                }).start();
            },
            onPanResponderMove: (evt) => {
                const d = durationRef.current;
                if (!d || d <= 0) {
                    console.log('[MiniPlayer] Move ignored: no duration (ref=', d, ')');
                    return;
                }
                const locX = evt.nativeEvent.locationX;
                const width = trackLayoutRef.current.width || 0;
                const relativeX = Math.max(0, Math.min(width, locX));
                const newProgress = width > 0 ? (relativeX / width) : 0;
                const newPosition = Math.max(0, Math.min(d, newProgress * d));
                console.log('[MiniPlayer] MOVE locX:', locX, 'width:', width, 'relativeX:', relativeX, 'progress:', newProgress, 'pos:', newPosition);
                dragPositionRef.current = newPosition;
                setDragPosition(newPosition);
            },
            onPanResponderRelease: async () => {
                const d = durationRef.current;
                if (!d || d <= 0) {
                    console.log('[MiniPlayer] Release ignored: no duration (ref=', d, ')');
                    return;
                }
                const finalPosition = Math.max(0, Math.min(d, dragPositionRef.current));
                console.log('[MiniPlayer] RELEASE seekTo:', finalPosition, 'dragPositionRef:', dragPositionRef.current, 'durationRef:', d);
                try {
                    await seekTo(finalPosition);
                } catch (e) {
                    console.log('[MiniPlayer] seekTo error:', e);
                }
                setIsDragging(false);
                Animated.spring(progressHandleScale, {
                    toValue: 0,
                    useNativeDriver: true,
                    friction: 5,
                }).start();
            },
        })
    ).current;

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

    const backgroundColor = colorFadeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(10, 0, 20, 0.98)', dynamicColors
            ? hexToRgba(dynamicColors.background, 0.98)
            : 'rgba(10, 0, 20, 0.98)']
    });

    const gradientColor = dynamicColors
        ? hexToRgba(dynamicColors.muted, 0.35)
        : 'rgba(74, 58, 110, 0.3)';

    const accentColor = dynamicColors?.vibrant || colors.accent;
    const waveColor = dynamicColors?.primary || colors.primary;

    const ambientGlow1 = dynamicColors
        ? hexToRgba(dynamicColors.primary, 0.18)
        : 'rgba(110, 79, 143, 0.18)';

    const ambientGlow2 = dynamicColors
        ? hexToRgba(dynamicColors.vibrant, 0.12)
        : 'rgba(147, 112, 219, 0.12)';

    const handleScale = progressHandleScale.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.35], // visible at rest, grows when dragging
    });

    return (
        <Animated.View style={[styles.container, { backgroundColor }]}>
            <View style={styles.progressBarContainer}>
                <View
                    ref={progressBarTrackRef}
                    style={styles.progressBarTrack}
                    {...panResponder.panHandlers}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    onLayout={(e) => {
                        const { width } = e.nativeEvent.layout;
                        trackLayoutRef.current = { x: 0, width };
                        console.log('[MiniPlayer] Track onLayout width:', width);
                    }}
                >
                    <Animated.View
                        style={[
                            styles.progressBarFill,
                            {
                                width: `${progress}%`,
                                backgroundColor: accentColor,
                            }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.progressHandle,
                            {
                                left: `${progress}%`,
                                backgroundColor: accentColor,
                                transform: [{ scale: handleScale }],
                            }
                        ]}
                        pointerEvents="none"
                    />
                </View>
            </View>

            {dynamicColors && (
                <>
                    <Animated.View
                        style={[
                            styles.ambientGlowCenter,
                            {
                                backgroundColor: ambientGlow1,
                                opacity: colorFadeAnim,
                            }
                        ]}
                        pointerEvents="none"
                    />
                    <Animated.View
                        style={[
                            styles.ambientGlowLeft,
                            {
                                backgroundColor: ambientGlow2,
                                opacity: colorFadeAnim,
                            }
                        ]}
                        pointerEvents="none"
                    />
                    <Animated.View
                        style={[
                            styles.gradientOverlay,
                            {
                                backgroundColor: gradientColor,
                                opacity: colorFadeAnim,
                            }
                        ]}
                        pointerEvents="none"
                    />
                    <Animated.View
                        style={[
                            styles.gradientTop,
                            {
                                backgroundColor: hexToRgba(dynamicColors.primary, 0.22),
                                opacity: colorFadeAnim,
                            }
                        ]}
                        pointerEvents="none"
                    />
                    <Animated.View
                        style={[
                            styles.gradientBottom,
                            {
                                backgroundColor: hexToRgba(dynamicColors.detail, 0.1),
                                opacity: colorFadeAnim,
                            }
                        ]}
                        pointerEvents="none"
                    />
                </>
            )}

            <View style={styles.playerContent}>
                <View style={styles.thumbnailWrapper}>
                    <ImageWithLoader
                        source={thumbnailUrl ? { uri: thumbnailUrl } : images.placeholder}
                        defaultSource={images.placeholder}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                    {dynamicColors && (
                        <>
                            <Animated.View
                                style={[
                                    styles.thumbnailGlow,
                                    {
                                        backgroundColor: hexToRgba(dynamicColors.vibrant, 0.4),
                                        opacity: colorFadeAnim,
                                    }
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.thumbnailGlowOuter,
                                    {
                                        backgroundColor: hexToRgba(dynamicColors.primary, 0.25),
                                        opacity: colorFadeAnim,
                                    }
                                ]}
                            />
                        </>
                    )}
                </View>

                <View style={styles.songInfo}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentSong.title}
                    </Text>
                    <View style={styles.artistRow}>
                        <Text style={styles.artist} numberOfLines={1}>
                            {currentSong.artist}
                        </Text>
                        <Text style={styles.timeDisplay}>
                            {formatTime(currentTime)} / {formatTime(totalDuration)}
                        </Text>
                    </View>
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

            <View style={styles.spectrumContainer} pointerEvents="none">
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
        paddingTop: 0,
        paddingBottom: 0,
        zIndex: 9999, // ensure above main content
        elevation: 9999, // Android stacking
        overflow: 'visible', // don't clip the progress handle
    },
    progressBarContainer: {
        width: '100%',
        height: 3,
        justifyContent: 'flex-start',
        paddingHorizontal: 0,
        zIndex: 10000, // ensure above everything inside mini player
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        pointerEvents: 'auto',
    },
    progressBarTrack: {
        height: 3,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        position: 'relative',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 0,
    },
    progressHandle: {
        position: 'absolute',
        top: '50%',
        marginTop: -6,
        marginLeft: -6,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.accent,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    ambientGlowCenter: {
        position: 'absolute',
        top: -80,
        left: '15%',
        right: '15%',
        height: 250,
        borderRadius: 125,
        zIndex: -3,
        transform: [{ scaleX: 2.5 }],
        opacity: 0.6,
    },
    ambientGlowLeft: {
        position: 'absolute',
        top: -60,
        left: -80,
        width: 250,
        height: 250,
        borderRadius: 125,
        zIndex: -3,
        opacity: 0.5,
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -2,
        opacity: 0.7,
    },
    gradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60%',
        zIndex: -2,
        opacity: 0.5,
    },
    gradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        zIndex: -2,
        opacity: 0.3,
    },
    playerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: 22, // Minimal space for progress bar
        paddingBottom: spacing.md,
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
        top: -6,
        left: -6,
        right: -6,
        bottom: -6,
        borderRadius: 12,
        zIndex: -1,
        opacity: 0.8,
    },
    thumbnailGlowOuter: {
        position: 'absolute',
        top: -12,
        left: -12,
        right: -12,
        bottom: -12,
        borderRadius: 18,
        zIndex: -2,
        opacity: 0.5,
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
    artistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    artist: {
        color: colors.textSecondary,
        fontSize: 13,
        flex: 1,
    },
    timeDisplay: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.6)',
        marginLeft: spacing.sm,
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
