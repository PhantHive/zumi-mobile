// src/services/permissionService.ts
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

export class PermissionService {
    private static hasRequestedPermissions = false;
    private static permissionGranted = false;

    static async requestNotificationPermissions(): Promise<boolean> {
        // Return cached result if already requested
        if (this.hasRequestedPermissions) {
            return this.permissionGranted;
        }

        try {
            if (Platform.OS === 'android') {
                if (Platform.Version >= 33) {
                    // Android 13+ requires runtime permission
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                        {
                            title: '🎵 Notification Permission Required',
                            message: 'Zumi needs notification permission to show music controls in your notification panel and lock screen.',
                            buttonNeutral: 'Ask Me Later',
                            buttonNegative: 'Cancel',
                            buttonPositive: 'Allow',
                        }
                    );

                    this.hasRequestedPermissions = true;
                    this.permissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;

                    console.log('📢 Notification permission result:', granted);

                    // If permission denied, show alert to open settings
                    if (!this.permissionGranted) {
                        this.showPermissionDeniedAlert();
                    }

                    return this.permissionGranted;
                } else {
                    // Android 12 and below - permission granted by default
                    this.hasRequestedPermissions = true;
                    this.permissionGranted = true;
                    return true;
                }
            } else {
                // iOS - handle if needed in the future
                this.hasRequestedPermissions = true;
                this.permissionGranted = true;
                return true;
            }
        } catch (error) {
            console.error('❌ Error requesting notification permission:', error);
            this.hasRequestedPermissions = true;
            this.permissionGranted = false;
            return false;
        }
    }

    static showPermissionDeniedAlert() {
        Alert.alert(
            '🔔 Notifications Blocked',
            'Music controls won\'t appear in your notification panel or lock screen. You can enable this in Settings.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Open Settings',
                    onPress: () => {
                        Linking.openSettings();
                    },
                },
            ]
        );
    }

    static isPermissionGranted(): boolean {
        return this.permissionGranted;
    }
}
