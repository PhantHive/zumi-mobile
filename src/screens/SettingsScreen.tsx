// src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import { useAuth } from '../contexts';
import { colors, spacing, typography, borderRadius } from '../styles';
import PinLockScreen from './PinLockScreen';
import { apiClient } from '../services/apiClient';
import { checkForUpdates, downloadAndInstallUpdate } from '../services/updateChecker';
import UpdateModal from '../components/UpdateModal';

const SettingsScreen: React.FC = () => {
    const { user, signOut } = useAuth();
    const [pinEnabled, setPinEnabled] = useState(false);
    const [isSettingPin, setIsSettingPin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');

    useEffect(() => {
        loadSettings();
        // Get current version
        const version = Application.nativeApplicationVersion || '1.0.0';
        setCurrentVersion(version);
    }, []);

    const loadSettings = async () => {
        try {
            const storedPin = await SecureStore.getItemAsync('userPin');
            setPinEnabled(!!storedPin);
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinToggle = async (value: boolean) => {
        if (value) {
            // Enable PIN - show PIN setup screen
            setIsSettingPin(true);
        } else {
            // Disable PIN
            Alert.alert(
                'Disable PIN',
                'Are you sure you want to disable PIN lock?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Disable',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                // Delete from server first
                                await apiClient.deletePin();
                                console.log('✅ PIN deleted from server');
                            } catch (error) {
                                console.log('⚠️ Could not delete PIN from server (offline?)');
                            }
                            // Always delete locally regardless of server response
                            await SecureStore.deleteItemAsync('userPin');
                            setPinEnabled(false);
                        },
                    },
                ]
            );
        }
    };

    const handleSetPin = async (pin: string) => {
        try {
            // Hash the PIN before storing
            const hashedPin = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                pin
            );

            // Try to save to server first
            try {
                await apiClient.setPin(hashedPin);
                console.log('✅ PIN saved to server');
            } catch (error) {
                console.log('⚠️ Could not save PIN to server (offline?), saving locally only');
            }

            // Always save locally
            await SecureStore.setItemAsync('userPin', hashedPin);
            setPinEnabled(true);
            setIsSettingPin(false);
            Alert.alert('Success', 'PIN has been set successfully');
        } catch (error) {
            console.error('Error setting PIN:', error);
            Alert.alert('Error', 'Failed to set PIN. Please try again.');
        }
    };

    const handleCheckForUpdates = async () => {
        setCheckingUpdate(true);
        try {
            console.log('🔍 Manually checking for updates...');
            const { hasUpdate, updateInfo: info } = await checkForUpdates();

            if (hasUpdate && info) {
                console.log('✅ Update found:', info.version);
                setUpdateInfo(info);
                setUpdateModalVisible(true);
            } else {
                console.log('✅ No updates available');
                Alert.alert(
                    'No Updates',
                    `You are running the latest version (v${currentVersion})`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('❌ Error checking for updates:', error);
            Alert.alert(
                'Error',
                'Failed to check for updates. Please try again later.',
                [{ text: 'OK' }]
            );
        } finally {
            setCheckingUpdate(false);
        }
    };

    if (isSettingPin) {
        return (
            <PinLockScreen
                isSettingPin
                onSetPin={handleSetPin}
                onUnlock={() => setIsSettingPin(false)}
            />
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            {/* Profile Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile</Text>
                <View style={styles.card}>
                    <View style={styles.profileInfo}>
                        {user?.picture ? (
                            <Image
                                source={{ uri: user.picture }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={32} color={colors.text} />
                            </View>
                        )}
                        <View style={styles.profileText}>
                            <Text style={styles.profileName}>{user?.name}</Text>
                            <Text style={styles.profileEmail}>{user?.email}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Security Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Security</Text>
                <View style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="lock-closed" size={24} color={colors.accent} />
                            <View style={styles.settingText}>
                                <Text style={styles.settingTitle}>PIN Lock</Text>
                                <Text style={styles.settingDescription}>
                                    Require PIN to open app
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={pinEnabled}
                            onValueChange={handlePinToggle}
                            trackColor={{ false: colors.card, true: colors.accent }}
                            thumbColor={colors.text}
                        />
                    </View>
                </View>
            </View>

            {/* App Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>App</Text>
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={handleCheckForUpdates}
                        disabled={checkingUpdate}
                    >
                        <View style={styles.settingInfo}>
                            <Ionicons name="cloud-download-outline" size={24} color={colors.accent} />
                            <View style={styles.settingText}>
                                <Text style={styles.settingTitle}>Check for Updates</Text>
                                <Text style={styles.settingDescription}>
                                    Current version: v{currentVersion}
                                </Text>
                            </View>
                        </View>
                        {checkingUpdate ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Account Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <TouchableOpacity style={styles.card} onPress={signOut}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="log-out" size={24} color="#ff6b6b" />
                            <Text style={[styles.settingTitle, { color: '#ff6b6b' }]}>
                                Sign Out
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Zumi Music v{currentVersion}</Text>
                <Text style={styles.footerSubtext}>Made with 💜 for music lovers</Text>
            </View>

            {/* Update Modal */}
            {updateInfo && (
                <UpdateModal
                    visible={updateModalVisible}
                    updateInfo={updateInfo}
                    onClose={() => setUpdateModalVisible(false)}
                    onUpdateComplete={async () => {
                        // when update finishes, close modal
                        setUpdateModalVisible(false);
                    }}
                />
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: spacing.lg,
        paddingTop: spacing.xxl * 2,
    },
    headerTitle: {
        ...typography.h1,
        color: colors.text,
    },
    section: {
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    sectionTitle: {
        ...typography.body,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        fontSize: 12,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileText: {
        flex: 1,
    },
    profileName: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
        marginBottom: 4,
    },
    profileEmail: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    settingText: {
        flex: 1,
    },
    settingTitle: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
        marginBottom: 2,
    },
    settingDescription: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    footer: {
        alignItems: 'center',
        padding: spacing.xl,
        marginTop: spacing.lg,
    },
    footerText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    footerSubtext: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 4,
        fontSize: 11,
    },
});

export default SettingsScreen;
