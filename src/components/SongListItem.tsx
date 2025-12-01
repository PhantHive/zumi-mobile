// src/components/SongListItem.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { useMusic } from '../contexts/MusicContext';
import { apiClient } from '../services/apiClient';
import { colors, spacing, typography, borderRadius } from '../styles/theme';
import { images } from '../utils/assets';
import { extractColorsFromImage, hexToRgba } from '../utils/colorExtractor';
import type { ExtractedColors } from '../utils/colorExtractor';
import ImageWithLoader from './ImageWithLoader';

interface SongListItemProps {
    song: Song;
    isPlaying: boolean;
    onLikeToggle?: () => void;
}

const SongListItem: React.FC<SongListItemProps> = ({ song, isPlaying, onLikeToggle }) => {
    const { playSong, pauseSong } = useMusic();
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [songColors, setSongColors] = useState<ExtractedColors | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [isTogglingLike, setIsTogglingLike] = useState(false);

    useEffect(() => {
        const loadThumbnailAndColors = async () => {
            if (song.thumbnailUrl) {
                try {
                    const url = await apiClient.getThumbnailUrlWithAuth(song.thumbnailUrl);
                    setThumbnailUrl(url);

                    // Extract colors from filename
                    const filename = song.thumbnailUrl;
                    const extractedColors = await extractColorsFromImage(filename);
                    setSongColors(extractedColors);
                } catch (error) {
                    // Missing thumbnails are normal, use placeholder silently
                    setThumbnailUrl(null);
                    setSongColors(null);
                }
            }
        };
        loadThumbnailAndColors();
    }, [song.thumbnailUrl]);

    const handlePress = () => {
        if (isPlaying) {
            pauseSong();
        } else {
            playSong(song);
        }
    };

    const handleLikePress = async (e: any) => {
        e.stopPropagation();
        if (isTogglingLike) return;

        setIsTogglingLike(true);
        try {
            await apiClient.toggleLike(song.id);
            setIsLiked(!isLiked);
            onLikeToggle?.();
        } catch (error) {
            console.error('Failed to toggle like:', error);
        } finally {
            setIsTogglingLike(false);
        }
    };

    const accentColor = songColors?.vibrant || colors.accent;
    const bgColor = isPlaying && songColors
        ? hexToRgba(songColors.background, 0.12)
        : 'rgba(255, 255, 255, 0.05)';

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: bgColor,
                }
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            {/* Subtle glow when playing */}
            {isPlaying && songColors && (
                <>
                    <View
                        style={[
                            styles.glowEffect,
                            {
                                backgroundColor: hexToRgba(songColors.vibrant, 0.08),
                            }
                        ]}
                    />
                    <View
                        style={[
                            styles.leftAccent,
                            {
                                backgroundColor: accentColor,
                            }
                        ]}
                    />
                </>
            )}

            {/* Thumbnail */}
            <View style={styles.thumbnailContainer}>
                <ImageWithLoader
                    source={thumbnailUrl ? { uri: thumbnailUrl } : images.placeholder}
                    defaultSource={images.placeholder}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
            </View>

            {/* Song Info */}
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                    {song.title}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {song.artist}
                </Text>
            </View>

            {/* Like Button */}
            <TouchableOpacity
                onPress={handleLikePress}
                style={styles.likeButton}
                disabled={isTogglingLike}
            >
                <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isLiked ? accentColor : 'rgba(255, 255, 255, 0.4)'}
                />
            </TouchableOpacity>

            {/* Play/Pause Icon */}
            <Ionicons
                name={isPlaying ? 'pause-circle' : 'play-circle'}
                size={28}
                color={isPlaying ? accentColor : 'rgba(255, 255, 255, 0.4)'}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.card,
        marginHorizontal: spacing.md,
        marginVertical: spacing.xs,
        borderRadius: borderRadius.md,
        position: 'relative',
        overflow: 'hidden',
    },
    glowEffect: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
    },
    leftAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderTopLeftRadius: borderRadius.md,
        borderBottomLeftRadius: borderRadius.md,
    },
    thumbnailContainer: {
        marginRight: spacing.md,
        position: 'relative',
    },
    thumbnail: {
        width: 50,
        height: 50,
        borderRadius: borderRadius.sm,
    },
    info: {
        flex: 1,
    },
    title: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
        marginBottom: spacing.xs / 2,
        fontSize: 15,
    },
    artist: {
        ...typography.caption,
        color: colors.textSecondary,
        opacity: 0.7,
        fontSize: 13,
    },
    likeButton: {
        padding: spacing.sm,
        marginRight: spacing.xs,
    },
});

export default SongListItem;
