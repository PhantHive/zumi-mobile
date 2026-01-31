// src/screens/YouTubeImportScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../styles/theme';
import { searchYouTube } from '../services/youtubeSearchService';
import { importYoutube } from '../services/youtubeImportService';
import { useMusic } from '../contexts/MusicContext';
import { Ionicons } from '@expo/vector-icons';

interface ResultItem {
    id: string;
    title: string;
    uploader: string;
    thumbnail: string;
    durationSeconds: number | null;
    url: string;
}

const MAX_SELECT = 5;

const YouTubeImportScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { refreshSongs } = useMusic();

    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ResultItem[]>([]);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [importing, setImporting] = useState(false);
    const [statuses, setStatuses] = useState<Record<string, 'idle' | 'queued' | 'importing' | 'success' | 'failed'>>({});

    const doSearch = async () => {
        if (!query || !query.trim()) return;
        setLoading(true);
        try {
            const res = await searchYouTube(query, 15);
            setResults(res as any);
        } catch (err: any) {
            console.error('Search error', err);
            Alert.alert('Search failed', err.message || 'Could not search YouTube');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        const currently = Object.keys(selected).filter((k) => selected[k]).length;
        const isSelected = !!selected[id];
        if (!isSelected && currently >= MAX_SELECT) {
            Alert.alert('Selection limit', `You can select up to ${MAX_SELECT} videos per import.`);
            return;
        }
        setSelected((s) => ({ ...s, [id]: !s[id] }));
    };

    const handleImport = async () => {
        const selectedUrls = results.filter((r) => selected[r.id]).map((r) => r.url);
        if (selectedUrls.length === 0) {
            Alert.alert('No selection', 'Select at least one video to import');
            return;
        }
        setImporting(true);
        selectedUrls.forEach((u) => setStatuses((s) => ({ ...s, [u]: 'queued' })));
        try {
            const res = await importYoutube(selectedUrls);
            res.forEach((entry: any) => {
                if (entry.data) {
                    setStatuses((s) => ({ ...s, [entry.url]: 'success' }));
                } else if (entry.error) {
                    setStatuses((s) => ({ ...s, [entry.url]: 'failed' }));
                }
            });

            const anySuccess = res.some((r: any) => !!r.data);
            const anyFailed = res.some((r: any) => !!r.error);
            if (anySuccess) {
                try { await refreshSongs(); } catch (e) { console.warn('refreshSongs failed', e); }
            }

            if (anyFailed && anySuccess) {
                Alert.alert('Partial success', 'Some videos were imported successfully, others failed.');
            } else if (anyFailed) {
                const hasMissingTools = res.some((r: any) => r.error && /ffmpeg|yt-dlp|yt_dlp/i.test(r.error));
                if (hasMissingTools) {
                    Alert.alert('Server missing dependencies', 'The server reported missing tools (ffmpeg or yt-dlp). Please contact the server administrator.');
                } else {
                    Alert.alert('Import failed', 'All selected videos failed to import.');
                }
            } else {
                Alert.alert('Import complete', 'All selected videos were imported successfully.');
                navigation.navigate('Library');
            }
        } catch (err: any) {
            console.error('Import error', err);
            if (err.response && err.response.status === 401) {
                Alert.alert('Authentication required', 'Please sign in to import videos.');
            } else {
                Alert.alert('Import error', err.message || 'An error occurred while importing videos.');
            }
        } finally {
            setImporting(false);
        }
    };

    const renderItem = ({ item }: { item: ResultItem }) => {
        const isSelected = selected[item.id];
        const status = statuses[item.url] || 'idle';
        return (
            <TouchableOpacity style={styles.row} onPress={() => toggleSelect(item.id)}>
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
                ) : (
                    <View style={styles.thumbPlaceholder} />
                )}
                <View style={styles.meta}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.uploader}>{item.uploader}</Text>
                </View>
                <View style={styles.right}>
                    <Text style={styles.duration}>{item.durationSeconds ? `${Math.floor(item.durationSeconds/60)}:${String(item.durationSeconds%60).padStart(2,'0')}` : ''}</Text>
                    {status === 'queued' || status === 'importing' ? (
                        <ActivityIndicator color={colors.accent} />
                    ) : status === 'success' ? (
                        <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />
                    ) : status === 'failed' ? (
                        <Ionicons name="alert-circle" size={20} color="#e74c3c" />
                    ) : (
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.heading}>Import from YouTube</Text>
            </View>

            <View style={styles.searchRow}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search YouTube"
                    placeholderTextColor="#777"
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={doSearch}
                />
                <TouchableOpacity style={styles.searchButton} onPress={doSearch}>
                    <Ionicons name="search" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator style={{ marginTop: spacing.md }} /> : (
                <FlatList
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    style={{ marginTop: spacing.md }}
                    ListEmptyComponent={<Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg }}>No results. Try another query.</Text>}
                />
            )}

            <View style={styles.footer}>
                <Text style={styles.selectedCount}>{Object.keys(selected).filter((k) => selected[k]).length} / {MAX_SELECT} selected</Text>
                <TouchableOpacity style={[styles.importButton, { backgroundColor: importing ? '#444' : colors.accent }]} onPress={handleImport} disabled={importing}>
                    {importing ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Import selected</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center' },
    heading: { ...typography.h2, color: colors.text, marginLeft: spacing.sm, fontSize: 18 },
    searchRow: { flexDirection: 'row', marginTop: spacing.md },
    searchInput: { flex: 1, backgroundColor: '#111', color: '#fff', padding: spacing.sm, borderRadius: 8 },
    searchButton: { marginLeft: spacing.sm, backgroundColor: colors.accent, padding: spacing.sm, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#222' },
    thumbPlaceholder: { width: 92, height: 52, backgroundColor: '#222', borderRadius: 4 },
    thumb: { width: 92, height: 52, borderRadius: 4, marginRight: spacing.sm },
    meta: { flex: 1, paddingHorizontal: spacing.sm },
    title: { color: colors.text, ...typography.h3 },
    uploader: { color: colors.textSecondary, ...typography.caption },
    right: { width: 72, alignItems: 'center', justifyContent: 'center' },
    duration: { color: colors.textSecondary, marginBottom: spacing.xs },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#666' },
    checkboxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
    selectedCount: { color: colors.textSecondary },
    importButton: { padding: spacing.md, borderRadius: 8, minWidth: 160, alignItems: 'center' },
});

export default YouTubeImportScreen;
