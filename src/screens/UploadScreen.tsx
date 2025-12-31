// src/screens/UploadScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Switch,
    ImageBackground,
    Modal,
    FlatList,
    Image,
    Pressable,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../services/apiClient';
import { useMusic } from '../contexts/MusicContext';
import { useAuth } from '../contexts/AuthContext';
import { GENRES, Genre } from '../types';
import { colors, spacing, typography, borderRadius } from '../styles/theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';

const UploadScreen: React.FC = () => {
    const { refreshSongs } = useMusic();
    const { user } = useAuth();
    const route: any = useRoute();
    const navigation: any = useNavigation();
    const [audioFile, setAudioFile] = useState<any>(null);
    const [thumbnail, setThumbnail] = useState<any>(null);
    const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
    const [existingAudioName, setExistingAudioName] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [album, setAlbum] = useState('');
    const [genre, setGenre] = useState<Genre>('K-Pop');
    const [isUploading, setIsUploading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingSongId, setEditingSongId] = useState<number | null>(null);
    // Thumbnail suggestion UI state
    const [suggestionsModalVisible, setSuggestionsModalVisible] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsPage, setSuggestionsPage] = useState(0);
    const [suggestionsQuery, setSuggestionsQuery] = useState('');
    const [hasMoreSuggestions, setHasMoreSuggestions] = useState(true);

    // Enhanced metadata
    const [visibility, setVisibility] = useState<'public' | 'private'>('public');
    const [year, setYear] = useState('');
    const [bpm, setBpm] = useState('');
    const [mood, setMood] = useState('');
    const [language, setLanguage] = useState('');
    const [tags, setTags] = useState('');

    // helper to build default suggestion query
    const buildSuggestionQuery = (t?: string, a?: string) => {
        const parts = [] as string[];
        if (t && t.trim()) parts.push(t.trim());
        if (a && a.trim()) parts.push(a.trim());
        parts.push('album cover');
        return parts.join(' ');
    };

    const pickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
            });

            if (!result.canceled && result.assets[0]) {
                setAudioFile(result.assets[0]);
                // If user selects a new audio file, clear any existing audio name from edit mode
                setExistingAudioName(null);
                if (!title) {
                    setTitle(result.assets[0].name.replace(/\.[^/.]+$/, ''));
                }
            }
        } catch (error) {
            console.error('Error picking audio:', error);
        }
    };

    const pickThumbnail = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                // If user selects a new thumbnail, clear any existing thumbnail URL from edit mode
                setExistingThumbnailUrl(null);
                setThumbnail(result.assets[0]);
            }
        } catch (error) {
            console.error('Error picking thumbnail:', error);
        }
    };

    // Open suggestions modal and initialize query + first fetch
    const openSuggestions = () => {
        const q = buildSuggestionQuery(title, artist);
        setSuggestionsQuery(q);
        setSuggestions([]);
        setSuggestionsPage(0);
        setHasMoreSuggestions(true);
        setSuggestionsModalVisible(true);
        fetchSuggestions(q, 0);
    };

    // Fetch image suggestions from DuckDuckGo i.js endpoint (client-side). Paginate using 's' offset.
    const fetchSuggestions = async (query: string, page: number = 0) => {
        if (suggestionsLoading || !hasMoreSuggestions) return;
        setSuggestionsLoading(true);
        try {
            // DuckDuckGo returns up to ~100 results starting from offset 's'
            const offset = page * 100;
            const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&s=${offset}`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
            const data = await res.json();
            const items = data.results || data; // fallback
            if (!items || items.length === 0) {
                setHasMoreSuggestions(false);
            } else {
                setSuggestions(prev => [...prev, ...items]);
                setSuggestionsPage(page + 1);
                // If less than page size, no more
                if (items.length < 100) setHasMoreSuggestions(false);
            }
        } catch (err) {
            console.warn('fetchSuggestions error', err);
            setHasMoreSuggestions(false);
        } finally {
            setSuggestionsLoading(false);
        }
    };

    // Download the selected image to local cache and set as thumbnail object compatible with upload
    const downloadImageAndSetThumbnail = async (imageUrl: string) => {
        try {
            setSuggestionsModalVisible(false);
            // prepare filename
            const ts = Date.now();
            const extMatch = imageUrl.match(/\.([a-zA-Z0-9]{3,4})(?:\?|$)/);
            const ext = extMatch ? extMatch[1] : 'jpg';
            const filename = `thumb-${ts}.${ext}`;
            const fileUri = `${FileSystem.cacheDirectory}${filename}`;

            const downloadRes = await FileSystem.downloadAsync(imageUrl, fileUri);
            if (downloadRes && downloadRes.status !== 200 && !downloadRes?.uri) {
                console.warn('Download error', downloadRes);
            }

            // Set thumbnail to object similar to ImagePicker asset
            const localThumb: any = { uri: downloadRes.uri || fileUri, name: filename, type: 'image/jpeg' };
            setExistingThumbnailUrl(null);
            setThumbnail(localThumb);
        } catch (err) {
            console.error('Failed to download image', err);
            Alert.alert('Error', 'Failed to download selected thumbnail.');
        }
    };

    const handleUpload = async () => {
        try {
            setIsUploading(true);

            // If in edit mode, call updateSong (PATCH). If files present, use FormData; otherwise send JSON metadata.
            if (isEditMode && editingSongId) {
                // Build either FormData or JSON
                const hasFiles = !!audioFile || !!thumbnail;
                if (hasFiles) {
                    const formData = new FormData();
                    if (audioFile) {
                        formData.append('audio', {
                            uri: audioFile.uri,
                            type: audioFile.mimeType || 'audio/mpeg',
                            name: audioFile.name,
                        } as any);
                    }
                    if (thumbnail) {
                        formData.append('thumbnail', {
                            uri: thumbnail.uri,
                            type: 'image/jpeg',
                            name: 'thumbnail.jpg',
                        } as any);
                    }

                    if (title) formData.append('title', title);
                    if (artist) formData.append('artist', artist);
                    if (album) formData.append('album', album);
                    if (genre) formData.append('genre', genre);
                    formData.append('visibility', visibility);
                    if (year) formData.append('year', year);
                    if (bpm) formData.append('bpm', bpm);
                    if (mood) formData.append('mood', mood);
                    if (language) formData.append('language', language);
                    if (tags) formData.append('tags', tags);

                    await apiClient.updateSong(editingSongId, formData);
                } else {
                    // JSON metadata only
                    const payload: any = {};
                    if (title) payload.title = title;
                    if (artist) payload.artist = artist;
                    if (album) payload.album = album;
                    if (genre) payload.genre = genre;
                    payload.visibility = visibility;
                    if (year) payload.year = parseInt(year, 10);
                    if (bpm) payload.bpm = parseInt(bpm, 10);
                    if (mood) payload.mood = mood;
                    if (language) payload.language = language;
                    if (tags) payload.tags = tags;

                    await apiClient.updateSong(editingSongId, payload);
                }

                await refreshSongs();
                Alert.alert('Success', 'Song updated successfully!');
                // Exit edit mode and reset form
                setIsEditMode(false);
                setEditingSongId(null);
                navigation.navigate('Library');
            } else {
                // New upload requires audio file
                if (!audioFile) {
                    Alert.alert('Error', 'Please select an audio file');
                    return;
                }

                const formData = new FormData();
                formData.append('audio', {
                    uri: audioFile.uri,
                    type: audioFile.mimeType || 'audio/mpeg',
                    name: audioFile.name,
                } as any);

                if (thumbnail) {
                    formData.append('thumbnail', {
                        uri: thumbnail.uri,
                        type: 'image/jpeg',
                        name: 'thumbnail.jpg',
                    } as any);
                }

                formData.append('title', title || audioFile.name);
                formData.append('artist', artist || 'Unknown Artist');
                formData.append('album', album || 'Unknown Album');
                formData.append('genre', genre);

                // Enhanced metadata
                formData.append('visibility', visibility);
                formData.append('uploadedBy', user?.email || '');
                if (year) formData.append('year', year);
                if (bpm) formData.append('bpm', bpm);
                if (mood) formData.append('mood', mood);
                if (language) formData.append('language', language);
                if (tags) formData.append('tags', tags);

                await apiClient.uploadSong(formData);
                await refreshSongs();

                // Reset form
                setAudioFile(null);
                setThumbnail(null);
                setTitle('');
                setArtist('');
                setAlbum('');
                setGenre('K-Pop');
                setVisibility('public');
                setYear('');
                setBpm('');
                setMood('');
                setLanguage('');
                setTags('');

                Alert.alert('Success', 'Song uploaded successfully!');
            }
        } catch (error) {
            console.error('Upload/Update error:', error);
            Alert.alert('Error', 'Failed to upload/update song. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    // If route params include editSong, prefill fields
    useEffect(() => {
        try {
            const params = route?.params || {};
            const editSong = params.editSong;
            if (editSong) {
                setIsEditMode(true);
                setEditingSongId(editSong.id);
                setTitle(editSong.title || '');
                setArtist(editSong.artist || '');
                setAlbum(editSong.albumId || '');
                setGenre(editSong.genre || 'K-Pop');
                setVisibility(editSong.visibility || 'public');
                setYear(editSong.year ? String(editSong.year) : '');
                setBpm(editSong.bpm ? String(editSong.bpm) : '');
                setMood(editSong.mood || '');
                setLanguage(editSong.language || '');
                setTags(editSong.tags ? (Array.isArray(editSong.tags) ? editSong.tags.join(',') : editSong.tags) : '');

                // Show existing thumbnail (URL) and existing audio filename for edit mode
                if (editSong.thumbnailUrl) {
                    // Try fetching a data-URL with auth first (handles protected thumbnails). Fall back to public URL.
                    (async () => {
                        try {
                            const dataUrl = await apiClient.getThumbnailUrlWithAuth(editSong.thumbnailUrl);
                            if (dataUrl) {
                                setExistingThumbnailUrl(dataUrl);
                                return;
                            }
                        } catch (e) {
                            // ignore and fall back to public URL
                        }

                        try {
                            setExistingThumbnailUrl(apiClient.getThumbnailUrl(editSong.thumbnailUrl));
                        } catch (e) {
                            console.warn('Failed to build thumbnail URL for editSong', e);
                        }
                    })();
                }

                if (editSong.filepath) {
                    const parts = editSong.filepath.split('/');
                    setExistingAudioName(parts[parts.length - 1] || editSong.filepath);
                }
            }
        } catch (e) {
            // ignore
        }
    }, [route]);

    const clearForm = () => {
        setAudioFile(null);
        setThumbnail(null);
        setExistingThumbnailUrl(null);
        setExistingAudioName(null);
        setTitle('');
        setArtist('');
        setAlbum('');
        setGenre('K-Pop');
        setVisibility('public');
        setYear('');
        setBpm('');
        setMood('');
        setLanguage('');
        setTags('');
        // exit edit mode if we were editing
        setIsEditMode(false);
        setEditingSongId(null);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Upload Music</Text>

            {/* Audio/Thumbnail Pickers with optional thumbnail background */}
            {/* Show selected thumbnail (thumbnail) or existing thumbnail from song (existingThumbnailUrl) */}
            {(thumbnail || existingThumbnailUrl) ? (
                <ImageBackground source={{ uri: thumbnail?.uri ?? existingThumbnailUrl! }} style={styles.thumbnailBackground} imageStyle={{ borderRadius: borderRadius.md }}>
                    <View style={styles.thumbnailOverlay} />
                    <View style={styles.pickersRow}>
                        <TouchableOpacity
                            style={[styles.fileButton, styles.fileButtonOverlay]}
                            onPress={pickAudio}
                            disabled={isUploading}
                        >
                            <Ionicons name="musical-notes" size={24} color={colors.text} />
                            <Text style={styles.fileButtonText}>
                                {audioFile ? audioFile.name : (existingAudioName ? existingAudioName : 'Choose Audio File')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.fileButton, styles.fileButtonOverlay]}
                            onPress={() => {
                                // Offer both options: pick from library or get suggestions when editing
                                if (isEditMode) {
                                    // Open a simple action: show suggestions modal
                                    openSuggestions();
                                } else {
                                    pickThumbnail();
                                }
                            }}
                            disabled={isUploading}
                        >
                            <Ionicons name="image" size={24} color={colors.text} />
                            <Text style={styles.fileButtonText}>
                                {(thumbnail || existingThumbnailUrl) ? 'Thumbnail Selected' : (isEditMode ? 'Suggest / Choose Thumbnail' : 'Choose Thumbnail (Optional)')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* If an audio file is selected, show its filename nicely over the thumbnail */}
                    {(audioFile || existingAudioName) && (
                        <Text style={styles.audioNameOnThumbnail} numberOfLines={1} ellipsizeMode="middle">
                            {audioFile ? audioFile.name : existingAudioName}
                        </Text>
                    )}
                </ImageBackground>
            ) : (
                <View>
                    <TouchableOpacity
                        style={styles.fileButton}
                        onPress={pickAudio}
                        disabled={isUploading}
                    >
                        <Ionicons name="musical-notes" size={24} color={colors.text} />
                        <Text style={styles.fileButtonText}>
                            {audioFile ? audioFile.name : (existingAudioName ? existingAudioName : 'Choose Audio File')}
                        </Text>
                    </TouchableOpacity>
                    {(audioFile || existingAudioName) && <Text style={styles.fileNameText}>{audioFile ? audioFile.name : existingAudioName}</Text>}

                    <TouchableOpacity
                        style={styles.fileButton}
                        onPress={() => { if (isEditMode) openSuggestions(); else pickThumbnail(); }}
                        disabled={isUploading}
                    >
                        <Ionicons name="image" size={24} color={colors.text} />
                        <Text style={styles.fileButtonText}>
                            {(thumbnail || existingThumbnailUrl) ? 'Thumbnail Selected' : 'Choose Thumbnail (Optional)'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Basic Info Section */}
            <Text style={styles.sectionTitle}>Basic Information</Text>

            {/* Title Input */}
            <TextInput
                style={styles.input}
                placeholder="Song Title"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                editable={!isUploading}
            />

            {/* Artist Input */}
            <TextInput
                style={styles.input}
                placeholder="Artist Name"
                placeholderTextColor={colors.textSecondary}
                value={artist}
                onChangeText={setArtist}
                editable={!isUploading}
            />

            {/* Album Input */}
            <TextInput
                style={styles.input}
                placeholder="Album Name"
                placeholderTextColor={colors.textSecondary}
                value={album}
                onChangeText={setAlbum}
                editable={!isUploading}
            />

            {/* Genre Selector */}
            <View style={styles.genreContainer}>
                <Text style={styles.label}>Genre</Text>
                <View style={styles.genreButtons}>
                    {GENRES.map((g) => (
                        <TouchableOpacity
                            key={g}
                            style={[
                                styles.genreButton,
                                genre === g ? styles.genreButtonActive : null,
                            ]}
                            onPress={() => setGenre(g)}
                            disabled={isUploading}
                        >
                            <Text
                                style={[
                                    styles.genreButtonText,
                                    genre === g ? styles.genreButtonTextActive : null,
                                ]}
                            >
                                {g}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Visibility Toggle */}
            <View style={styles.visibilityContainer}>
                <View style={styles.visibilityInfo}>
                    <Ionicons
                        name={visibility === 'public' ? 'globe' : 'lock-closed'}
                        size={20}
                        color={colors.accent}
                    />
                    <Text style={styles.label}>
                        {visibility === 'public' ? 'Public' : 'Private'}
                    </Text>
                </View>
                <Switch
                    value={visibility === 'public'}
                    onValueChange={(value) => setVisibility(value ? 'public' : 'private')}
                    trackColor={{ false: colors.card, true: colors.accent }}
                    thumbColor={colors.text}
                    disabled={isUploading}
                />
            </View>
            <Text style={styles.visibilityDescription}>
                {visibility === 'public'
                    ? 'Everyone can see and play this song'
                    : 'Only you can see and play this song'}
            </Text>

            {/* Enhanced Metadata Section */}
            <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>

            <View style={styles.row}>
                <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Year"
                    placeholderTextColor={colors.textSecondary}
                    value={year}
                    onChangeText={setYear}
                    keyboardType="numeric"
                    editable={!isUploading}
                />
                <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="BPM"
                    placeholderTextColor={colors.textSecondary}
                    value={bpm}
                    onChangeText={setBpm}
                    keyboardType="numeric"
                    editable={!isUploading}
                />
            </View>

            <TextInput
                style={styles.input}
                placeholder="Mood (e.g., Happy, Melancholic, Energetic)"
                placeholderTextColor={colors.textSecondary}
                value={mood}
                onChangeText={setMood}
                editable={!isUploading}
            />

            <TextInput
                style={styles.input}
                placeholder="Language"
                placeholderTextColor={colors.textSecondary}
                value={language}
                onChangeText={setLanguage}
                editable={!isUploading}
            />

            <TextInput
                style={styles.input}
                placeholder="Tags (comma-separated)"
                placeholderTextColor={colors.textSecondary}
                value={tags}
                onChangeText={setTags}
                editable={!isUploading}
            />

            {/* Action row: Cancel + Upload/Update */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.cancelButton, isUploading ? styles.uploadButtonDisabled : null]}
                    onPress={clearForm}
                    disabled={isUploading}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.uploadButton, isUploading ? styles.uploadButtonDisabled : null]}
                    onPress={handleUpload}
                    disabled={isUploading || (!isEditMode && !audioFile)}
                >
                    {isUploading ? (
                        <ActivityIndicator color={colors.text} />
                    ) : (
                        <>
                            <Ionicons name={isEditMode ? 'save' : 'cloud-upload'} size={24} color={colors.text} />
                            <Text style={styles.uploadButtonText}>{isEditMode ? 'Update Song' : 'Upload Song'}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Suggestions Modal */}
            <Modal visible={suggestionsModalVisible} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.md }}>
                    <View style={{ backgroundColor: colors.card, borderRadius: borderRadius.md, flex: 1, padding: spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                            <TextInput
                                style={{ flex: 1, backgroundColor: colors.background, color: colors.text, padding: spacing.sm, borderRadius: borderRadius.sm }}
                                value={suggestionsQuery}
                                onChangeText={setSuggestionsQuery}
                                placeholder={'Search thumbnails...'}
                                placeholderTextColor={colors.textSecondary}
                            />
                            <TouchableOpacity onPress={() => { setSuggestions([]); setSuggestionsPage(0); setHasMoreSuggestions(true); fetchSuggestions(suggestionsQuery, 0); }} style={{ marginLeft: spacing.sm }}>
                                <Text style={{ color: colors.accent, fontWeight: '600' }}>Search</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setSuggestionsModalVisible(false)} style={{ marginLeft: spacing.sm }}>
                                <Text style={{ color: colors.textSecondary }}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Highlight top 3 suggestions */}
                        <Text style={{ ...typography.body, color: colors.text, fontWeight: '700', marginBottom: spacing.sm }}>Top Picks</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                            {suggestions.slice(0, 3).map((it, idx) => (
                                <Pressable key={idx} onPress={() => downloadImageAndSetThumbnail(it.image || it.thumbnail)} style={{ marginRight: spacing.sm }}>
                                    <Image source={{ uri: it.thumbnail || it.image }} style={{ width: 140, height: 140, borderRadius: borderRadius.sm }} />
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm }}>More results</Text>
                        <FlatList
                            data={suggestions}
                            keyExtractor={(item, index) => String(item?.image || item?.thumbnail || index)}
                            renderItem={({ item }) => (
                                <Pressable onPress={() => downloadImageAndSetThumbnail(item.image || item.thumbnail)} style={{ marginBottom: spacing.sm }}>
                                    <Image source={{ uri: item.thumbnail || item.image }} style={{ width: '100%', height: 120, borderRadius: borderRadius.sm }} />
                                </Pressable>
                            )}
                            onEndReached={() => { if (hasMoreSuggestions) fetchSuggestions(suggestionsQuery, suggestionsPage); }}
                            onEndReachedThreshold={0.5}
                        />
                        {suggestionsLoading && <ActivityIndicator style={{ marginTop: spacing.sm }} />}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.lg,
        paddingTop: spacing.xxl * 2,
    },
    title: {
        ...typography.h1,
        color: colors.text,
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.body,
        color: colors.accent,
        fontWeight: '600',
        marginTop: spacing.lg,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        fontSize: 12,
    },
    fileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    fileButtonText: {
        ...typography.body,
        color: colors.text,
        flex: 1,
    },
    input: {
        backgroundColor: colors.card,
        color: colors.text,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        ...typography.body,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfInput: {
        flex: 1,
    },
    genreContainer: {
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.body,
        color: colors.text,
        marginBottom: spacing.sm,
        fontWeight: '600',
    },
    genreButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    genreButton: {
        backgroundColor: colors.card,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    genreButtonActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accentLight,
    },
    genreButtonText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    genreButtonTextActive: {
        color: colors.text,
        fontWeight: '600',
    },
    visibilityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    visibilityInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    visibilityDescription: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.md,
        marginLeft: spacing.sm,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.lg,
        gap: spacing.sm,
        flex: 1,
        marginLeft: spacing.sm,
    },
    uploadButtonDisabled: {
        opacity: 0.5,
    },
    uploadButtonText: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
    },
    // New styles for thumbnail background, file name, and action row
    thumbnailBackground: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    thumbnailOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: borderRadius.md,
    },
    pickersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: spacing.md,
        gap: spacing.md,
    },
    fileButtonOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        borderColor: colors.text,
        borderWidth: 1,
    },
    fileNameText: {
        ...typography.body,
        color: colors.text,
        marginTop: spacing.xs,
        marginLeft: spacing.md,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginRight: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        ...typography.body,
        color: colors.accent,
        fontWeight: '600',
    },
    audioNameOnThumbnail: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        color: colors.text,
        ...typography.body,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default UploadScreen;

