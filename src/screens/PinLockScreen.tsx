// src/screens/PinLockScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Vibration,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { colors, spacing, typography } from '../styles/theme';
import { apiClient } from '../services/apiClient';

// Symbol options for PIN
const SYMBOLS = [
    { id: 0, emoji: '🦋', name: 'Butterfly' },
    { id: 1, emoji: '🐍', name: 'Snake' },
    { id: 2, emoji: '🌸', name: 'Flower' },
    { id: 3, emoji: '🦊', name: 'Fox' },
    { id: 4, emoji: '🐝', name: 'Bee' },
    { id: 5, emoji: '🌺', name: 'Hibiscus' },
    { id: 6, emoji: '🦅', name: 'Eagle' },
    { id: 7, emoji: '🐢', name: 'Turtle' },
    { id: 8, emoji: '🌻', name: 'Sunflower' },
];

interface PinLockScreenProps {
    onUnlock: () => void;
    onSetPin?: (pin: string) => void;
    isSettingPin?: boolean;
    title?: string;
}

const PinLockScreen: React.FC<PinLockScreenProps> = ({
    onUnlock,
    onSetPin,
    isSettingPin = false,
    title,
}) => {
    const [pin, setPin] = useState<number[]>([]);
    const [confirmPin, setConfirmPin] = useState<number[]>([]);
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string>('');
    const shakeAnimation = new Animated.Value(0);

    const handleSymbolPress = (symbolId: number) => {
        if (error) setError('');

        const currentPin = isConfirming ? confirmPin : pin;
        if (currentPin.length < 4) {
            const newPin = [...currentPin, symbolId];

            if (isConfirming) {
                setConfirmPin(newPin);
                if (newPin.length === 4) {
                    validateConfirmPin(newPin);
                }
            } else {
                setPin(newPin);
                if (newPin.length === 4) {
                    if (isSettingPin) {
                        setIsConfirming(true);
                    } else {
                        validatePin(newPin);
                    }
                }
            }
        }
    };

    const handleDelete = () => {
        if (error) setError('');

        if (isConfirming) {
            setConfirmPin(confirmPin.slice(0, -1));
        } else {
            setPin(pin.slice(0, -1));
        }
    };

    const validatePin = async (enteredPin: number[]) => {
        try {
            const pinString = enteredPin.join(',');
            const hashedEnteredPin = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                pinString
            );

            // Try server verification first
            try {
                const result = await apiClient.verifyPin(hashedEnteredPin);
                if (result.valid) {
                    // Store locally for offline use
                    await SecureStore.setItemAsync('userPin', hashedEnteredPin);
                    onUnlock();
                    return;
                } else {
                    showError('Incorrect PIN');
                    setPin([]);
                    return;
                }
            } catch (serverError) {
                console.log('🔄 Server verification failed, trying local verification');
                // Fallback to local verification if server is unreachable
                const storedPin = await SecureStore.getItemAsync('userPin');
                if (storedPin && hashedEnteredPin === storedPin) {
                    onUnlock();
                } else {
                    showError('Incorrect PIN');
                    setPin([]);
                }
            }
        } catch (error) {
            console.error('Error validating PIN:', error);
            showError('Error validating PIN');
            setPin([]);
        }
    };

    const validateConfirmPin = (enteredPin: number[]) => {
        if (JSON.stringify(enteredPin) === JSON.stringify(pin)) {
            const pinString = enteredPin.join(',');
            onSetPin?.(pinString);
            setPin([]);
            setConfirmPin([]);
            setIsConfirming(false);
        } else {
            showError('PINs do not match');
            setConfirmPin([]);
        }
    };

    const showError = (message: string) => {
        setError(message);
        Vibration.vibrate([0, 100, 100, 100]);

        // Shake animation
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const currentPin = isConfirming ? confirmPin : pin;

    const getTitle = () => {
        if (title) return title;
        if (isSettingPin) {
            return isConfirming ? 'Confirm your PIN' : 'Create a PIN';
        }
        return 'Enter your PIN';
    };

    const renderPinDots = () => {
        return (
            <Animated.View
                style={[
                    styles.pinDotsContainer,
                    { transform: [{ translateX: shakeAnimation }] }
                ]}
            >
                {[0, 1, 2, 3].map((index) => (
                    <View key={index} style={styles.pinDotContainer}>
                        {currentPin.length > index ? (
                            <Text style={styles.pinSymbol}>
                                {SYMBOLS[currentPin[index]].emoji}
                            </Text>
                        ) : (
                            <View
                                style={[
                                    styles.pinDot,
                                    error && styles.pinDotError,
                                ]}
                            />
                        )}
                    </View>
                ))}
            </Animated.View>
        );
    };

    const renderKeypad = () => {
        return (
            <View style={styles.keypad}>
                {SYMBOLS.map((symbol) => (
                    <TouchableOpacity
                        key={symbol.id}
                        style={styles.keypadButton}
                        onPress={() => handleSymbolPress(symbol.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.symbolText}>{symbol.emoji}</Text>
                        <Text style={styles.symbolName}>{symbol.name}</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity
                    style={styles.keypadButton}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                >
                    <Ionicons name="backspace-outline" size={32} color={colors.text} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Ionicons name="lock-closed" size={60} color={colors.accent} />
                    <Text style={styles.title}>{getTitle()}</Text>
                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : (
                        <Text style={styles.subtitle}>
                            {isSettingPin && !isConfirming
                                ? 'Choose 4 symbols for your PIN'
                                : isConfirming
                                ? 'Re-enter your symbol PIN'
                                : 'Enter your 4-symbol PIN'}
                        </Text>
                    )}
                </View>

                {renderPinDots()}
                {renderKeypad()}
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
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    header: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: spacing.lg,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: spacing.sm,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    errorText: {
        fontSize: 16,
        color: colors.error,
        marginTop: spacing.sm,
        fontWeight: '600',
    },
    pinDotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.lg,
        marginVertical: spacing.xl,
    },
    pinDotContainer: {
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pinDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    pinDotError: {
        borderColor: colors.error,
        backgroundColor: 'rgba(255, 59, 48, 0.2)',
    },
    pinSymbol: {
        fontSize: 48,
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: 350,
        gap: spacing.sm,
    },
    keypadButton: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    symbolText: {
        fontSize: 36,
    },
    symbolName: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 4,
        fontWeight: '500',
    },
});

export default PinLockScreen;
