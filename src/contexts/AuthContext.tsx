// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { UserData } from '../types';
import env from '../config/env';
import { getRandomVoice } from '../utils/assets';

// This is critical - must be called before the auth request
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
    user: UserData | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const welcomeSoundRef = React.useRef<Audio.Sound | null>(null);
    const isProcessingAuthRef = React.useRef(false);

    console.log('🔐 Backend URL:', env.api.baseUrl);

    useEffect(() => {
        checkStoredAuth();

        // Listen for deep link events while app is running
        const subscription = Linking.addEventListener('url', (event) => {
            console.log('🔗 Deep link event received:', event.url);
            handleAuthDeepLink(event.url);
        });

        // Check if app was opened with a URL
        Linking.getInitialURL().then((url) => {
            if (url && url.includes('auth-success')) {
                console.log('🔗 App opened with auth URL:', url);
                handleAuthDeepLink(url);
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const handleAuthDeepLink = async (url: string) => {
        console.log('🔗 ========== DEEP LINK HANDLER ==========');
        console.log('🔗 Received deep link:', url);
        console.log('🔗 URL type:', typeof url);
        console.log('🔗 URL length:', url?.length);

        // Parse the deep link - handle both 'exp://' and 'zumi://' schemes
        if (url && url.includes('auth-success')) {
            try {
                console.log('🎯 Processing auth-success deep link');

                // Extract query parameters from the URL
                // For exp:// URLs like: exp://192.168.1.148:8081/--/auth-success?token=...&user=...
                // For zumi:// URLs like: zumi://auth-success?token=...&user=...
                let queryString = '';
                if (url.includes('?')) {
                    queryString = url.split('?')[1];
                } else {
                    console.error('❌ No query string found in URL');
                    return;
                }

                console.log('📝 Query string:', queryString);

                // Parse query parameters manually to avoid URL parsing issues
                const params = new URLSearchParams(queryString);
                const token = params.get('token');
                const userJson = params.get('user');

                console.log('🔑 Token exists:', !!token);
                console.log('🔑 Token length:', token?.length);
                console.log('👤 User JSON exists:', !!userJson);
                console.log('👤 User JSON length:', userJson?.length);

                if (token && userJson) {
                    console.log('✅ Both token and user data received');
                    console.log('📦 Parsing user JSON...');

                    const userData = JSON.parse(decodeURIComponent(userJson));
                    console.log('✅ User data parsed:', userData);

                    console.log('💾 Saving to SecureStore...');
                    await SecureStore.setItemAsync('serverToken', token);
                    await SecureStore.setItemAsync('user', JSON.stringify(userData));

                    console.log('✅ Stored successfully, updating state...');
                    setUser(userData);
                    setIsLoading(false);
                    console.log('✅ User state updated!');

                    // Play welcome sound
                    try {
                        if (isProcessingAuthRef.current) {
                            console.log('🔊 Auth processing in progress, skipping sound playback');
                        } else {
                            isProcessingAuthRef.current = true;

                            const randomVoice = getRandomVoice();
                            const { sound } = await Audio.Sound.createAsync(randomVoice);
                            welcomeSoundRef.current = sound;

                            await sound.playAsync();
                            sound.setOnPlaybackStatusUpdate((status) => {
                                if (status.isLoaded && status.didJustFinish) {
                                    sound.unloadAsync();
                                    isProcessingAuthRef.current = false;
                                }
                            });
                        }
                    } catch (audioError) {
                        console.log('⚠️ Error playing welcome sound:', audioError);
                    }
                } else {
                    console.error('❌ Missing token or user data in deep link');
                    console.error('Token:', token ? 'EXISTS' : 'MISSING');
                    console.error('User:', userJson ? 'EXISTS' : 'MISSING');
                }
            } catch (error: any) {
                console.error('❌ Error parsing deep link:', error);
                console.error('❌ Error message:', error.message);
                console.error('❌ Error stack:', error.stack);
            }
        } else if (url && url.includes('auth-error')) {
            console.log('⚠️ Auth error deep link received');
            try {
                const queryString = url.split('?')[1] || '';
                const params = new URLSearchParams(queryString);
                const message = params.get('message');
                console.error('❌ OAuth error:', message);
            } catch (error) {
                console.error('❌ Error parsing auth-error link:', error);
            }
        } else {
            console.log('ℹ️ Deep link received but not an auth link:', url);
        }
        console.log('🔗 ========== END DEEP LINK HANDLER ==========');
    };

    const checkStoredAuth = async () => {
        try {
            const token = await SecureStore.getItemAsync('serverToken');
            const userJson = await SecureStore.getItemAsync('user');

            if (token && userJson) {
                setUser(JSON.parse(userJson));
            }
        } catch (error) {
            console.error('Error checking stored auth:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = async () => {
        try {
            console.log('🌐 Opening backend OAuth flow...');

            // Build the redirect URL for Expo Go
            let authRedirectUrl: string;

            // Check if we're in Expo Go (development)
            const expoConfig = Constants.expoConfig;
            const manifest2 = Constants.manifest2;

            console.log('📱 Expo Config:', expoConfig);
            console.log('📱 Manifest2:', manifest2);

            if (__DEV__ && manifest2?.extra?.expoGo) {
                // We're in Expo Go - use exp:// scheme
                const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;

                if (debuggerHost) {
                    authRedirectUrl = `exp://${debuggerHost}/--/auth-success`;
                    console.log('📱 Using Expo Go redirect URL:', authRedirectUrl);
                } else {
                    console.warn('⚠️ Could not determine Expo Go URL, falling back to custom scheme');
                    authRedirectUrl = `${env.deepLink.scheme}://auth-success`;
                }
            } else {
                // Standalone build or production
                authRedirectUrl = `${env.deepLink.scheme}://auth-success`;
                console.log('📱 Using custom scheme redirect URL:', authRedirectUrl);
            }

            // Backend expects 'scheme' parameter, not 'redirect'
            const authUrl = `${env.api.baseUrl}/api/auth/google/mobile?scheme=${encodeURIComponent(authRedirectUrl)}`;
            console.log('🔗 Backend auth URL:', authUrl);

            // Open the backend OAuth endpoint in browser
            const result = await WebBrowser.openAuthSessionAsync(
                authUrl,
                authRedirectUrl
            );

            console.log('✅ AuthSession result:', result);

            if (result.type === 'success' && result.url) {
                // The auth session completed and returned a URL - handle it
                console.log('🔗 AuthSession returned with URL:', result.url);
                handleAuthDeepLink(result.url);
            }
        } catch (error) {
            console.error('❌ Sign in error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        try {
            await SecureStore.deleteItemAsync('serverToken');
            await SecureStore.deleteItemAsync('user');
            setUser(null);
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                signIn,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};