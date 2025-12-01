// src/components/AlbumCard.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
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

const AlbumCard: React.FC<AlbumCardProps> = ({ album, index }) => {
    const { playSong, currentSong } = useMusic();
    const [albumColors, setAlbumColors] = useState<ExtractedColors | null>(null);
    const [albumCoverUrl, setAlbumCoverUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadThumbnailAndColors = async () => {
            if (album.songs[0]?.thumbnailUrl) {
                try {
                    const url = await apiClient.getThumbnailUrlWithAuth(album.songs[0].thumbnailUrl);
                    setAlbumCoverUrl(url);

                    // Extract colors from filename, not full URL
                    const filename = album.songs[0].thumbnailUrl;
                    const extractedColors = await extractColorsFromImage(filename);
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
        ? hexToRgba(albumColors.background, 0.85)
        : 'rgba(26, 26, 46, 0.8)';

    const gradientColor = albumColors
        ? hexToRgba(albumColors.muted, 0.4)
        : 'rgba(74, 58, 110, 0.3)';

    const accentColor = albumColors?.vibrant || colors.accent;

    // Netflix-style ambient glow colors
    const ambientGlow1 = albumColors
        ? hexToRgba(albumColors.primary, 0.25)
        : 'transparent';

    const ambientGlow2 = albumColors
        ? hexToRgba(albumColors.vibrant, 0.15)
        : 'transparent';

    const albumGlowColor = albumColors
        ? hexToRgba(albumColors.vibrant, 0.35)
        : 'transparent';

    return (
        <View style={[styles.albumContainer, { backgroundColor: bgColor }]}>
            {/* Netflix-style multi-layer ambient lighting */}
            {albumColors && (
                <>
                    {/* Radial glow from album cover position */}
                    <View
                        style={[
                            styles.ambientGlowCover,
                            {
                                backgroundColor: ambientGlow1,
                            }
                        ]}
                    />
                    {/* Secondary ambient light from top-right */}
                    <View
                        style={[
                            styles.ambientGlowTopRight,
                            {
                                backgroundColor: ambientGlow2,
                            }
                        ]}
                    />
                    {/* Gradient overlay for depth */}
                    <View
                        style={[
                            styles.gradientOverlay,
                            {
                                backgroundColor: gradientColor
                            }
                        ]}
                    />
                    {/* Additional top gradient for depth */}
                    <View
                        style={[
                            styles.gradientTop,
                            {
                                backgroundColor: hexToRgba(albumColors.detail, 0.15)
                            }
                        ]}
                    />
                    {/* Bottom accent for richness */}
                    <View
                        style={[
                            styles.gradientBottom,
                            {
                                backgroundColor: hexToRgba(albumColors.secondary, 0.2)
                            }
                        ]}
                    />
                </>
            )}

            {/* Album Header */}
            <View style={styles.albumHeader}>
                <View style={styles.coverWrapper}>
                    <ImageWithLoader
                        source={albumCoverUrl ? { uri: albumCoverUrl } : images.placeholder}
                        defaultSource={images.placeholder}
                        style={styles.albumCover}
                        resizeMode="cover"
                    />
                    {/* Enhanced glow effect around album cover */}
                    {albumColors && (
                        <>
                            <View
                                style={[
                                    styles.albumCoverGlow,
                                    {
                                        backgroundColor: albumGlowColor,
                                        shadowColor: albumColors.vibrant,
                                    }
                                ]}
                            />
                            <View
                                style={[
                                    styles.albumCoverGlowOuter,
                                    {
                                        backgroundColor: hexToRgba(albumColors.primary, 0.2),
                                    }
                                ]}
                            />
                        </>
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
            <ImageWithLoader
                source={thumbnailUrl ? { uri: thumbnailUrl } : images.placeholder}
                defaultSource={images.placeholder}
                style={styles.songThumbnail}
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
    ambientGlowCover: {
        position: 'absolute',
        top: -60,
        left: -60,
        width: 220,
        height: 220,
        borderRadius: 110,
        zIndex: -3,
        opacity: 0.6,
    },
    ambientGlowTopRight: {
        position: 'absolute',
        top: -50,
        right: -70,
        width: 250,
        height: 250,
        borderRadius: 125,
        zIndex: -3,
        opacity: 0.4,
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -2,
        opacity: 0.6,
    },
    gradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        zIndex: -2,
        opacity: 0.4,
    },
    gradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '35%',
        zIndex: -2,
        opacity: 0.3,
    },
    albumHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    coverWrapper: {
        borderRadius: 6,
        overflow: 'visible',
        width: 64,
        height: 64,
        position: 'relative',
    },
    albumCover: {
        width: '100%',
        height: '100%',
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    albumCoverGlow: {
        position: 'absolute',
        top: -6,
        left: -6,
        right: -6,
        bottom: -6,
        borderRadius: 12,
        zIndex: -1,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 16,
        elevation: 10,
        opacity: 0.8,
    },
    albumCoverGlowOuter: {
        position: 'absolute',
        top: -12,
        left: -12,
        right: -12,
        bottom: -12,
        borderRadius: 18,
        zIndex: -2,
        opacity: 0.5,
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
    songThumbnail: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 4,
        marginBottom: spacing.xs,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    playingIndicator: {
        position: 'absolute',
        top: spacing.xs + 4,
        right: spacing.xs + 4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accent,
    },
    songTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    songArtist: {
        fontSize: 11,
        color: colors.textSecondary,
    },
});

export default AlbumCard;
