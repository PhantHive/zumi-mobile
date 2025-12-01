// src/components/SongListItem.tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { useMusic } from '../contexts/MusicContext';
import { apiClient } from '../services/apiClient';
import { colors, spacing, typography, borderRadius } from '../styles/theme';
import { images } from '../utils/assets';

interface SongListItemProps {
    song: Song;
    isPlaying: boolean;
}

const SongListItem: React.FC<SongListItemProps> = ({ song, isPlaying }) => {
    const { playSong, pauseSong } = useMusic();

    const handlePress = () => {
        if (isPlaying) {
            pauseSong();
        } else {
            playSong(song);
        }
    };

    const thumbnailUrl = song.thumbnailUrl
        ? apiClient.getThumbnailUrl(song.thumbnailUrl)
        : null;

    return (
        <TouchableOpacity
            style={[styles.container, isPlaying ? styles.containerActive : null]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            {/* Thumbnail */}
            <View style={styles.thumbnailContainer}>
                <Image
                    source={thumbnailUrl ? { uri: thumbnailUrl } : images.placeholder}
                    style={styles.thumbnail}
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
    placeholderThumbnail: {
        width: 50,
        height: 50,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
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
});

export default SongListItem;