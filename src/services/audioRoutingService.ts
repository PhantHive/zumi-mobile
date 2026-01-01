// src/services/audioRoutingService.ts
import { Platform, NativeModules } from 'react-native';
import { trackPlayerService } from './trackPlayerService';

const { AudioManagerModule } = NativeModules;

/**
 * Switch audio to phone speaker
 *
 * KEY INSIGHT: Media audio (music) automatically routes to Bluetooth.
 * To force phone speaker, we need to switch to COMMUNICATION mode.
 */
export async function routeToPhoneSpeaker(): Promise<void> {
    try {
        if (Platform.OS === 'android' && AudioManagerModule) {
            console.log('📱 Routing to phone speaker...');

            // CRITICAL: Switch to IN_COMMUNICATION mode
            // This makes audio behave like a phone call, which respects speakerphone!
            await AudioManagerModule.setMode('IN_COMMUNICATION');

            // Now turn ON speakerphone
            await AudioManagerModule.setSpeakerphoneOn(true);

            // Restart playback to pick up new audio session
            await trackPlayerService.reattachAfterRouting(200);

            console.log('✅ Routed to phone speaker (COMMUNICATION mode)');
        } else {
            console.warn('⚠️ AudioManagerModule not available');
        }
    } catch (error) {
        console.error('❌ Failed to route to phone speaker:', error);
    }
}

/**
 * Switch audio to Bluetooth
 *
 * Restore NORMAL mode so media audio routes to Bluetooth automatically.
 */
export async function routeToBluetooth(): Promise<void> {
    try {
        if (Platform.OS === 'android' && AudioManagerModule) {
            console.log('🔵 Routing to Bluetooth...');

            // Switch back to NORMAL media mode
            await AudioManagerModule.setMode('NORMAL');

            // Turn OFF speakerphone (not needed in NORMAL mode, but good practice)
            await AudioManagerModule.setSpeakerphoneOn(false);

            // Restart playback to pick up Bluetooth route
            await trackPlayerService.reattachAfterRouting(200);

            console.log('✅ Routed to Bluetooth (NORMAL mode)');
        } else {
            console.warn('⚠️ AudioManagerModule not available');
        }
    } catch (error) {
        console.error('❌ Failed to route to Bluetooth:', error);
    }
}

/**
 * Check if currently on speakerphone
 */
export async function isSpeakerphoneOn(): Promise<boolean> {
    try {
        if (Platform.OS === 'android' && AudioManagerModule) {
            return await AudioManagerModule.isSpeakerphoneOn();
        }
        return false;
    } catch (error) {
        console.error('❌ Failed to check speakerphone status:', error);
        return false;
    }
}