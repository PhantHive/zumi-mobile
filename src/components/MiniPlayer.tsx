// src/components/MiniPlayer.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    PanResponder,
    FlatList,
    useWindowDimensions,
    TouchableWithoutFeedback,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusic } from '../contexts/MusicContext';
import { apiClient } from '../services/apiClient';
import { colors, spacing } from '../styles/theme';
import { images } from '../utils/assets';
import { extractColorsFromImage, hexToRgba } from '../utils/colorExtractor';
import { searchImages } from '../services/imageSearchService';
import type { ExtractedColors } from '../utils/colorExtractor';
import ImageWithLoader from './ImageWithLoader';
import AudioOutputModal from './AudioOutputModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();

    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [dynamicColors, setDynamicColors] = useState<ExtractedColors | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const dragPositionRef = useRef(0);

    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [imagePickerVisible, setImagePickerVisible] = useState(false);

    // Simple audio output modal
    const [showAudioModal, setShowAudioModal] = useState(false);

    const progressBarTrackRef = useRef<View | null>(null);
    const trackLayoutRef = useRef<{ x: number; width: number }>({ x: 0, width: 0 });
    const durationRef = useRef(0);

    // animated values
    const colorFadeAnim = useRef(new Animated.Value(1)).current;
    const progressHandleScale = useRef(new Animated.Value(0)).current;

    // soundbar animation
    const barAnim1 = useRef(new Animated.Value(0.4)).current;
    const barAnim2 = useRef(new Animated.Value(0.6)).current;
    const barAnim3 = useRef(new Animated.Value(0.5)).current;

    // compute times
    const currentTime = Math.floor((isDragging ? dragPosition : position) / 1000);
    const totalDuration = Math.floor(duration / 1000);
    const progress = duration > 0 ? ((isDragging ? dragPosition : position) / duration) * 100 : 0;

    useEffect(() => {
        durationRef.current = duration || 0;
    }, [duration]);

    useEffect(() => {
        if (isPlaying) startBarAnimation();
        else stopBarAnimation();
        return () => stopBarAnimation();
    }, [isPlaying]);

    useEffect(() => {
        let searched = false;
        const loadThumbnailAndColors = async () => {
            if (!currentSong) return;

            Animated.timing(colorFadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();

            // Try provided thumbnail first
            if (currentSong.thumbnailUrl) {
                try {
                    const url = await apiClient.getThumbnailUrlWithAuth(currentSong.thumbnailUrl);
                    setThumbnailUrl(url);

                    const filename = currentSong.thumbnailUrl;
                    const colors = await extractColorsFromImage(filename);
                    setDynamicColors(colors);

                    Animated.timing(colorFadeAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: false,
                    }).start();
                    return;
                } catch (error) {
                    // fallthrough to search
                }
            }

            // If no thumbnail or failed, search by song title + artist (Bing fallback)
            try {
                const query = `${currentSong.title || ''} ${currentSong.artist || ''}`.trim();
                if (query && !searched) {
                    searched = true;
                    const results = await searchImages(query, 6);
                    if (results && results.length > 0) {
                        // set first as default but keep suggestions for the user to choose
                        const chosen = results[0];
                        setThumbnailUrl(chosen);
                        setSearchResults(results);
                        // show a small picker so the user can pick a better image if they want
                        setImagePickerVisible(true);
                        try {
                            const colors = await extractColorsFromImage(chosen);
                            setDynamicColors(colors);
                        } catch (e) {
                            setDynamicColors(null);
                        }
                        Animated.timing(colorFadeAnim, {
                            toValue: 1,
                            duration: 500,
                            useNativeDriver: false,
                        }).start();
                        return;
                    }
                }
            } catch (err) {
                // ignore search errors
            }

            // fallback -> no thumbnail
            setThumbnailUrl(null);
            setDynamicColors(null);
            colorFadeAnim.setValue(1);
        };
        loadThumbnailAndColors();
    }, [currentSong?.thumbnailUrl, currentSong?.title, currentSong?.artist, colorFadeAnim]);

    // soundbar animation helpers
    const startBarAnimation = () => {
        stopBarAnimation();
        const seq1 = Animated.sequence([
            Animated.timing(barAnim1, { toValue: 1.0, duration: 420, useNativeDriver: true }),
            Animated.timing(barAnim1, { toValue: 0.35, duration: 360, useNativeDriver: true }),
        ]);
        const seq2 = Animated.sequence([
            Animated.timing(barAnim2, { toValue: 0.4, duration: 380, useNativeDriver: true }),
            Animated.timing(barAnim2, { toValue: 1.0, duration: 440, useNativeDriver: true }),
        ]);
        const seq3 = Animated.sequence([
            Animated.timing(barAnim3, { toValue: 0.95, duration: 460, useNativeDriver: true }),
            Animated.timing(barAnim3, { toValue: 0.45, duration: 340, useNativeDriver: true }),
        ]);
        Animated.loop(Animated.parallel([seq1, seq2, seq3])).start();
    };

    const stopBarAnimation = () => {
        barAnim1.stopAnimation(() => barAnim1.setValue(0.4));
        barAnim2.stopAnimation(() => barAnim2.setValue(0.6));
        barAnim3.stopAnimation(() => barAnim3.setValue(0.5));
    };

    // Pan responder for progress bar
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
                if (!d || d <= 0) return;
                setIsDragging(true);
                const locX = evt.nativeEvent.locationX;
                const width = trackLayoutRef.current.width || 0;
                const relativeX = Math.max(0, Math.min(width, locX));
                const newProgress = width > 0 ? relativeX / width : 0;
                const newPosition = Math.max(0, Math.min(d, newProgress * d));
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
                if (!d || d <= 0) return;
                const locX = evt.nativeEvent.locationX;
                const width = trackLayoutRef.current.width || 0;
                const relativeX = Math.max(0, Math.min(width, locX));
                const newProgress = width > 0 ? relativeX / width : 0;
                const newPosition = Math.max(0, Math.min(d, newProgress * d));
                dragPositionRef.current = newPosition;
                setDragPosition(newPosition);
            },
            onPanResponderRelease: async () => {
                const d = durationRef.current;
                if (!d || d <= 0) return;
                const finalPosition = Math.max(0, Math.min(d, dragPositionRef.current));
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
        outputRange: [
            'rgba(10, 0, 20, 0.98)',
            dynamicColors ? hexToRgba(dynamicColors.background, 0.98) : 'rgba(10, 0, 20, 0.98)',
        ],
    });

    const accentColor = dynamicColors?.vibrant || colors.accent;

    const handleScale = progressHandleScale.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.35],
    });

    return (
        <Animated.View style={[styles.container, { backgroundColor, paddingBottom: Math.max(insets.bottom, 8) }]}>
            <View style={styles.progressBarContainer}>
                <View
                    ref={progressBarTrackRef}
                    style={styles.progressBarTrack}
                    {...panResponder.panHandlers}
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
                            },
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
                            },
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
                            },
                        ]}
                        pointerEvents="none"
                    />
                    <Animated.View
                        style={[
                            styles.gradientOverlay,
                            {
                                backgroundColor: hexToRgba(dynamicColors.background, 0.15),
                                opacity: colorFadeAnim,
                            },
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
                        style={[styles.thumbnail, { width: 54, height: 54, borderRadius: 8 }]}
                        resizeMode="cover"
                    />
                    {dynamicColors && (
                        <Animated.View
                            style={[
                                styles.thumbnailGlow,
                                {
                                    backgroundColor: hexToRgba(dynamicColors.vibrant, 0.15),
                                    opacity: colorFadeAnim,
                                },
                            ]}
                        />
                    )}
                    {searchResults.length > 1 && (
                        <TouchableOpacity style={styles.suggestButton} onPress={() => setImagePickerVisible(true)}>
                            <Ionicons name="images-outline" size={16} color={colors.text} />
                        </TouchableOpacity>
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
            </View>

            <View style={styles.controls}>
                <TouchableOpacity onPress={previousSong} style={styles.controlButton}>
                    <Ionicons name="play-skip-back" size={22} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
                    {isPlaying ? (
                        <View style={styles.soundbarContainer}>
                            <Animated.View style={[styles.bar, { transform: [{ scaleY: barAnim1 }], marginHorizontal: 1 }]} />
                            <Animated.View style={[styles.bar, { transform: [{ scaleY: barAnim2 }], marginHorizontal: 1 }]} />
                            <Animated.View style={[styles.bar, { transform: [{ scaleY: barAnim3 }], marginHorizontal: 1 }]} />
                        </View>
                    ) : (
                        <Ionicons name="play" size={26} color={accentColor} />
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={nextSong} style={styles.controlButton}>
                    <Ionicons name="play-skip-forward" size={22} color={colors.text} />
                </TouchableOpacity>

                {/* Audio Output Button */}
                <TouchableOpacity onPress={() => setShowAudioModal(true)} style={styles.routingButton}>
                    <Ionicons name="volume-high" size={22} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Audio Output Modal */}
            <AudioOutputModal
                visible={showAudioModal}
                onClose={() => setShowAudioModal(false)}
            />

            {/* Image suggestion picker modal */}
            {imagePickerVisible && (
                <TouchableWithoutFeedback onPress={() => setImagePickerVisible(false)}>
                    <View style={styles.pickerOverlay} pointerEvents="box-none">
                        <View
                            style={[
                                styles.pickerContent,
                                {
                                    backgroundColor: dynamicColors
                                        ? hexToRgba(dynamicColors.background, 0.98)
                                        : 'rgba(10,0,20,0.98)',
                                },
                            ]}
                        >
                            <Text style={styles.modalTitle}>Choose Artwork</Text>
                            <FlatList
                                data={searchResults}
                                horizontal
                                keyExtractor={(i) => i}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.pickerItem}
                                        onPress={async () => {
                                            setThumbnailUrl(item);
                                            try {
                                                const colors = await extractColorsFromImage(item);
                                                setDynamicColors(colors);
                                            } catch (e) {
                                                setDynamicColors(null);
                                            }
                                            setImagePickerVisible(false);
                                        }}
                                    >
                                        <ImageWithLoader
                                            source={{ uri: item }}
                                            defaultSource={images.placeholder}
                                            style={styles.pickerImage}
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                )}
                            />
                            <TouchableOpacity onPress={() => setImagePickerVisible(false)} style={styles.pickerClose}>
                                <Text style={{ color: colors.accent }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            )}
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
        zIndex: 9999,
        elevation: 9999,
        overflow: 'visible',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.04)',
    },
    progressBarContainer: {
        width: '100%',
        height: 4,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
    },
    progressBarTrack: {
        height: 4,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.06)',
        position: 'relative',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.accent,
    },
    progressHandle: {
        position: 'absolute',
        top: '50%',
        marginTop: -6,
        marginLeft: -6,
        width: 12,
        height: 12,
        borderRadius: 12,
        backgroundColor: colors.accent,
        elevation: 6,
    },
    ambientGlowCenter: {
        position: 'absolute',
        top: -36,
        left: '20%',
        right: '20%',
        height: 110,
        borderRadius: 60,
        zIndex: -3,
        transform: [{ scaleX: 2 }],
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -2,
    },
    playerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: 12,
        paddingBottom: spacing.sm,
        gap: spacing.md,
    },
    thumbnailWrapper: { position: 'relative' },
    thumbnail: { backgroundColor: 'rgba(255,255,255,0.03)' },
    thumbnailGlow: {
        position: 'absolute',
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        borderRadius: 12,
        zIndex: -1,
        opacity: 0.4,
    },
    suggestButton: {
        position: 'absolute',
        right: -6,
        bottom: -6,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
    },
    pickerOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    pickerContent: {
        width: '96%',
        padding: spacing.md,
        borderRadius: 12,
        marginBottom: 92,
    },
    pickerItem: {
        marginRight: spacing.sm,
        width: 96,
        height: 96,
        borderRadius: 8,
        overflow: 'hidden',
    },
    pickerImage: { width: '100%', height: '100%' },
    pickerClose: { marginTop: spacing.sm, alignSelf: 'flex-end' },
    songInfo: { flex: 1 },
    title: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 15,
        marginBottom: 3,
        letterSpacing: 0.3,
        flexShrink: 1,
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
        opacity: 0.8,
        marginRight: spacing.sm,
    },
    timeDisplay: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.45)',
        marginLeft: spacing.sm,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: 8,
    },
    controlButton: {
        paddingHorizontal: spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: spacing.sm,
    },
    routingButton: {
        paddingLeft: spacing.md,
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
        transform: [{ scaleY: 0.6 }],
    },
    modalTitle: {
        color: colors.text,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
});

export default MiniPlayer;