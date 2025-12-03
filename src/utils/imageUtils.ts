// src/utils/imageUtils.ts
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

/**
 * Resize and compress an image to avoid TransactionTooLargeException
 * when passing artwork to TrackPlayer
 *
 * Android binder limit is ~1MB, so we target 512x512 with 80% quality
 */
export async function resizeArtworkForTrackPlayer(imageUri: string): Promise<string | undefined> {
    try {
        console.log('🖼️ Resizing artwork...');

        let localUri = imageUri;

        // If it's a remote URL (http/https), download it first
        if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
            try {
                const timestamp = Date.now();
                const filename = `artwork_${timestamp}.jpg`;
                // @ts-ignore - documentDirectory exists at runtime
                const fileUri = `${FileSystem.documentDirectory}${filename}`;

                console.log('📥 Downloading image...');
                // @ts-ignore - downloadAsync exists at runtime
                const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
                localUri = downloadResult.uri;
                console.log('✅ Image downloaded to:', localUri);
            } catch (downloadError) {
                console.error('❌ Error downloading image:', downloadError);
                // If download fails, try to use the original URI directly
                localUri = imageUri;
            }
        }
        // If it's a data URI (base64), we can use it directly with image-manipulator
        // expo-image-manipulator supports data URIs directly

        console.log('🔄 Resizing image...');

        // Resize the image to 512x512 (max dimension)
        const manipResult = await ImageManipulator.manipulateAsync(
            localUri,
            [{ resize: { width: 512 } }], // Resize to 512px width, height auto
            {
                compress: 0.8, // 80% quality
                format: ImageManipulator.SaveFormat.JPEG
            }
        );

        console.log('✅ Artwork resized successfully:', manipResult.uri.substring(0, 100) + '...');
        return manipResult.uri;
    } catch (error) {
        console.error('❌ Error resizing artwork:', error);
        // Return undefined so the track plays without artwork rather than crashing
        return undefined;
    }
}
