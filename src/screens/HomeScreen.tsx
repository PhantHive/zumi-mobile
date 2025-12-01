// src/screens/HomeScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic } from '../contexts/MusicContext';
import { useAuth } from '../contexts/AuthContext';
import AlbumCard from '../components/AlbumCard';
import MiniPlayer from '../components/MiniPlayer';
import ZumiAssistant from '../components/ZumiAssistant';
import { colors, spacing, typography } from '../styles/theme';

const HomeScreen: React.FC = () => {
    const { user } = useAuth();
    const { albums, refreshSongs } = useMusic();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshSongs();
        setRefreshing(false);
    };

    const handleUserActivity = () => {
        // This will be called by ZumiAssistant when user activity is detected
    };


    return (
        <View
            style={styles.container}
            onStartShouldSetResponder={() => true}
            onResponderGrant={handleUserActivity}
            onResponderMove={handleUserActivity}
        >
            <LinearGradient
                colors={[colors.primary, colors.background]}
                style={styles.gradient}
            >
                {/* Zumi Assistant - Fixed Position Overlay */}
                <ZumiAssistant onUserActivity={handleUserActivity} />

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.accent}
                        />
                    }
                    onTouchStart={handleUserActivity}
                    onScrollBeginDrag={handleUserActivity}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.greeting}>
                            Konnichiwa,{' '}
                            <Text style={styles.nameAccent}>{user?.name}</Text>!
                        </Text>
                        <Text style={styles.subtitle}>What would you like to hear?</Text>
                    </View>

                    {/* Albums Grid */}
                    <View style={styles.albumsSection}>
                        <Text style={styles.sectionTitle}>Your Music</Text>
                        {albums.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No music yet!</Text>
                                <Text style={styles.emptySubtext}>
                                    Upload some songs to get started
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.albumsGrid}>
                                {albums.map((album, index) => (
                                    <AlbumCard key={album.id} album={album} index={index} />
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Mini Player */}
                <MiniPlayer />
            </LinearGradient>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingTop: spacing.lg,
        paddingBottom: 120,
    },
    header: {
        marginBottom: spacing.lg,
    },
    greeting: {
        ...typography.h1,
        fontSize: 28,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    nameAccent: {
        color: colors.accent,
    },
    subtitle: {
        ...typography.body,
        fontSize: 15,
        color: colors.textSecondary,
    },
    albumsSection: {
        marginTop: spacing.md,
    },
    sectionTitle: {
        ...typography.h2,
        fontSize: 20,
        color: colors.text,
        marginBottom: spacing.md,
        fontWeight: '700',
    },
    albumsGrid: {
        gap: spacing.md,
    },
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.xl,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: spacing.xxl,
        padding: spacing.xl,
    },
    emptyText: {
        ...typography.h3,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    emptySubtext: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});

export default HomeScreen;