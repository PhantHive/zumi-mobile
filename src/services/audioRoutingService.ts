// src/services/audioRoutingService.ts
import { Platform, Linking, Alert } from 'react-native';
import * as Audio from 'expo-av';

export type AudioOutput = {
    id: string;
    name: string;
    description?: string;
    connected?: boolean;
};

/**
 * Return a list of likely audio outputs. This is a best-effort client-side implementation.
 * Native modules can replace this implementation later to list exact paired devices.
 */
export async function getAvailableOutputs(): Promise<AudioOutput[]> {
    const outputs: AudioOutput[] = [
        { id: 'system', name: 'Phone speaker' },
    ];

    // Bluetooth option (system-managed)
    outputs.push({ id: 'bluetooth', name: 'Bluetooth (system)' });

    // AirPlay on iOS
    if (Platform.OS === 'ios') {
        outputs.push({ id: 'airplay', name: 'AirPlay' });
    }

    // Add a generic 'Cast / Smart Speaker' option for devices like Alexa/Echo
    outputs.push({ id: 'cast', name: 'Smart Speaker / Cast' });

    return outputs;
}

/**
 * Select an output. Full device-level routing requires native platform support and
 * pairing — here we attempt a best-effort behavior:
 * - For bluetooth/airplay/cast we open the system settings so the user can connect
 * - We enable Bluetooth A2DP audio on the JS side where possible via expo-av
 */
export async function selectOutput(outputId: string): Promise<void> {
    try {
        if (outputId === 'system') {
            // Ensure audio plays through device speaker: allow Bluetooth A2DP false
            await Audio.setAudioModeAsync({ allowsBluetoothA2DP: false as any, playsInSilentModeIOS: true });
            return;
        }

        if (outputId === 'bluetooth') {
            // Enable A2DP so audio may route to paired bluetooth devices
            try {
                await Audio.setAudioModeAsync({ allowsBluetoothA2DP: true as any, playsInSilentModeIOS: true });
            } catch (e) {
                // ignore - best-effort
            }

            // Open system settings to let user choose or connect a BT device
            Alert.alert(
                'Route audio to Bluetooth',
                'Please open your system Bluetooth settings and select the paired device (e.g. earbuds, speaker, Echo). After connecting, audio should play through the device.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                ]
            );
            return;
        }

        if (outputId === 'airplay') {
            // On iOS, users can open Control Center to pick AirPlay. We provide a hint.
            Alert.alert(
                'AirPlay / Output',
                'Use Control Center to select an AirPlay destination (or open Bluetooth in Settings).',
                [{ text: 'OK' }]
            );
            return;
        }

        if (outputId === 'cast') {
            Alert.alert(
                'Smart Speaker / Cast',
                'To stream to smart speakers (Alexa, Google Home), ensure the speaker is on the same network and supports streaming. Use the device app (Amazon Alexa / Google Home) to enable music playback from this device, or use Bluetooth in Settings.',
                [{ text: 'OK' }]
            );
            return;
        }

        // fallback
        Alert.alert('Output', 'Selected output: ' + outputId);
    } catch (error) {
        console.warn('selectOutput error', error);
        throw error;
    }
}

