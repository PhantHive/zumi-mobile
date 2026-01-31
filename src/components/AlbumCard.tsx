// src/components/AlbumCard.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Album, Song } from '../types';
import { useMusic } from '../contexts/MusicContext';
import { apiClient } from '../services/apiClient';
import { colors, spacing } from '../styles/theme';
import { images } from '../utils/assets';
import { extractColorsFromImage, hexToRgba } from '../utils/colorExtractor';
import type { ExtractedColors } from '../utils/colorExtractor';
import ImageWithLoader from './ImageWithLoader';

interface AlbumCardProps {
    album: Album;
    index: number;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album }) => {
     const [albumColors, setAlbumColors] = useState<ExtractedColors | null>(null);
     const [albumCoverUrl, setAlbumCoverUrl] = useState<string | null>(null);
     const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        const loadThumbnailAndColors = async () => {
            if (album.songs[0]?.thumbnailUrl) {
                try {
                    const url = await apiClient.getThumbnailUrlWithAuth(album.songs[0].thumbnailUrl);
                    setAlbumCoverUrl(url);

                    const filename = album.songs[0].thumbnailUrl;
                    const extractedColors = await extractColorsFromImage(filename);
                    setAlbumColors(extractedColors);
                } catch (error) {
                    setAlbumCoverUrl(null);
                    setAlbumColors(null);
                }
            }
        };
        loadThumbnailAndColors();
    }, [album.songs]);

    const bgColor = albumColors
        ? hexToRgba(albumColors.background, 0.85)
        : 'rgba(26, 26, 46, 0.8)';

    const accentColor = albumColors?.vibrant || colors.accent;

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <View style={[styles.albumContainer, { backgroundColor: bgColor }]}>
            {albumColors && (
                <>
                    <View
                        style={[
                            styles.ambientGlowCover,
                            {
                                backgroundColor: hexToRgba(albumColors.vibrant, 0.12),
                            }
                        ]}
                    />
                    <View
                        style={[
                            styles.gradientOverlay,
                            {
                                backgroundColor: hexToRgba(albumColors.background, 0.2)
                            }
                        ]}
                    />
                </>
            )}

            {/* Album Header - Clickable */}
            <TouchableOpacity
                style={styles.albumHeader}
                onPress={toggleExpanded}
                activeOpacity={0.7}
            >
                <View style={styles.coverWrapper}>
                    <ImageWithLoader
                        source={albumCoverUrl ? { uri: albumCoverUrl } : images.placeholder}
                        defaultSource={images.placeholder}
                        containerStyle={styles.coverImageContainer}
                        style={styles.albumCover}
                        resizeMode="cover"
                    />
                    {albumColors && (
                        <View
                            style={[
                                styles.albumCoverGlow,
                                {
                                    backgroundColor: hexToRgba(albumColors.vibrant, 0.2),
                                }
                            ]}
                        />
                    )}
                </View>
                <View style={styles.albumInfo}>
                    <Text style={styles.albumTitle}>{album.name}</Text>
                    <Text style={styles.albumSubtitle}>{album.songs.length} songs</Text>
                </View>
                <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={accentColor}
                    style={styles.chevronIcon}
                />
            </TouchableOpacity>

            {/* Song List - Conditional rendering */}
            {isExpanded && (
                <View style={styles.songsList}>
                    {album.songs.map((song) => (
                        <SongCard key={song.id} song={song} accentColor={accentColor} />
                    ))}
                </View>
            )}
        </View>
    );
};

const SongCard: React.FC<{ song: Song; accentColor: string }> = ({ song, accentColor }) => {
    const { playSong, currentSong } = useMusic();
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const isActive = currentSong?.id === song.id;

    useEffect(() => {
        const loadThumbnail = async () => {
            if (song.thumbnailUrl) {
                try {
                    const url = await apiClient.getThumbnailUrlWithAuth(song.thumbnailUrl);
                    setThumbnailUrl(url);
                } catch (error) {
                    setThumbnailUrl(null);
                }
            }
        };
        loadThumbnail();
    }, [song.thumbnailUrl, song.id]);

    return (
        <TouchableOpacity
            style={[
                styles.songCard,
                isActive && {
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    borderColor: hexToRgba(accentColor, 0.5)
                }
            ]}
            onPress={() => playSong(song)}
            activeOpacity={0.7}
        >
            <View style={styles.songThumbnailWrapper}>
                <ImageWithLoader
                    source={thumbnailUrl ? { uri: thumbnailUrl } : images.placeholder}
                    defaultSource={images.placeholder}
                    containerStyle={styles.songThumbnailContainer}
                    style={styles.songThumbnail}
                    resizeMode="cover"
                />
                {isActive && (
                    <View style={[styles.playingIndicatorOverlay]}>
                        <View style={[styles.playingIndicator, { backgroundColor: accentColor }]} />
                    </View>
                )}
                {song.videoUrl && (
                    <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={12} color="#fff" />
                    </View>
                )}
            </View>
            <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>
                    {song.title}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                    {song.artist}
                </Text>
            </View>
            <Ionicons
                name={isActive ? "play-circle" : "play-circle-outline"}
                size={28}
                color={isActive ? accentColor : colors.textSecondary}
                style={styles.playIcon}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    albumContainer: {
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    ambientGlowCover: {
        position: 'absolute',
        top: -100,
        left: '10%',
        right: '10%',
        height: 200,
        borderRadius: 100,
        zIndex: -3,
        opacity: 0.15,
        transform: [{ scaleX: 1.8 }],
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -2,
        opacity: 0.25,
    },
    albumHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    coverWrapper: {
        borderRadius: 8,
        overflow: 'hidden', // ensure image is clipped to rounded corners
        width: 72,
        height: 72,
        position: 'relative',
    },
    coverImageContainer: {
        width: '100%',
        height: '100%',
    },
    albumCover: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    albumCoverGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 12,
        zIndex: -1,
        opacity: 0.3,
    },
    albumInfo: {
        flex: 1,
    },
    albumTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    albumSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        opacity: 0.6,
    },
    chevronIcon: {
        marginLeft: spacing.xs,
    },
    songsList: {
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    songCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 10,
        padding: spacing.sm,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    songThumbnailWrapper: {
        position: 'relative',
        width: 56,
        height: 56,
        borderRadius: 8,
        overflow: 'hidden',
    },
    songThumbnail: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    songThumbnailContainer: {
        width: '100%',
        height: '100%',
    },
    videoBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(181, 101, 216, 0.9)',
        borderRadius: 10,
        padding: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
    playingIndicatorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playingIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
        elevation: 4,
    },
    songInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    songTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 18,
    },
    songArtist: {
        color: colors.textSecondary,
        fontSize: 12,
        opacity: 0.7,
    },
    playIcon: {
        marginLeft: spacing.xs,
    },
});

export default AlbumCard;
