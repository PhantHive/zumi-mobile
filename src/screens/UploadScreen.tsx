// src/screens/UploadScreen.tsx
import React, { useState } from 'react';
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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../services/apiClient';
import { useMusic } from '../contexts/MusicContext';
import { useAuth } from '../contexts/AuthContext';
import { GENRES, Genre } from '../types';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

const UploadScreen: React.FC = () => {
    const { refreshSongs } = useMusic();
    const { user } = useAuth();
    const [audioFile, setAudioFile] = useState<any>(null);
    const [thumbnail, setThumbnail] = useState<any>(null);
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [album, setAlbum] = useState('');
    const [genre, setGenre] = useState<Genre>('K-Pop');
    const [isUploading, setIsUploading] = useState(false);

    // Enhanced metadata
    const [visibility, setVisibility] = useState<'public' | 'private'>('public');
    const [year, setYear] = useState('');
    const [bpm, setBpm] = useState('');
    const [mood, setMood] = useState('');
    const [language, setLanguage] = useState('');
    const [tags, setTags] = useState('');

    const pickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
            });

            if (!result.canceled && result.assets[0]) {
                setAudioFile(result.assets[0]);
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
                setThumbnail(result.assets[0]);
            }
        } catch (error) {
            console.error('Error picking thumbnail:', error);
        }
    };

    const handleUpload = async () => {
        if (!audioFile) {
            Alert.alert('Error', 'Please select an audio file');
            return;
        }

        try {
            setIsUploading(true);

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
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', 'Failed to upload song. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Upload Music</Text>

            {/* Audio File Picker */}
            <TouchableOpacity
                style={styles.fileButton}
                onPress={pickAudio}
                disabled={isUploading}
            >
                <Ionicons name="musical-notes" size={24} color={colors.text} />
                <Text style={styles.fileButtonText}>
                    {audioFile ? audioFile.name : 'Choose Audio File'}
                </Text>
            </TouchableOpacity>

            {/* Thumbnail Picker */}
            <TouchableOpacity
                style={styles.fileButton}
                onPress={pickThumbnail}
                disabled={isUploading}
            >
                <Ionicons name="image" size={24} color={colors.text} />
                <Text style={styles.fileButtonText}>
                    {thumbnail ? 'Thumbnail Selected' : 'Choose Thumbnail (Optional)'}
                </Text>
            </TouchableOpacity>

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

            {/* Upload Button */}
            <TouchableOpacity
                style={[styles.uploadButton, isUploading ? styles.uploadButtonDisabled : null]}
                onPress={handleUpload}
                disabled={isUploading || !audioFile}
            >
                {isUploading ? (
                    <ActivityIndicator color={colors.text} />
                ) : (
                    <>
                        <Ionicons name="cloud-upload" size={24} color={colors.text} />
                        <Text style={styles.uploadButtonText}>Upload Song</Text>
                    </>
                )}
            </TouchableOpacity>
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
    },
    uploadButtonDisabled: {
        opacity: 0.5,
    },
    uploadButtonText: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
    },
});

export default UploadScreen;