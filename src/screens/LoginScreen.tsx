// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, typography, borderRadius } from '../styles/theme';
import { images } from '../utils/assets';

const LoginScreen: React.FC = () => {
    const { signIn } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async () => {
        try {
            setIsLoading(true);
            await signIn();
        } catch (error) {
            Alert.alert('Sign In Error', 'Failed to sign in. Please try again.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.container}
        >
            <View style={styles.content}>
                {/* Zumi Avatar */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Image source={images.zumi} style={styles.zumiImage} resizeMode="contain" />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Zumi Music</Text>
                <Text style={styles.subtitle}>Your kawaii music companion</Text>

                {/* Sign In Button */}
                <TouchableOpacity
                    style={styles.signInButton}
                    onPress={handleSignIn}
                    disabled={isLoading}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <>
                            <Ionicons name="logo-google" size={24} color={colors.primary} />
                            <Text style={styles.buttonText}>Sign in with Google</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                    Sign in to access your music library
                </Text>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    avatarContainer: {
        marginBottom: spacing.xxl,
    },
    avatar: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: colors.accentLight,
        overflow: 'hidden',
    },
    zumiImage: {
        width: '100%',
        height: '100%',
    },
    title: {
        ...typography.h1,
        color: colors.text,
        marginBottom: spacing.sm,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.xxl,
        textAlign: 'center',
    },
    signInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.xl,
        gap: spacing.md,
        minWidth: 250,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '600',
    },
    disclaimer: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xl,
        textAlign: 'center',
    },
});

export default LoginScreen;