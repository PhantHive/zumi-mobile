// src/navigation/AppNavigator.tsx
import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';
import { useMusic } from '../contexts/MusicContext';
import { apiClient } from '../services/apiClient';

// Screens
import LoginScreen from '../screens/LoginScreen';
import AppLoadingScreen from '../screens/AppLoadingScreen';
import PinLockScreen from '../screens/PinLockScreen';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import UploadScreen from '../screens/UploadScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../styles/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'home';

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Library') {
                        iconName = focused ? 'library' : 'library-outline';
                    } else if (route.name === 'Upload') {
                        iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
                tabBarStyle: {
                    backgroundColor: 'rgba(0, 0, 0, 0.98)',
                    borderTopWidth: 0,
                    height: 56,
                    paddingBottom: 6,
                    paddingTop: 6,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
                headerStyle: {
                    backgroundColor: 'transparent',
                    elevation: 0,
                    shadowOpacity: 0,
                },
                headerTintColor: colors.text,
                headerTransparent: true,
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
            />
            <Tab.Screen
                name="Library"
                component={LibraryScreen}
                options={{ headerShown: false }}
            />
            <Tab.Screen
                name="Upload"
                component={UploadScreen}
                options={{ headerShown: false }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ headerShown: false }}
            />
        </Tab.Navigator>
    );
};

const AppNavigator = () => {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { isLoading: musicLoading, startInitialLoad } = useMusic();
    const [isPinLocked, setIsPinLocked] = useState(false);
    const [checkingPin, setCheckingPin] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            checkPinLock();
        } else {
            setCheckingPin(false);
        }
    }, [isAuthenticated]);

    const checkPinLock = async () => {
        try {
            // First check if user has PIN on server
            try {
                const profile = await apiClient.getUserProfile();
                const hasServerPin = !!profile.pinHash;

                if (hasServerPin) {
                    console.log('✅ User has PIN on server');
                    // User has PIN on server, require PIN entry
                    setIsPinLocked(true);
                } else {
                    console.log('ℹ️ No PIN on server');
                    // No server PIN, check local PIN
                    const storedPin = await SecureStore.getItemAsync('userPin');
                    const hasLocalPin = !!storedPin;

                    if (hasLocalPin) {
                        console.log('⚠️ Local PIN found but not on server - clearing old PIN');
                        // Clear old numeric PIN (migration from old system)
                        await SecureStore.deleteItemAsync('userPin');
                        console.log('✅ Old PIN cleared - user can set new symbol PIN in settings');
                        // No PIN, start loading
                        startInitialLoad();
                    } else {
                        console.log('ℹ️ No PIN set anywhere');
                        // No PIN anywhere, start loading
                        startInitialLoad();
                    }
                }
            } catch (serverError) {
                console.log('⚠️ Could not check server PIN (offline?), checking local only');
                // Fallback to local check if server is unreachable
                const storedPin = await SecureStore.getItemAsync('userPin');
                const hasPin = !!storedPin;
                setIsPinLocked(hasPin);

                if (!hasPin) {
                    startInitialLoad();
                }
            }
        } catch (error) {
            console.error('Error checking PIN:', error);
        } finally {
            setCheckingPin(false);
        }
    };

    const handlePinUnlock = () => {
        setIsPinLocked(false);
        // Start loading AFTER pin is unlocked
        startInitialLoad();
    };

    // Only show auth loading, NOT music loading
    if (authLoading || checkingPin) {
        return null; // Show nothing during auth check
    }

    return (
        <>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : isPinLocked ? (
                    <Stack.Screen name="PinLock">
                        {() => <PinLockScreen onUnlock={handlePinUnlock} />}
                    </Stack.Screen>
                ) : (
                    <Stack.Screen name="Main" component={MainTabs} />
                )}
            </Stack.Navigator>

            {/* Loading screen overlay - only show AFTER pin check is complete and pin is unlocked */}
            {isAuthenticated && !isPinLocked && !checkingPin && musicLoading && <AppLoadingScreen />}
        </>
    );
};

export default AppNavigator;

