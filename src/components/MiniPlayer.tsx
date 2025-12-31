// src/components/MiniPlayer.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    PanResponder,
    Modal,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusic } from '../contexts/MusicContext';
import { apiClient } from '../services/apiClient';
import { colors, spacing } from '../styles/theme';
import { images } from '../utils/assets';
import { extractColorsFromImage, hexToRgba } from '../utils/colorExtractor';
import type { ExtractedColors } from '../utils/colorExtractor';
import ImageWithLoader from './ImageWithLoader';
import { getAvailableOutputs, selectOutput, AudioOutput } from '../services/audioRoutingService';

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
    const [routingModalVisible, setRoutingModalVisible] = useState(false);
    const [outputs, setOutputs] = useState<AudioOutput[]>([]);
    const [outputsLoading, setOutputsLoading] = useState(false);
    const [selectedOutput, setSelectedOutput] = useState<string>('system');
    const [selectingOutput, setSelectingOutput] = useState(false);
    const dragPositionRef = useRef(0);

    // Animated soundbar state
    const barAnim1 = useRef(new Animated.Value(0.3)).current;
    const barAnim2 = useRef(new Animated.Value(0.5)).current;
    const barAnim3 = useRef(new Animated.Value(0.4)).current;

    const colorFadeAnim = useRef(new Animated.Value(1)).current;
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

    // Keep duration in a ref to avoid stale closure inside pan handlers
    useEffect(() => {
        durationRef.current = duration || 0;
    }, [duration]);

    // start/stop soundbar animation when playback changes
    useEffect(() => {
        if (isPlaying) startBarAnimation();
        else stopBarAnimation();
        return () => stopBarAnimation();
    }, [isPlaying]);

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

    const openRouting = async () => {
        setRoutingModalVisible(true);
        setOutputsLoading(true);
        try {
            const list = await getAvailableOutputs();
            setOutputs(list);
        } catch (err) {
            console.warn('Failed to get outputs', err);
            setOutputs([]);
        } finally {
            setOutputsLoading(false);
        }
    };

    const handleSelectOutput = async (output: AudioOutput) => {
        setSelectingOutput(true);
        try {
            await selectOutput(output.id);
            setSelectedOutput(output.id);
            setRoutingModalVisible(false);
        } catch (err) {
            console.warn('select output failed', err);
        } finally {
            setSelectingOutput(false);
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
                                opacity: isDragging ? 1 : 0,
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
                                backgroundColor: hexToRgba(dynamicColors.vibrant, 0.08),
                                opacity: colorFadeAnim,
                            }
                        ]}
                        pointerEvents="none"
                    />
                    <Animated.View
                        style={[
                            styles.gradientOverlay,
                            {
                                backgroundColor: hexToRgba(dynamicColors.background, 0.15),
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
                        <Animated.View
                            style={[
                                styles.thumbnailGlow,
                                {
                                    backgroundColor: hexToRgba(dynamicColors.vibrant, 0.15),
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
                    {/* Soundbar / Output Button */}
                    <TouchableOpacity onPress={openRouting} style={styles.routingButton}>
                        {/* Animated soundbar icon */}
                        <View style={styles.soundbarContainer}>
                            <Animated.View style={[styles.bar, { transform: [{ scaleY: barAnim1 }] }]} />
                            <Animated.View style={[styles.bar, { transform: [{ scaleY: barAnim2 }], marginHorizontal: 3 }]} />
                            <Animated.View style={[styles.bar, { transform: [{ scaleY: barAnim3 }] }]} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={previousSong} style={styles.controlButton}>
                        <Ionicons name="play-skip-back" size={20} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handlePlayPause}
                        style={[styles.playButton, { backgroundColor: accentColor }]}
                    >
                        <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={24}
                            color={colors.text}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={nextSong} style={styles.controlButton}>
                        <Ionicons name="play-skip-forward" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Routing Modal */}
            <Modal visible={routingModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Play To</Text>
                        {outputsLoading ? (
                            <ActivityIndicator />
                        ) : (
                            <FlatList
                                data={outputs}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.outputRow} onPress={() => handleSelectOutput(item)} disabled={selectingOutput}>
                                        <Text style={styles.outputName}>{item.name}</Text>
                                        {selectedOutput === item.id && <Text style={styles.outputSelected}>(selected)</Text>}
                                    </TouchableOpacity>
                                )}
                            />
                        )}

                        <TouchableOpacity style={styles.modalClose} onPress={() => setRoutingModalVisible(false)}>
                            <Text style={{ color: colors.accent }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        zIndex: 9999,
        elevation: 9999,
        overflow: 'visible',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    progressBarContainer: {
        width: '100%',
        height: 3,
        justifyContent: 'flex-start',
        paddingHorizontal: 0,
        zIndex: 10000,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        pointerEvents: 'auto',
    },
    progressBarTrack: {
        height: 3,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        position: 'relative',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 0,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
    },
    progressHandle: {
        position: 'absolute',
        top: '50%',
        marginTop: -5,
        marginLeft: -5,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.accent,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 5,
    },
    ambientGlowCenter: {
        position: 'absolute',
        top: -40,
        left: '20%',
        right: '20%',
        height: 120,
        borderRadius: 60,
        zIndex: -3,
        transform: [{ scaleX: 2.5 }],
        opacity: 0.25,
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -2,
        opacity: 0.3,
    },
    playerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: 18,
        paddingBottom: spacing.md,
        gap: spacing.md,
    },
    thumbnailWrapper: {
        position: 'relative',
    },
    thumbnail: {
        width: 52,
        height: 52,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    thumbnailGlow: {
        position: 'absolute',
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        borderRadius: 11,
        zIndex: -1,
        opacity: 0.4,
    },
    songInfo: {
        flex: 1,
    },
    title: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 15,
        marginBottom: 3,
        letterSpacing: 0.3,
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
        opacity: 0.7,
    },
    timeDisplay: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.4)',
        marginLeft: spacing.sm,
        fontVariant: ['tabular-nums'],
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: 18,
    },
    routingButton: {
        paddingRight: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    soundbarContainer: {
        width: 22,
        height: 18,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    bar: {
        width: 4,
        height: 12,
        backgroundColor: colors.text,
        borderRadius: 2,
        transform: [{ scaleY: 0.5 }],
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: 'rgba(10,0,20,0.95)',
        borderRadius: 12,
        padding: spacing.md,
    },
    modalTitle: {
        color: colors.text,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    outputRow: {
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    outputName: { color: colors.text },
    outputSelected: { color: colors.accent },
    modalClose: { marginTop: spacing.sm, alignSelf: 'flex-end' },
});

export default MiniPlayer;
