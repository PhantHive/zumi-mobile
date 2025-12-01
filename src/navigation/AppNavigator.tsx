// src/navigation/AppNavigator.tsx
import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import LoadingScreen from '../screens/LoadingScreen';
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
    const { isAuthenticated, isLoading } = useAuth();
    const [isPinLocked, setIsPinLocked] = useState(false);
    const [checkingPin, setCheckingPin] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            checkPinLock();
        }
    }, [isAuthenticated]);

    const checkPinLock = async () => {
        try {
            const storedPin = await SecureStore.getItemAsync('userPin');
            setIsPinLocked(!!storedPin);
        } catch (error) {
            console.error('Error checking PIN:', error);
        } finally {
            setCheckingPin(false);
        }
    };

    const handlePinUnlock = () => {
        setIsPinLocked(false);
    };

    if (isLoading || checkingPin) {
        return <LoadingScreen />;
    }

    return (
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
    );
};

export default AppNavigator;