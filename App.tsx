import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { AppState, AppStateStatus, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/contexts/AuthContext';
import { MusicProvider } from './src/contexts/MusicContext';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import UpdateModal from './src/components/UpdateModal';
import LoadingScreen from './src/screens/LoadingScreen';
import { checkForUpdates, cleanupOldUpdates } from './src/services/updateChecker';
import { UpdateInfo } from './src/types/update';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('Getting things ready for you...');
    const appState = useRef(AppState.currentState);

    // Configure deep linking for React Navigation
    // Support both 'exp://' (Expo Go) and 'zumi://' (production) schemes
    // IMPORTANT: We filter out auth-success links to let AuthContext handle them
    const linking = {
        prefixes: ['zumi://', 'exp://'],
        config: {
            screens: {},
        },
        // Filter function to prevent navigation from handling auth links
        getPathFromState: (state: any, config: any) => {
            // Let React Navigation handle normal deep links
            return null;
        },
    };

    // Check for updates on app launch
    useEffect(() => {
        initializeApp();
    }, []);

    // Check for updates when app comes to foreground
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        // When app comes to foreground from background
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            console.log('App has come to the foreground - checking for updates');
            await checkForUpdatesOnLaunch();
        }

        appState.current = nextAppState;
    };

    const initializeApp = async () => {
        try {
            setLoadingMessage('Checking for updates...');
            await checkForUpdatesOnLaunch();

            setLoadingMessage('Loading your music...');
            // Give a moment for smooth transition
            await new Promise(resolve => setTimeout(resolve, 500));

            // Cleanup old update files
            await cleanupOldUpdates().catch(console.error);

            setLoadingMessage('Almost there...');
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error('Initialization error:', error);
        } finally {
            setIsInitializing(false);
            // Don't hide splash screen here - let AppNavigator control it after PIN check
        }
    };

    const checkForUpdatesOnLaunch = async () => {
        try {
            console.log('Checking for app updates...');
            const { hasUpdate, updateInfo: latestUpdateInfo } = await checkForUpdates();

            if (hasUpdate && latestUpdateInfo) {
                console.log('Update available:', latestUpdateInfo.version);
                setUpdateInfo(latestUpdateInfo);
                setShowUpdateModal(true);
            } else {
                console.log('App is up to date');
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
            // Silently fail - don't interrupt user experience
        }
    };

    const handleCloseUpdateModal = () => {
        // Only allow closing if not a forced update
        if (updateInfo && !updateInfo.forceUpdate) {
            setShowUpdateModal(false);
        }
    };

    const handleUpdateComplete = () => {
        console.log('Update download complete - installer launched');
        // Modal stays open, user will see installer
    };

    // Show nothing during initialization - splash screen will be visible
    if (isInitializing) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <MusicProvider>
                    <NavigationContainer
                        linking={linking}
                        fallback={null}
                        onReady={() => console.log('🎵 Navigation ready')}
                    >
                        <AppNavigator />
                        <StatusBar style="light" />
                    </NavigationContainer>

                    {/* Update Modal - Global overlay */}
                    <UpdateModal
                        visible={showUpdateModal}
                        updateInfo={updateInfo}
                        onClose={handleCloseUpdateModal}
                        onUpdateComplete={handleUpdateComplete}
                    />
                </MusicProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}