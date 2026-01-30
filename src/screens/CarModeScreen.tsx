// src/screens/CarModeScreen.tsx
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCarMode } from '../contexts/CarModeContext';
import { colors, spacing, typography } from '../styles/theme';
import { useMusic } from '../contexts/MusicContext';
import ImageWithLoader from '../components/ImageWithLoader';
import { apiClient } from '../services/apiClient';
import { images } from '../utils/assets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CarModeScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { enterCarMode, exitCarMode } = useCarMode();
    const { currentSong, isPlaying, pauseSong, resumeSong, nextSong, previousSong, position, duration } = useMusic();
    const insets = useSafeAreaInsets();
    const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
    const [loadingThumb, setLoadingThumb] = useState(false);

    // Animated fade/scale for image for subtle effect
    const imageScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Ensure car mode is active
        enterCarMode();
        Animated.timing(imageScale, { toValue: 1.02, duration: 600, useNativeDriver: true }).start();
        return () => {
            // Exit car mode when unmounting
            exitCarMode();
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const loadThumbnail = async () => {
            if (!currentSong) {
                setThumbnailUri(null);
                return;
            }

            if (!currentSong.thumbnailUrl) {
                setThumbnailUri(null);
                return;
            }

            try {
                setLoadingThumb(true);
                const url = await apiClient.getThumbnailUrlWithAuth(currentSong.thumbnailUrl);
                if (mounted) setThumbnailUri(url || null);
            } catch (e) {
                console.warn('Failed to fetch thumbnail for car mode', e);
                if (mounted) setThumbnailUri(null);
            } finally {
                if (mounted) setLoadingThumb(false);
            }
        };

        loadThumbnail();

        return () => {
            mounted = false;
        };
    }, [currentSong]);

    const handleClose = () => {
        exitCarMode();
        navigation.goBack();
    };

    const togglePlay = async () => {
        try {
            if (isPlaying) await pauseSong();
            else await resumeSong();
        } catch (e) {
            console.warn('Toggle play error', e);
        }
    };

    const onPrev = () => previousSong();
    const onNext = () => nextSong();

    const progressPercent = duration && duration > 0 ? Math.min(1, position / duration) : 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Animated.View style={[styles.imageWrapper, { transform: [{ scale: imageScale }] }]}>
                <ImageWithLoader
                    source={thumbnailUri ? { uri: thumbnailUri } : images.placeholder}
                    defaultSource={images.placeholder}
                    style={styles.image}
                    containerStyle={styles.imageContainer}
                    resizeMode="cover"
                    loading={loadingThumb}
                />
            </Animated.View>

            {/* Player controls area */}
            <View style={styles.playerArea}>
                <View style={styles.trackInfo}>
                    <Text style={styles.title} numberOfLines={1}>{currentSong?.title || 'Nothing playing'}</Text>
                    <Text style={styles.artist} numberOfLines={1}>{currentSong?.artist || ''}</Text>
                </View>

                <View style={styles.controlsRow}>
                    <TouchableOpacity onPress={onPrev} style={styles.controlButton} accessibilityLabel="Previous">
                        <Ionicons name="play-skip-back" size={34} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={togglePlay} style={[styles.playButton]} accessibilityLabel="Play Pause">
                        <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onNext} style={styles.controlButton} accessibilityLabel="Next">
                        <Ionicons name="play-skip-forward" size={34} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressTrack} />
                    <View style={[styles.progressFill, { width: `${progressPercent * 100}%`}]} />
                </View>

                {/* Close button top-right */}
                <TouchableOpacity style={[styles.closeButton, { top: insets.top + 12 }]} onPress={handleClose}>
                    <Ionicons name={Platform.OS === 'ios' ? 'close' : 'close'} size={20} color="#fff" />
                </TouchableOpacity>
            </View>
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
        backgroundColor: 'black',
        zIndex: 2000,
        justifyContent: 'flex-start',
        alignItems: 'stretch',
    },
    imageWrapper: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    playerArea: {
        height: 220,
        paddingHorizontal: spacing.md,
        paddingBottom: 24,
        justifyContent: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    trackInfo: {
        marginTop: 12,
        marginBottom: 8,
    },
    title: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '700',
    },
    artist: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    controlButton: {
        padding: 12,
        borderRadius: 40,
        backgroundColor: 'transparent',
    },
    playButton: {
        backgroundColor: colors.accent,
        padding: 18,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    progressContainer: {
        height: 12,
        marginTop: 18,
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    progressTrack: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: colors.accent,
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
});

export default CarModeScreen;
