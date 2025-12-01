// src/components/AlbumCard.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
} from 'react-native';
import { Album, Song } from '../types';
import { useMusic } from '../contexts/MusicContext';
import { apiClient } from '../services/apiClient';
import { colors, spacing } from '../styles/theme';
import { images } from '../utils/assets';
import { extractColorsFromImage, ExtractedColors, hexToRgba } from '../utils/colorExtractor';

interface AlbumCardProps {
    album: Album;
    index: number;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album, index }) => {
    const [albumCoverUrl, setAlbumCoverUrl] = useState<string | null>(null);
    const [albumColors, setAlbumColors] = useState<ExtractedColors | null>(null);

    useEffect(() => {
        const loadThumbnailAndColors = async () => {
            if (album.songs[0]?.thumbnailUrl) {
                try {
                    const url = await apiClient.getThumbnailUrlWithAuth(album.songs[0].thumbnailUrl);
                    setAlbumCoverUrl(url);

                    // Extract colors from the album cover - now using proper React Native implementation
                    const extractedColors = await extractColorsFromImage(url);
                    setAlbumColors(extractedColors);
                } catch (error) {
                    // Missing thumbnails are normal, use placeholder silently
                    setAlbumCoverUrl(null);
                    setAlbumColors(null);
                }
            }
        };
        loadThumbnailAndColors();
    }, [album.songs]);

    // Get background color - use extracted color with enhanced opacity for better visibility
    const bgColor = albumColors
        ? hexToRgba(albumColors.background, 0.7)
        : 'rgba(26, 26, 46, 0.8)';

    const gradientColor = albumColors
        ? hexToRgba(albumColors.secondary, 0.45)
        : 'rgba(74, 58, 110, 0.3)';

    const accentColor = albumColors?.primary || colors.accent;

    // Add subtle glow effect for album cover
    const albumGlowColor = albumColors
        ? hexToRgba(albumColors.primary, 0.25)
        : 'transparent';

    return (
        <View style={[styles.albumContainer, { backgroundColor: bgColor }]}>
            {/* Multi-layer gradient overlay for Spotify/Deezer effect */}
            <View
                style={[
                    styles.gradientOverlay,
                    {
                        backgroundColor: gradientColor
                    }
                ]}
            />
            {/* Additional top gradient for depth */}
            {albumColors && (
                <View
                    style={[
                        styles.gradientTop,
                        {
                            backgroundColor: hexToRgba(albumColors.detail, 0.12)
                        }
                    ]}
                />
            )}

            {/* Album Header */}
            <View style={styles.albumHeader}>
                <View style={styles.coverWrapper}>
                    <Image
                        source={albumCoverUrl ? { uri: albumCoverUrl } : images.placeholder}
                        style={styles.albumCover}
                        defaultSource={images.placeholder}
                    />
                    {/* Glow effect around album cover */}
                    {albumColors && (
                        <View
                            style={[
                                styles.albumCoverGlow,
                                {
                                    backgroundColor: albumGlowColor,
                                    shadowColor: albumColors.primary,
                                }
                            ]}
                        />
                    )}
                </View>
                <View style={styles.albumInfo}>
                    <Text style={styles.albumTitle}>{album.name}</Text>
                    <Text style={styles.albumSubtitle}>{album.songs.length} songs</Text>
                </View>
            </View>

            {/* Song Grid */}
            <View style={styles.songsGrid}>
                {album.songs.map((song) => (
                    <SongCard key={song.id} song={song} accentColor={accentColor} />
                ))}
            </View>
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
                    // Missing thumbnails are normal, use placeholder silently
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
                isActive && { backgroundColor: 'rgba(0, 0, 0, 0.3)' }
            ]}
            onPress={() => playSong(song)}
        >
            <Image
                source={thumbnailUrl ? { uri: thumbnailUrl } : images.placeholder}
                style={styles.songThumbnail}
                defaultSource={images.placeholder}
                resizeMode="cover"
            />
            {isActive && <View style={[styles.playingIndicator, { backgroundColor: accentColor }]} />}
            <Text style={styles.songTitle} numberOfLines={2}>
                {song.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
                {song.artist}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    albumContainer: {
        borderRadius: 8,
        padding: spacing.md,
        marginBottom: spacing.md,
        overflow: 'hidden',
        position: 'relative',
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
    },
    gradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40%',
        zIndex: -1,
    },
    albumHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    coverWrapper: {
        borderRadius: 6,
        overflow: 'hidden',
        width: 64,
        height: 64,
        position: 'relative',
    },
    albumCover: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    albumCoverGlow: {
        position: 'absolute',
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        borderRadius: 9,
        zIndex: -1,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    albumInfo: {
        flex: 1,
    },
    albumTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    albumArtist: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 2,
    },
    albumSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        opacity: 0.6,
    },
    songsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    songCard: {
        width: 110,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 6,
        padding: spacing.xs,
        position: 'relative',
    },
    songCardActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    playingIndicator: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 6,
        height: 6,
        borderRadius: 3,
        zIndex: 1,
    },
    songThumbnail: {
        width: 110 - (spacing.xs * 2), // Card width minus padding
        height: 110 - (spacing.xs * 2), // Square
        borderRadius: 4,
        marginBottom: spacing.xs,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    songTitle: {
        fontWeight: '600',
        fontSize: 12,
        color: colors.text,
        marginBottom: 2,
        height: 32,
    },
    songArtist: {
        fontSize: 11,
        color: colors.textSecondary,
        opacity: 0.7,
    },
});

export default AlbumCard;
