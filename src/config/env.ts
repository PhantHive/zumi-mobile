// src/config/env.ts
import Constants from 'expo-constants';

/**
 * Environment configuration for the app
 * Uses EXPO_PUBLIC_ prefix for environment variables accessible in the app
 */
interface EnvConfig {
    googleAuth: {
        expoClientId: string;
        iosClientId: string;
        androidClientId: string;
        webClientId: string;
    };
    api: {
        baseUrl: string;
    };
    deepLink: {
        scheme: string;
    };
}

// Get config from app.json extra field (works in standalone builds)
const extra = Constants.expoConfig?.extra || {};

// Helper function to get environment variable with fallback
const getEnvVar = (key: string, fallback: string = ''): string => {
    // In standalone builds, use Constants.expoConfig.extra
    // In development, use process.env
    if (extra[key]) {
        return extra[key];
    }
    return process.env[key] || fallback;
};

// Determine if we're in development mode
const isDevelopment = __DEV__;

const env: EnvConfig = {
    googleAuth: {
        expoClientId: getEnvVar('EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID', ''),
        iosClientId: getEnvVar('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', ''),
        androidClientId: getEnvVar('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', ''),
        webClientId: getEnvVar('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', ''),
    },
    api: {
        // Use the apiUrl from app.json extra field
        baseUrl: extra.apiUrl || getEnvVar('EXPO_PUBLIC_API_URL', 'https://api.international.phearion.fr/zumi'),
    },
    deepLink: {
        scheme: extra.deepLinkScheme || getEnvVar('EXPO_PUBLIC_DEEP_LINK_SCHEME', 'exp'),
    },
};

// Log the loaded configuration for debugging
console.log('📱 Environment Configuration Loaded:');
console.log('  - Backend URL:', env.api.baseUrl);
console.log('  - Deep Link Scheme:', env.deepLink.scheme);
console.log('  - Is Development:', isDevelopment);

export default env;
