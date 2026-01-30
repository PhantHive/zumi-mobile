// src/services/audioRoutingService.ts
import { Platform, NativeModules } from 'react-native';
import TrackPlayer, { State } from 'react-native-track-player';

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

            // Persist desired route so future play actions reapply it
            await setDesiredRoute('speaker');

            // Restart playback to pick up new audio session
            await reattachAfterRouting(200);

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

            // Persist desired route so future play actions reapply it
            await setDesiredRoute('bluetooth');

            // Restart playback to pick up Bluetooth route
            await reattachAfterRouting(200);

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

/**
 * Local reattach logic copied from trackPlayerService. Avoids circular imports.
 */
async function reattachAfterRouting(delayMs = 200) {
    try {
        console.log('🔄 (audioRoutingService) Reattaching audio after routing change...');

        const state = await TrackPlayer.getState();

        if (state === State.Playing) {
            const position = await TrackPlayer.getPosition();
            await TrackPlayer.pause();
            console.log('⏸️ Paused (for reattach)');
            await new Promise(res => setTimeout(res, delayMs));
            await TrackPlayer.seekTo(position);
            await TrackPlayer.play();
            console.log('▶️ Resumed (after reattach)');
        } else {
            console.log('ℹ️ Not playing, no reattach needed (audioRoutingService)');
        }
    } catch (e) {
        console.warn('⚠️ reattachAfterRouting failed (audioRoutingService):', e);
    }
}

/**
 * Ensure the persisted desired route is applied. Call this before starting playback.
 */
export async function applyDesiredRoute(): Promise<void> {
    try {
        if (Platform.OS !== 'android' || !AudioManagerModule) return;

        if (desiredRoute === 'speaker') {
            console.log('🔁 Applying desired route: speaker');
            await AudioManagerModule.setMode('IN_COMMUNICATION');
            await AudioManagerModule.setSpeakerphoneOn(true);
            // small reattach to ensure Android picks it up
            await reattachAfterRouting(120);
        } else {
            console.log('🔁 Applying desired route: bluetooth');
            await AudioManagerModule.setMode('NORMAL');
            await AudioManagerModule.setSpeakerphoneOn(false);
            await reattachAfterRouting(120);
        }
    } catch (e) {
        console.warn('⚠️ applyDesiredRoute failed:', e);
    }
}

export type AudioRoute = 'bluetooth' | 'speaker';

// In-memory desired route. This is sufficient to remember the route while the
// app is running (fixes loss of routing after pause/resume). Persisting across
// cold restarts can be added later if needed.
let desiredRoute: AudioRoute = 'bluetooth';

function setDesiredRoute(route: AudioRoute) {
    desiredRoute = route;
}
