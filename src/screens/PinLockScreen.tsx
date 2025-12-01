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
    const [pin, setPin] = useState<string>('');
    const [confirmPin, setConfirmPin] = useState<string>('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string>('');
    const shakeAnimation = new Animated.Value(0);

    const handleNumberPress = (num: number) => {
        if (error) setError('');

        const currentPin = isConfirming ? confirmPin : pin;
        if (currentPin.length < 4) {
            const newPin = currentPin + num.toString();

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

    const validatePin = async (enteredPin: string) => {
        try {
            const storedPin = await SecureStore.getItemAsync('userPin');
            const hashedEnteredPin = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                enteredPin
            );

            if (hashedEnteredPin === storedPin) {
                onUnlock();
            } else {
                showError('Incorrect PIN');
                setPin('');
            }
        } catch (error) {
            console.error('Error validating PIN:', error);
            showError('Error validating PIN');
            setPin('');
        }
    };

    const validateConfirmPin = (enteredPin: string) => {
        if (enteredPin === pin) {
            onSetPin?.(enteredPin);
            setPin('');
            setConfirmPin('');
            setIsConfirming(false);
        } else {
            showError('PINs do not match');
            setConfirmPin('');
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
                    <View
                        key={index}
                        style={[
                            styles.pinDot,
                            currentPin.length > index && styles.pinDotFilled,
                            error && styles.pinDotError,
                        ]}
                    />
                ))}
            </Animated.View>
        );
    };

    const renderKeypad = () => {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

        return (
            <View style={styles.keypad}>
                {numbers.map((num) => (
                    <TouchableOpacity
                        key={num}
                        style={styles.keypadButton}
                        onPress={() => handleNumberPress(num)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.keypadButtonText}>{num}</Text>
                    </TouchableOpacity>
                ))}
                <View style={styles.keypadButton} />
                <TouchableOpacity
                    style={styles.keypadButton}
                    onPress={() => handleNumberPress(0)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.keypadButtonText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.keypadButton}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                >
                    <Ionicons name="backspace-outline" size={28} color={colors.text} />
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
                                ? 'Choose a 4-digit PIN'
                                : isConfirming
                                ? 'Re-enter your PIN'
                                : 'Enter your 4-digit PIN'}
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl * 2,
    },
    title: {
        ...typography.h1,
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    errorText: {
        ...typography.body,
        color: '#ff6b6b',
        textAlign: 'center',
        fontWeight: '600',
    },
    pinDotsContainer: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.xxl * 2,
    },
    pinDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 2,
        borderColor: colors.textSecondary,
    },
    pinDotFilled: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    pinDotError: {
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.3)',
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 300,
        justifyContent: 'center',
        gap: spacing.md,
    },
    keypadButton: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    keypadButtonText: {
        ...typography.h2,
        color: colors.text,
        fontSize: 32,
    },
});

export default PinLockScreen;
