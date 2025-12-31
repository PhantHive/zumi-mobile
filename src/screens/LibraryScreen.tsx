// src/screens/LibraryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMusic } from '../contexts/MusicContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '../services/apiClient';
import { Song } from '../types';
import SongListItem from '../components/SongListItem';
import MiniPlayer from '../components/MiniPlayer';
import { colors, spacing, typography } from '../styles/theme';

type FilterType = 'all' | 'liked' | 'my-uploads';

interface Filter {
    id: FilterType;
    label: string;
    icon: string;
}

const filters: Filter[] = [
    { id: 'all', label: 'All Songs', icon: 'musical-notes' },
    { id: 'liked', label: 'Liked', icon: 'heart' },
    { id: 'my-uploads', label: 'My Uploads', icon: 'cloud-upload' },
];

const LibraryScreen: React.FC = () => {
    const { currentSong } = useMusic();
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadSongs();
    }, [activeFilter]);

    const loadSongs = async () => {
        setIsLoading(true);
        try {
            let response;
            switch (activeFilter) {
                case 'liked':
                    response = await apiClient.getLikedSongs();
                    break;
                case 'my-uploads':
                    response = await apiClient.getMyUploads();
                    break;
                case 'all':
                default:
                    response = await apiClient.getSongs();
                    break;
            }
            setSongs(response.data || []);
            // Check for any 'on-hold' songs uploaded by current user and prompt to edit
            try {
                const all = response.data || [];
                const onHold = all.filter((s: Song) => (s as any).onHold || (s as any).status === 'on-hold');
                const myOnHold = onHold.filter((s: Song) => s.uploadedBy && user && s.uploadedBy === user.email);
                if (myOnHold.length > 0) {
                    // Prompt the user once to edit the first on-hold song
                    setTimeout(() => {
                        const first = myOnHold[0];
                        Alert.alert(
                            'Song On Hold',
                            `One of your uploads "${first.title}" is on hold. Would you like to edit it now?`,
                            [
                                { text: 'Later', style: 'cancel' },
                                { text: 'Edit', onPress: () => navigation.navigate('Upload' as any, { editSong: first }) },
                            ]
                        );
                    }, 400);
                }
            } catch (e) {
                // ignore
            }
        } catch (error) {
            console.error('Failed to load songs:', error);
            setSongs([]);
        } finally {
            setIsLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadSongs();
        setRefreshing(false);
    };

    const handleFilterChange = (filterId: FilterType) => {
        setActiveFilter(filterId);
    };

    const handleLikeToggle = () => {
        // Refresh the list if we're on the liked filter
        if (activeFilter === 'liked') {
            loadSongs();
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.primary, colors.background]}
                style={styles.gradient}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Ionicons name="library" size={32} color={colors.accent} />
                        <View style={styles.headerInfo}>
                            <Text style={styles.title}>Library</Text>
                            <Text style={styles.count}>
                                {songs.length} {songs.length === 1 ? 'song' : 'songs'}
                            </Text>
                        </View>
                    </View>

                    {/* Filters */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.filtersContainer}
                        contentContainerStyle={styles.filtersContent}
                    >
                        {filters.map((filter) => (
                            <TouchableOpacity
                                key={filter.id}
                                style={[
                                    styles.filterChip,
                                    activeFilter === filter.id && styles.filterChipActive,
                                ]}
                                onPress={() => handleFilterChange(filter.id)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={filter.icon as any}
                                    size={18}
                                    color={
                                        activeFilter === filter.id
                                            ? colors.text
                                            : colors.textSecondary
                                    }
                                />
                                <Text
                                    style={[
                                        styles.filterLabel,
                                        activeFilter === filter.id && styles.filterLabelActive,
                                    ]}
                                >
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Songs List */}
                <FlatList
                    data={songs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <SongListItem
                            song={item}
                            isPlaying={currentSong?.id === item.id}
                            onLikeToggle={handleLikeToggle}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.accent}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons
                                name={
                                    activeFilter === 'liked'
                                        ? 'heart-outline'
                                        : activeFilter === 'my-uploads'
                                        ? 'cloud-upload-outline'
                                        : 'musical-notes-outline'
                                }
                                size={64}
                                color={colors.textSecondary}
                                style={styles.emptyIcon}
                            />
                            <Text style={styles.emptyText}>
                                {activeFilter === 'liked'
                                    ? 'No liked songs yet'
                                    : activeFilter === 'my-uploads'
                                    ? 'No uploads yet'
                                    : 'No songs in library'}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                {activeFilter === 'liked'
                                    ? 'Like songs by tapping the heart icon'
                                    : activeFilter === 'my-uploads'
                                    ? 'Upload your first song to get started'
                                    : 'Start by uploading some music'}
                            </Text>
                        </View>
                    }
                />
            </LinearGradient>

            <MiniPlayer />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    gradient: {
        flex: 1,
    },
    header: {
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
        backgroundColor: 'transparent',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    headerInfo: {
        marginLeft: spacing.md,
        flex: 1,
    },
    title: {
        ...typography.h1,
        color: colors.text,
        marginBottom: spacing.xs / 2,
        fontWeight: 'bold',
    },
    count: {
        ...typography.caption,
        color: colors.textSecondary,
        opacity: 0.8,
    },
    filtersContainer: {
        maxHeight: 50,
    },
    filtersContent: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accentLight,
    },
    filterLabel: {
        ...typography.body,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
        fontSize: 14,
        fontWeight: '600',
    },
    filterLabelActive: {
        color: colors.text,
    },
    listContent: {
        paddingBottom: 120, // Space for mini player
        paddingTop: spacing.md,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xxl,
        paddingTop: 60,
    },
    emptyIcon: {
        marginBottom: spacing.lg,
        opacity: 0.5,
    },
    emptyText: {
        ...typography.h3,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    emptySubtext: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        opacity: 0.7,
    },
});

export default LibraryScreen;