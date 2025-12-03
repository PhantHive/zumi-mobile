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
        console.log('🖼️ Resizing artwork:', imageUri);

        // Download the image first if it's a remote URL
        let localUri = imageUri;
        if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
            const filename = imageUri.split('/').pop() || 'temp.jpg';
            // @ts-ignore - documentDirectory exists at runtime
            const fileUri = `${FileSystem.documentDirectory}${filename}`;

            console.log('📥 Downloading image to:', fileUri);
            // @ts-ignore - downloadAsync exists at runtime
            const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
            localUri = downloadResult.uri;
        }

        // Resize the image to 512x512 (max dimension)
        const manipResult = await ImageManipulator.manipulateAsync(
            localUri,
            [{ resize: { width: 512 } }], // Resize to 512px width, height auto
            {
                compress: 0.8, // 80% quality
                format: ImageManipulator.SaveFormat.JPEG
            }
        );

        console.log('✅ Resized artwork:', manipResult.uri);
        return manipResult.uri;
    } catch (error) {
        console.error('❌ Error resizing artwork:', error);
        return undefined;
    }
}
