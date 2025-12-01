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

// Helper function to get environment variable with fallback
const getEnvVar = (key: string, fallback: string = ''): string => {
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
        baseUrl: isDevelopment
            ? getEnvVar('EXPO_PUBLIC_API_URL', 'http://localhost:3000')
            : getEnvVar('EXPO_PUBLIC_API_URL_PRODUCTION', 'http://localhost:3000'),
    },
    deepLink: {
        scheme: getEnvVar('EXPO_PUBLIC_DEEP_LINK_SCHEME', 'exp'),
    },
};

// Log the loaded configuration for debugging
console.log('📱 Environment Configuration Loaded:');
console.log('  - Backend URL:', env.api.baseUrl);
console.log('  - Deep Link Scheme:', env.deepLink.scheme);
console.log('  - Is Development:', isDevelopment);

// Validate required environment variables
const validateEnv = () => {
    const missing: string[] = [];

    if (!env.googleAuth.expoClientId) missing.push('EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID');
    if (!env.api.baseUrl) missing.push('EXPO_PUBLIC_API_URL');
    if (!env.deepLink.scheme) missing.push('EXPO_PUBLIC_DEEP_LINK_SCHEME');

    if (missing.length > 0) {
        console.warn(
            '⚠️  Warning: Missing environment variables:\n' +
            missing.map(key => `   - ${key}`).join('\n') +
            '\n\nPlease check your .env file.'
        );
    }
};

// Validate on import
validateEnv();

export default env;
