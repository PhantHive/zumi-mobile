// src/screens/LibraryScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
} from 'react-native';
import { useMusic } from '../contexts/MusicContext';
import { Song } from '../types';
import SongListItem from '../components/SongListItem';
import MiniPlayer from '../components/MiniPlayer';
import { colors, spacing, typography } from '../styles/theme';

const LibraryScreen: React.FC = () => {
    const { albums, currentSong } = useMusic();
    const [searchQuery, setSearchQuery] = useState('');

    const allSongs: Song[] = albums.flatMap((album: { name: string; songs: Song[] }) => album.songs);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Library</Text>
                <Text style={styles.count}>{allSongs.length} songs</Text>
            </View>

            <FlatList
                data={allSongs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <SongListItem song={item} isPlaying={currentSong?.id === item.id} />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No songs in library</Text>
                    </View>
                }
            />

            <MiniPlayer />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: spacing.lg,
        paddingTop: spacing.xl,
        backgroundColor: colors.primary,
    },
    title: {
        ...typography.h1,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    count: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    listContent: {
        paddingBottom: 100, // Space for mini player
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xxl,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
    },
});

export default LibraryScreen;