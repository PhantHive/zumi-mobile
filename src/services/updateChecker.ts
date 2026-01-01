// src/services/updateChecker.ts
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { UpdateInfo, UpdateCheckResult, DownloadProgress } from '../types/update';
import { isNewerVersion } from '../utils/version';
import env from '../config/env';

const UPDATE_CHECK_URL = `${env.api.baseUrl}/mobile/version`;

/**
 * Get current app version from Constants or package.json
 */
export const getCurrentVersion = (): string => {
    // Try to get from expo config first
    const version = Constants.expoConfig?.version || '1.0.0';
    return version;
};

/**
 * Check if an update is available
 */
export const checkForUpdates = async (): Promise<UpdateCheckResult> => {
    try {
        console.log('🔍 Checking for updates...');
        const currentVersion = Application.nativeApplicationVersion || '1.0.0';
        console.log('📱 Current version:', currentVersion);

        // Only check on Android
        if (Platform.OS !== 'android') {
            return { hasUpdate: false, updateInfo: null };
        }

        // Add longer timeout for update check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(UPDATE_CHECK_URL, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.log('⚠️ Update check endpoint not available (this is normal for first builds)');
            return { hasUpdate: false, updateInfo: null };
        }

        const updateInfo: UpdateInfo = await response.json();
        console.log('📦 Latest version from server:', updateInfo.version);
        console.log('📦 Current version:', currentVersion);

        // Simple version comparison (assumes semantic versioning)
        const hasUpdate = isNewerVersion(updateInfo.version, currentVersion);

        console.log('Update check result:', {
            currentVersion,
            latestVersion: updateInfo.version,
            hasUpdate,
        });

        return {
            hasUpdate,
            updateInfo: hasUpdate ? updateInfo : null,
        };
    } catch (error: any) {
        // Don't throw error - just log it. Update check is not critical.
        if (error.name === 'AbortError') {
            console.log('⏱️ Update check timed out (this is normal if no updates are published yet)');
        } else {
            console.log('ℹ️ Could not check for updates (this is normal for first builds):', error.message);
        }
        return { hasUpdate: false, updateInfo: null };
    }
};

/**
 * Download APK and install it
 */
export const downloadAndInstallUpdate = async (
    downloadUrl: string,
    onProgress?: (progress: DownloadProgress) => void
): Promise<void> => {
    try {
        if (Platform.OS !== 'android') {
            throw new Error('Updates are only supported on Android');
        }

        const fileName = `zumi-update-${Date.now()}.apk`;
        const cacheDir = (FileSystem as any).cacheDirectory || '';
        const fileUri = `${cacheDir}${fileName}`;

        console.log('Downloading update from:', downloadUrl);
        console.log('Saving to:', fileUri);

        // Create download resumable for progress tracking
        const downloadResumable = FileSystem.createDownloadResumable(
            downloadUrl,
            fileUri,
            {},
            (downloadProgress) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                const progressPercent = Math.round(progress * 100);

                if (onProgress) {
                    onProgress({
                        totalBytes: downloadProgress.totalBytesExpectedToWrite,
                        downloadedBytes: downloadProgress.totalBytesWritten,
                        progress: progressPercent,
                    });
                }

                console.log(`Download progress: ${progressPercent}%`);
            }
        );

        const downloadResult = await downloadResumable.downloadAsync();

        if (!downloadResult || !downloadResult.uri) {
            throw new Error('Download failed - no file URI returned');
        }

        console.log('Download completed:', downloadResult.uri);

        // Verify file exists
        const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
        if (!fileInfo.exists) {
            throw new Error('Downloaded file does not exist');
        }

        console.log('File verified. Size:', fileInfo.size, 'bytes');

        // Trigger Android installer
        await installApk(downloadResult.uri);
    } catch (error) {
        console.error('Failed to download and install update:', error);
        throw error;
    }
};

/**
 * Install APK using Android's package installer
 */
const installApk = async (fileUri: string): Promise<void> => {
    try {
        // Convert file:// URI to content:// URI for Android 11+
        const contentUri = await FileSystem.getContentUriAsync(fileUri);

        console.log('Installing APK from:', contentUri);

        // Launch Android's package installer
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/vnd.android.package-archive',
        });

        console.log('Install intent launched successfully');
    } catch (error) {
        console.error('Failed to install APK:', error);
        throw new Error('Failed to launch installer. Please install manually.');
    }
};

/**
 * Delete old update files to free up space
 */
export const cleanupOldUpdates = async (): Promise<void> => {
    try {
        const cacheDir = (FileSystem as any).cacheDirectory;
        if (!cacheDir) return;

        const files = await FileSystem.readDirectoryAsync(cacheDir);

        // Delete old APK files
        for (const file of files) {
            if (file.endsWith('.apk')) {
                const fileUri = `${cacheDir}${file}`;
                await FileSystem.deleteAsync(fileUri, { idempotent: true });
                console.log('Deleted old update file:', file);
            }
        }
    } catch (error) {
        console.error('Failed to cleanup old updates:', error);
        // Non-critical error, just log it
    }
};
