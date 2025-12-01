// src/components/ImageWithLoader.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Image, StyleSheet, Animated, ImageSourcePropType, ImageURISource, ImageStyle, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../styles/theme';

interface ImageWithLoaderProps {
    source: ImageSourcePropType;
    defaultSource?: number | ImageURISource; // Fix: Use correct type for defaultSource
    style?: ImageStyle;
    containerStyle?: ViewStyle;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    onLoadEnd?: () => void;
}

const ImageWithLoader: React.FC<ImageWithLoaderProps> = ({
    source,
    defaultSource,
    style,
    containerStyle,
    resizeMode = 'cover',
    onLoadEnd,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Shimmer animation for loading state
        const shimmerAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        );
        shimmerAnimation.start();

        return () => {
            shimmerAnimation.stop();
        };
    }, [shimmerAnim]);

    const handleLoadStart = () => {
        setIsLoading(true);
        setHasError(false);
        fadeAnim.setValue(0);
    };

    const handleLoadEnd = () => {
        setIsLoading(false);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
        onLoadEnd?.();
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
        fadeAnim.setValue(1);
    };

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-200, 200],
    });

    return (
        <View style={[styles.container, containerStyle, style]}>
            {/* Loading skeleton - only show while loading and no error */}
            {isLoading && !hasError && (
                <View style={[styles.skeleton, StyleSheet.absoluteFillObject]}>
                    <LinearGradient
                        colors={[
                            'rgba(255, 255, 255, 0.05)',
                            'rgba(255, 255, 255, 0.1)',
                            'rgba(255, 255, 255, 0.05)',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.skeletonGradient}
                    />
                    <Animated.View
                        style={[
                            styles.shimmer,
                            {
                                transform: [{ translateX: shimmerTranslate }],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={[
                                'transparent',
                                'rgba(255, 255, 255, 0.15)',
                                'transparent',
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.shimmerGradient}
                        />
                    </Animated.View>
                </View>
            )}

            {/* Actual image - always rendered to maintain layout */}
            <Animated.View style={{ opacity: fadeAnim, width: '100%', height: '100%' }}>
                <Image
                    source={source}
                    defaultSource={defaultSource}
                    style={[styles.image, style]}
                    resizeMode={resizeMode}
                    onLoadStart={handleLoadStart}
                    onLoadEnd={handleLoadEnd}
                    onError={handleError}
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    skeleton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    skeletonGradient: {
        flex: 1,
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: -200,
        right: -200,
        bottom: 0,
        width: 200,
    },
    shimmerGradient: {
        flex: 1,
    },
});

export default ImageWithLoader;
