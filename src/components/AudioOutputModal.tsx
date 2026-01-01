// src/components/AudioOutputModal.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '../styles';
import { routeToPhoneSpeaker, routeToBluetooth, isSpeakerphoneOn } from '../services/audioRoutingService';

interface AudioOutputModalProps {
    visible: boolean;
    onClose: () => void;
}

const AudioOutputModal: React.FC<AudioOutputModalProps> = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const [selectedDevice, setSelectedDevice] = useState<'phone' | 'bluetooth'>('bluetooth');

    useEffect(() => {
        if (visible) {
            checkCurrentOutput();
        }
    }, [visible]);

    const checkCurrentOutput = async () => {
        const isSpeaker = await isSpeakerphoneOn();
        setSelectedDevice(isSpeaker ? 'phone' : 'bluetooth');
    };

    const handlePhoneClick = async () => {
        await routeToPhoneSpeaker();
        setSelectedDevice('phone');
        setTimeout(() => onClose(), 300);
    };

    const handleBluetoothClick = async () => {
        await routeToBluetooth();
        setSelectedDevice('bluetooth');
        setTimeout(() => onClose(), 300);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Audio Output</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.deviceList}>
                            {/* This Phone */}
                            <TouchableOpacity
                                style={[
                                    styles.deviceItem,
                                    selectedDevice === 'phone' && styles.deviceItemSelected,
                                ]}
                                onPress={handlePhoneClick}
                                activeOpacity={0.7}
                            >
                                <View style={styles.deviceIcon}>
                                    <Ionicons
                                        name="phone-portrait"
                                        size={24}
                                        color={selectedDevice === 'phone' ? colors.accent : colors.text}
                                    />
                                </View>

                                <View style={styles.deviceInfo}>
                                    <Text
                                        style={[
                                            styles.deviceName,
                                            selectedDevice === 'phone' && styles.deviceNameSelected,
                                        ]}
                                    >
                                        This Phone
                                    </Text>
                                </View>

                                {selectedDevice === 'phone' && (
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={24}
                                        color={colors.accent}
                                    />
                                )}
                            </TouchableOpacity>

                            {/* Bluetooth */}
                            <TouchableOpacity
                                style={[
                                    styles.deviceItem,
                                    selectedDevice === 'bluetooth' && styles.deviceItemSelected,
                                ]}
                                onPress={handleBluetoothClick}
                                activeOpacity={0.7}
                            >
                                <View style={styles.deviceIcon}>
                                    <Ionicons
                                        name="bluetooth"
                                        size={24}
                                        color={selectedDevice === 'bluetooth' ? colors.accent : colors.text}
                                    />
                                </View>

                                <View style={styles.deviceInfo}>
                                    <Text
                                        style={[
                                            styles.deviceName,
                                            selectedDevice === 'bluetooth' && styles.deviceNameSelected,
                                        ]}
                                    >
                                        Bluetooth Device
                                    </Text>
                                    <Text style={styles.deviceHint}>
                                        Echo, Galaxy Buds, etc.
                                    </Text>
                                </View>

                                {selectedDevice === 'bluetooth' && (
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={24}
                                        color={colors.accent}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.helpSection}>
                            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                            <Text style={styles.helpText}>
                                Tap to switch audio output instantly.
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '40%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        ...typography.h2,
        color: colors.text,
        fontSize: 20,
    },
    closeButton: {
        padding: spacing.sm,
    },
    scrollView: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    deviceList: {
        paddingTop: spacing.md,
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    deviceItemSelected: {
        backgroundColor: 'rgba(255, 105, 180, 0.15)',
        borderWidth: 1,
        borderColor: colors.accent,
    },
    deviceIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    deviceInfo: {
        flex: 1,
    },
    deviceName: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
    },
    deviceNameSelected: {
        color: colors.accent,
    },
    deviceHint: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    helpSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: spacing.md,
        gap: spacing.sm,
    },
    helpText: {
        ...typography.caption,
        color: colors.textSecondary,
        flex: 1,
        lineHeight: 16,
        fontSize: 12,
    },
});

export default AudioOutputModal;