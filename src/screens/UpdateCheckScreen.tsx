// src/screens/UpdateCheckScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import * as Application from 'expo-application';
import { checkForUpdates } from '../services/updateChecker';
import { UpdateInfo } from '../types/update';
import { colors } from '../styles/theme';

interface UpdateCheckScreenProps {
    onComplete: (updateInfo: UpdateInfo | null) => void;
}

const UpdateCheckScreen: React.FC<UpdateCheckScreenProps> = ({ onComplete }) => {
    const [currentVersion, setCurrentVersion] = useState<string>('...');
    const [latestVersion, setLatestVersion] = useState<string>('...');
    const [status, setStatus] = useState<string>('Checking for updates...');

    useEffect(() => {
        checkForUpdatesAndProceed();
    }, []);

    const checkForUpdatesAndProceed = async () => {
        const startTime = Date.now();

        try {
            // Get current version
            const current = Application.nativeApplicationVersion || '1.0.0';
            setCurrentVersion(current);

            console.log('🔍 Update check screen - Current version:', current);

            // Check for updates
            const { hasUpdate, updateInfo } = await checkForUpdates();

            if (hasUpdate && updateInfo) {
                setLatestVersion(updateInfo.version);
                setStatus(`Update found: v${updateInfo.version}`);
                console.log('✅ Update available:', updateInfo.version);

                // Ensure minimum 2 seconds display time
                const elapsed = Date.now() - startTime;
                const remainingTime = Math.max(0, 2000 - elapsed);
                await new Promise(resolve => setTimeout(resolve, remainingTime + 1500));

                onComplete(updateInfo);
            } else {
                setLatestVersion(current);
                setStatus('App is up to date');
                console.log('✅ No updates available');

                // Ensure minimum 2 seconds display time
                const elapsed = Date.now() - startTime;
                const remainingTime = Math.max(0, 2000 - elapsed);
                await new Promise(resolve => setTimeout(resolve, remainingTime));

                onComplete(null);
            }
        } catch (error) {
            console.error('❌ Update check failed:', error);
            setStatus('Update check failed, continuing...');

            // Ensure minimum 2 seconds display time even on error
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, 2000 - elapsed);
            await new Promise(resolve => setTimeout(resolve, remainingTime));

            onComplete(null);
        }
    };

    return (
        <View style={styles.container}>
            {/* Phearion Logo */}
            <Image
                source={require('../../assets/phearion.png')}
                style={styles.logo}
                resizeMode="contain"
            />

            {/* Status Text */}
            <Text style={styles.status}>{status}</Text>

            {/* Version Info */}
            <View style={styles.versionContainer}>
                <Text style={styles.versionLabel}>Current Version</Text>
                <Text style={styles.versionText}>v{currentVersion}</Text>
            </View>

            {latestVersion !== '...' && latestVersion !== currentVersion && (
                <View style={styles.versionContainer}>
                    <Text style={styles.versionLabel}>Latest Version</Text>
                    <Text style={styles.versionTextHighlight}>v{latestVersion}</Text>
                </View>
            )}

            {/* Loading Indicator */}
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 40,
    },
    status: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 30,
        textAlign: 'center',
    },
    versionContainer: {
        alignItems: 'center',
        marginBottom: 15,
    },
    versionLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    versionText: {
        fontSize: 18,
        color: colors.text,
        fontWeight: '600',
    },
    versionTextHighlight: {
        fontSize: 18,
        color: colors.primary,
        fontWeight: '700',
    },
    loader: {
        marginTop: 30,
    },
});

export default UpdateCheckScreen;
