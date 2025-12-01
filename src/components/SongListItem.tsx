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
import ImageWithLoader from './ImageWithLoader';

interface SongListItemProps {
    song: Song;
    isPlaying: boolean;
    onLikeToggle?: () => void;
}

const SongListItem: React.FC<SongListItemProps> = ({ song, isPlaying, onLikeToggle }) => {
    const { playSong, pauseSong } = useMusic();
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(song.isLiked || false);
    const [isTogglingLike, setIsTogglingLike] = useState(false);

    useEffect(() => {
        const loadThumbnail = async () => {
            if (song.thumbnailUrl) {
                try {
                    const url = await apiClient.getThumbnailUrlWithAuth(song.thumbnailUrl);
                    setThumbnailUrl(url);
                } catch (error) {
                    // Missing thumbnails are normal, use placeholder silently
                    setThumbnailUrl(null);
                }
            }
        };
        loadThumbnail();
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

    return (
        <TouchableOpacity
            style={[styles.container, isPlaying ? styles.containerActive : null]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
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
                    size={24}
                    color={isLiked ? colors.accent : colors.textSecondary}
                />
            </TouchableOpacity>

            {/* Play/Pause Icon */}
            <Ionicons
                name={isPlaying ? 'pause-circle' : 'play-circle'}
                size={32}
                color={isPlaying ? colors.accent : colors.textSecondary}
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
    },
    containerActive: {
        backgroundColor: colors.cardHover,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    thumbnailContainer: {
        marginRight: spacing.md,
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
    },
    artist: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    likeButton: {
        padding: spacing.sm,
        marginRight: spacing.xs,
    },
});

export default SongListItem;