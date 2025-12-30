// src/screens/YouTubeSearchScreen.tsx
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services';
import { useMusic } from '@/contexts';
import { YouTubeSearchResult } from '@/types';
import ImageWithLoader from '../components/ImageWithLoader';
import { colors, spacing, typography, borderRadius } from '@/styles';

const YouTubeSearchScreen: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<YouTubeSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
    const [successVisible, setSuccessVisible] = useState(false);
    const [successText, setSuccessText] = useState('');
    const successOpacity = useRef(new Animated.Value(0)).current;
    const { refreshSongs } = useMusic();

    const handleSearch = async () => {
        if (!query.trim()) return;
        console.log('YouTubeSearchScreen: handleSearch called with query:', query);
        setIsSearching(true);
        try {
            const response = await apiClient.searchYouTube(query);
            console.log('YouTubeSearchScreen: searchYouTube response length:', response?.data?.length ?? 0);
            setResults(response.data);
        } catch (error) {
            console.error('YouTubeSearchScreen: search error', error);
            Alert.alert('Search Failed', 'Could not search YouTube. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleDownloadAndUpload = async (video: YouTubeSearchResult) => {
        console.log('YouTubeSearchScreen: handleDownloadAndUpload for videoId:', video.videoId, 'title:', video.title);
        // Add to downloading set
        setDownloadingIds(prev => new Set(prev).add(video.videoId));

        try {
            // Step 1: Download from YouTube
            const downloadResult = await apiClient.downloadFromYouTube(video.videoId);
            console.log('YouTubeSearchScreen: downloadFromYouTube response:', JSON.stringify(downloadResult));
            console.log('YouTubeSearchScreen: api base url:', apiClient.getBaseUrl());

            // Step 2: Fetch the files from backend
            const audioUrl = `${apiClient.getBaseUrl()}${downloadResult.audioPath}`;
            console.log('YouTubeSearchScreen: fetching audio at', audioUrl);
            const audioResponse = await fetch(audioUrl);
            console.log('YouTubeSearchScreen: audio fetch status:', audioResponse.status, 'ok:', audioResponse.ok);
            if (!audioResponse.ok) {
                const text = await audioResponse.text().catch(() => '<no-text>');
                throw new Error(`Audio fetch failed: ${audioResponse.status} - ${text}`);
            }
            const audioBlob = await audioResponse.blob();
            console.log('YouTubeSearchScreen: audio blob size (bytes):', (audioBlob as any)?.size ?? '<unknown>');

            const thumbnailUrl = `${apiClient.getBaseUrl()}${downloadResult.thumbnailPath}`;
            console.log('YouTubeSearchScreen: fetching thumbnail at', thumbnailUrl);
            const thumbnailResponse = await fetch(thumbnailUrl);
            console.log('YouTubeSearchScreen: thumbnail fetch status:', thumbnailResponse.status, 'ok:', thumbnailResponse.ok);
            if (!thumbnailResponse.ok) {
                const text = await thumbnailResponse.text().catch(() => '<no-text>');
                throw new Error(`Thumbnail fetch failed: ${thumbnailResponse.status} - ${text}`);
            }
            const thumbnailBlob = await thumbnailResponse.blob();
            console.log('YouTubeSearchScreen: thumbnail blob size (bytes):', (thumbnailBlob as any)?.size ?? '<unknown>');

            // Step 3: Create FormData
            const formData = new FormData();
            formData.append('audio', {
                uri: downloadResult.audioPath,
                type: 'audio/mpeg',
                name: 'audio.mp3',
            } as any);

            formData.append('thumbnail', {
                uri: downloadResult.thumbnailPath,
                type: 'image/jpeg',
                name: 'thumbnail.jpg',
            } as any);

            formData.append('title', downloadResult.metadata.title);
            formData.append('artist', downloadResult.metadata.artist);
            formData.append('album', 'YouTube Import');
            formData.append('genre', 'K-Pop'); // Default genre
            formData.append('visibility', 'public');

            console.log('YouTubeSearchScreen: prepared upload metadata:', {
                title: downloadResult.metadata.title,
                artist: downloadResult.metadata.artist,
                duration: downloadResult.metadata.duration,
                audioPath: downloadResult.audioPath,
                thumbnailPath: downloadResult.thumbnailPath,
            });

            // Step 4: Upload to your server
            await apiClient.uploadSong(formData);

            // Step 5: Refresh library
            await refreshSongs();

            // Show success animation instead of blocking alert
            setSuccessText(`Added: ${video.title}`);
            setSuccessVisible(true);
            Animated.timing(successOpacity, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start(() => {
                setTimeout(() => {
                    Animated.timing(successOpacity, {
                        toValue: 0,
                        duration: 400,
                        easing: Easing.in(Easing.cubic),
                        useNativeDriver: true,
                    }).start(() => setSuccessVisible(false));
                }, 900);
            });
        } catch (error) {
            console.error('YouTubeSearchScreen: Download/upload error:', error);
            Alert.alert('Upload Failed', 'Could not download or upload this video. Please try another.');
        } finally {
            // Remove from downloading set
            setDownloadingIds(prev => {
                const next = new Set(prev);
                next.delete(video.videoId);
                return next;
            });
        }
    };

    return (
        <View style={styles.container}>
            {/* Success overlay */}
            {successVisible && (
                <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]} pointerEvents="none">
                    <View style={styles.successBox}>
                        <Ionicons name="checkmark-circle" size={56} color={colors.success} />
                        <Text style={styles.successText} numberOfLines={1}>{successText}</Text>
                    </View>
                </Animated.View>
            )}
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search YouTube..."
                        placeholderTextColor={colors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                    disabled={isSearching || !query.trim()}
                >
                    {isSearching ? (
                        <ActivityIndicator color={colors.text} size="small" />
                    ) : (
                        <Text style={styles.searchButtonText}>Search</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Results List */}
            <FlatList
                data={results}
                keyExtractor={(item) => item.videoId}
                renderItem={({ item }) => (
                    <ResultCard
                        video={item}
                        isDownloading={downloadingIds.has(item.videoId)}
                        onAdd={() => handleDownloadAndUpload(item)}
                    />
                )}
                ListEmptyComponent={
                    !isSearching && (
                        <View style={styles.emptyState}>
                            <Ionicons name="logo-youtube" size={64} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>
                                {query ? 'No results found' : 'Search for music on YouTube'}
                            </Text>
                        </View>
                    )
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

// Result Card Component
const ResultCard: React.FC<{
    video: YouTubeSearchResult;
    isDownloading: boolean;
    onAdd: () => void;
}> = ({ video, isDownloading, onAdd }) => {
    return (
        <View style={styles.resultCard}>
            <ImageWithLoader
                source={{ uri: video.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
            />

            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={2}>
                    {video.title}
                </Text>
                <Text style={styles.resultChannel} numberOfLines={1}>
                    {video.channelName}
                </Text>
                <Text style={styles.resultDuration}>{video.duration}</Text>
            </View>

            <TouchableOpacity
                style={[styles.addButton, isDownloading && styles.addButtonDisabled]}
                onPress={onAdd}
                disabled={isDownloading}
            >
                {isDownloading ? (
                    <ActivityIndicator color={colors.text} size="small" />
                ) : (
                    <Ionicons name="add-circle" size={32} color={colors.accent} />
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchContainer: {
        flexDirection: 'row',
        padding: spacing.lg,
        paddingTop: spacing.xxl * 2,
        gap: spacing.sm,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        paddingVertical: spacing.md,
        fontSize: 16,
    },
    searchButton: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        minWidth: 80,
    },
    searchButtonText: {
        color: colors.text,
        fontWeight: '600',
        textAlign: 'center',
    },
    listContent: {
        padding: spacing.lg,
        paddingBottom: 120,
    },
    resultCard: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        alignItems: 'center',
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.sm,
        marginRight: spacing.md,
    },
    resultInfo: {
        flex: 1,
    },
    resultTitle: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
        marginBottom: spacing.xs / 2,
    },
    resultChannel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs / 2,
    },
    resultDuration: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 11,
    },
    addButton: {
        padding: spacing.sm,
    },
    addButtonDisabled: {
        opacity: 0.5,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: spacing.xxl * 2,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.lg,
    },
    successOverlay: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 50,
    },
    successBox: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    successText: {
        color: colors.text,
        marginLeft: spacing.sm,
        maxWidth: 240,
    },
});

export default YouTubeSearchScreen;
