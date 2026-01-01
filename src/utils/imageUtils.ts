// src/utils/imageUtils.ts
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

/**
 * Convert base64 data URI to local file
 */
async function dataUriToLocalFile(dataUri: string): Promise<string> {
    try {
        const timestamp = Date.now();
        const filename = `artwork_${timestamp}.jpg`;
        // @ts-ignore - documentDirectory exists at runtime
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        // Extract the base64 data (remove the "data:image/xxx;base64," prefix)
        const base64Data = dataUri.split(',')[1];

        console.log('💾 Converting data URI to local file...');
        // writeAsStringAsync accepts encoding string; use 'base64' to avoid missing enum in types
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: 'base64' as any,
        } as any);

        console.log('✅ Data URI converted to local file:', fileUri);
        return fileUri;
    } catch (error) {
        console.error('❌ Error converting data URI to file:', error);
        throw error;
    }
}

/**
 * Resize and compress an image to avoid TransactionTooLargeException
 * when passing artwork to TrackPlayer
 *
 * Android binder limit is ~1MB, so we target 512x512 with 80% quality
 * This function handles BOTH HTTP URLs and base64 data URIs
 */
export async function resizeArtworkForTrackPlayer(imageUri: string): Promise<string | undefined> {
    try {
        console.log('🖼️ Processing artwork...');

        let localUri = imageUri;

        // If it's a data URI (base64), convert it to a local file first
        if (imageUri.startsWith('data:')) {
            console.log('📦 Detected data URI, converting to local file...');
            localUri = await dataUriToLocalFile(imageUri);
        }
        // If it's a remote URL (http/https), download it first
        else if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
            try {
                const timestamp = Date.now();
                const filename = `artwork_${timestamp}.jpg`;
                // @ts-ignore - documentDirectory exists at runtime
                const fileUri = `${FileSystem.documentDirectory}${filename}`;

                console.log('📥 Downloading image from URL...');
                // @ts-ignore - downloadAsync exists at runtime
                const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
                localUri = downloadResult.uri;
                console.log('✅ Image downloaded');
            } catch (downloadError) {
                console.error('❌ Error downloading image:', downloadError);
                // If download fails, try to use the original URI directly
                localUri = imageUri;
            }
        }

        console.log('🔄 Resizing image to 512x512...');

        // Resize the image to 512x512 (max dimension) to stay under 1MB
        const manipResult = await ImageManipulator.manipulateAsync(
            localUri,
            [{ resize: { width: 512 } }], // Resize to 512px width, height auto
            {
                compress: 0.8, // 80% quality
                format: ImageManipulator.SaveFormat.JPEG
            }
        );

        console.log('✅ Artwork resized successfully');
        console.log('📊 Result URI:', manipResult.uri.substring(0, 100) + '...');

        // Clean up the temporary file if we created one from data URI or download
        if (localUri !== imageUri && localUri.startsWith('file://')) {
            try {
                // @ts-ignore
                await FileSystem.deleteAsync(localUri, { idempotent: true });
                console.log('🗑️ Cleaned up temporary file');
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        return manipResult.uri;
    } catch (error) {
        console.error('❌ Error resizing artwork:', error);
        // Return undefined so the track plays without artwork rather than crashing
        return undefined;
    }
}
