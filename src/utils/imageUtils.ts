// src/utils/imageUtils.ts
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Convert base64 data URI to local file
 */
async function dataUriToLocalFile(dataUri: string): Promise<string> {
    try {
        const timestamp = Date.now();
        const filename = `artwork_${timestamp}.jpg`;
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;

        // Extract the base64 data (remove the "data:image/xxx;base64," prefix)
        const base64Data = dataUri.split(',')[1];

        console.log('💾 Converting data URI to local file...');

        // Use the legacy API which still works
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
        });

        console.log('✅ Data URI converted to local file:', fileUri);
        return fileUri;
    } catch (error) {
        console.error('❌ Error converting data URI to file:', error);
        throw error;
    }
}

/**
 * Clean up old artwork files to prevent disk space issues
 * Keeps only the most recent 20 artwork files
 */
async function cleanupOldArtworkFiles(): Promise<void> {
    try {
        const dirUri = FileSystem.cacheDirectory;
        if (!dirUri) return;

        const files = await FileSystem.readDirectoryAsync(dirUri);

        // Filter for artwork files
        const artworkFiles = files.filter((f: string) =>
            f.startsWith('artwork_') || f.startsWith('ImageManipulator')
        );

        // If we have more than 20 artwork files, delete the oldest ones
        if (artworkFiles.length > 20) {
            console.log(`🗑️ Cleaning up ${artworkFiles.length - 20} old artwork files...`);

            // Sort by name (which includes timestamp) and keep only the most recent 20
            const sortedFiles = artworkFiles.sort();
            const filesToDelete = sortedFiles.slice(0, sortedFiles.length - 20);

            for (const file of filesToDelete) {
                try {
                    await FileSystem.deleteAsync(`${dirUri}${file}`, { idempotent: true });
                } catch (e) {
                    // Ignore individual file deletion errors
                }
            }

            console.log(`✅ Cleaned up ${filesToDelete.length} old artwork files`);
        }
    } catch (e) {
        // Ignore cleanup errors - not critical
        console.warn('⚠️ Could not cleanup old files:', e);
    }
}

/**
 * Resize and compress an image to avoid TransactionTooLargeException
 * when passing artwork to TrackPlayer
 *
 * Android binder limit is ~1MB, so we target 400x400 with 70% quality
 * This ensures the final image size is well under the limit
 * This function handles BOTH HTTP URLs and base64 data URIs
 */
export async function resizeArtworkForTrackPlayer(imageUri: string): Promise<string | undefined> {
    try {
        console.log('🖼️ Processing artwork...');

        let localUri = imageUri;
        let needsCleanup = false;

        // If it's a data URI (base64), convert it to a local file first
        if (imageUri.startsWith('data:')) {
            console.log('📦 Detected data URI, converting to local file...');
            localUri = await dataUriToLocalFile(imageUri);
            needsCleanup = true;
        }
        // If it's a remote URL (http/https), download it first
        else if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
            try {
                const timestamp = Date.now();
                const filename = `artwork_temp_${timestamp}.jpg`;
                const fileUri = `${FileSystem.cacheDirectory}${filename}`;

                console.log('📥 Downloading image from URL...');
                const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
                localUri = downloadResult.uri;
                needsCleanup = true;
                console.log('✅ Image downloaded');
            } catch (downloadError) {
                console.error('❌ Error downloading image:', downloadError);
                // If download fails, return undefined to play without artwork
                return undefined;
            }
        }

        console.log('🔄 Resizing image to max 400x400...');

        // Resize the image to max 400x400 (both dimensions constrained)
        // This ensures the image stays well under 1MB limit even for high-res sources
        let manipResult = await ImageManipulator.manipulateAsync(
            localUri,
            [{ resize: { width: 400, height: 400 } }], // Constrain both dimensions
            {
                compress: 0.7, // 70% quality for smaller file size
                format: ImageManipulator.SaveFormat.JPEG
            }
        );

        // Verify the file size - Android has a ~1MB binder transaction limit
        try {
            const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
            if (fileInfo.exists && 'size' in fileInfo) {
                const fileSizeKB = fileInfo.size / 1024;
                console.log(`📏 Resized image size: ${fileSizeKB.toFixed(2)} KB`);

                // If still too large (> 800KB), compress more aggressively
                if (fileSizeKB > 800) {
                    console.log('⚠️ Image still too large, compressing more...');
                    manipResult = await ImageManipulator.manipulateAsync(
                        manipResult.uri,
                        [], // No additional resize
                        {
                            compress: 0.5, // 50% quality
                            format: ImageManipulator.SaveFormat.JPEG
                        }
                    );
                    const newFileInfo = await FileSystem.getInfoAsync(manipResult.uri);
                    if (newFileInfo.exists && 'size' in newFileInfo) {
                        const newFileSizeKB = newFileInfo.size / 1024;
                        console.log(`📏 Further compressed to: ${newFileSizeKB.toFixed(2)} KB`);
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Could not check file size:', e);
        }

        console.log('✅ Artwork resized successfully');
        console.log('📊 Result URI:', manipResult.uri.substring(0, 100) + '...');

        // Clean up the temporary download/conversion file ONLY (not the final resized file)
        if (needsCleanup && localUri !== imageUri && localUri.startsWith('file://')) {
            try {
                await FileSystem.deleteAsync(localUri, { idempotent: true });
                console.log('🗑️ Cleaned up temporary download file');
            } catch (e) {
                // Ignore cleanup errors
                console.warn('⚠️ Could not clean up temporary file:', e);
            }
        }

        // Clean up old artwork files to prevent disk space issues
        cleanupOldArtworkFiles().catch((e: any) => console.warn('⚠️ Cleanup warning:', e));

        // Return the resized image URI (TrackPlayer will use this)
        // Don't delete this file - it needs to persist for playback
        return manipResult.uri;
    } catch (error) {
        console.error('❌ Error resizing artwork:', error);
        // Return undefined so the track plays without artwork rather than crashing
        return undefined;
    }
}
