// src/components/UpdateModal.tsx
import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UpdateInfo, DownloadProgress } from '../types/update';
import { downloadAndInstallUpdate } from '../services/updateChecker';
import { colors, spacing } from '../styles/theme';
import { formatVersion } from '../utils/version';

interface UpdateModalProps {
    visible: boolean;
    updateInfo: UpdateInfo | null;
    onClose: () => void;
    onUpdateComplete?: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({
    visible,
    updateInfo,
    onClose,
    onUpdateComplete,
}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    if (!updateInfo) return null;

    const handleUpdate = async () => {
        try {
            setIsDownloading(true);
            setError(null);
            setDownloadProgress(0);

            await downloadAndInstallUpdate(
                updateInfo.downloadUrl,
                (progress: DownloadProgress) => {
                    setDownloadProgress(progress.progress);
                }
            );

            // If we reach here, installer was launched
            onUpdateComplete?.();
        } catch (err) {
            console.error('Update failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to download update');
            setIsDownloading(false);
        }
    };

    const handleClose = () => {
        if (!isDownloading && !updateInfo.forceUpdate) {
            onClose();
        }
    };

    const canClose = !updateInfo.forceUpdate && !isDownloading;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="cloud-download-outline" size={48} color={colors.accent} />
                        </View>
                        <Text style={styles.title}>Update Available</Text>
                        <Text style={styles.version}>
                            {formatVersion(updateInfo.version)}
                        </Text>
                    </View>

                    {/* Release Notes */}
                    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionTitle}>What's New:</Text>
                        <Text style={styles.releaseNotes}>{updateInfo.releaseNotes}</Text>

                        <Text style={styles.releaseDate}>
                            Released: {new Date(updateInfo.releaseDate).toLocaleDateString()}
                        </Text>

                        {updateInfo.forceUpdate && (
                            <View style={styles.forceUpdateBanner}>
                                <Ionicons name="warning" size={20} color={colors.error} />
                                <Text style={styles.forceUpdateText}>
                                    This update is required to continue using the app
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Download Progress */}
                    {isDownloading && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${downloadProgress}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {downloadProgress < 100
                                    ? `Downloading... ${downloadProgress}%`
                                    : 'Download complete! Opening installer...'}
                            </Text>
                        </View>
                    )}

                    {/* Error Message */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={20} color={colors.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        {canClose && (
                            <TouchableOpacity
                                style={[styles.button, styles.buttonSecondary]}
                                onPress={handleClose}
                                disabled={isDownloading}
                            >
                                <Text style={styles.buttonSecondaryText}>Later</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.buttonPrimary,
                                canClose && styles.buttonHalf,
                                isDownloading && styles.buttonDisabled
                            ]}
                            onPress={handleUpdate}
                            disabled={isDownloading}
                        >
                            {isDownloading ? (
                                <ActivityIndicator color={colors.text} size="small" />
                            ) : (
                                <>
                                    <Ionicons name="download" size={20} color={colors.text} />
                                    <Text style={styles.buttonPrimaryText}>
                                        {error ? 'Retry Update' : 'Update Now'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContainer: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    iconContainer: {
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    version: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.accent,
    },
    contentScroll: {
        maxHeight: 250,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    releaseNotes: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: spacing.md,
    },
    releaseDate: {
        fontSize: 12,
        color: colors.textSecondary,
        opacity: 0.7,
        marginBottom: spacing.md,
    },
    forceUpdateBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        padding: spacing.md,
        borderRadius: 8,
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    forceUpdateText: {
        flex: 1,
        fontSize: 13,
        color: colors.error,
        fontWeight: '500',
    },
    progressContainer: {
        marginBottom: spacing.lg,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        padding: spacing.md,
        borderRadius: 8,
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: colors.error,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    button: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
    },
    buttonHalf: {
        flex: 1,
    },
    buttonPrimary: {
        backgroundColor: colors.accent,
    },
    buttonPrimaryText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.textSecondary,
    },
    buttonSecondaryText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});

export default UpdateModal;

