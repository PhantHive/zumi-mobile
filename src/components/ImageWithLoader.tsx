// src/components/ImageWithLoader.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Image, StyleSheet, Animated, ImageSourcePropType, ImageURISource, ImageStyle, ViewStyle, StyleProp } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { images } from '../utils/assets';

interface ImageWithLoaderProps {
    source: ImageSourcePropType;
    defaultSource?: number | ImageURISource; // native image resource id or uri
    // image style only - ensures compatibility with <Image>
    style?: StyleProp<ImageStyle>;
    containerStyle?: StyleProp<ViewStyle>;
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
    const [resolvedSource, setResolvedSource] = useState<ImageSourcePropType | undefined>(undefined);
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

    // Resolve file:// or cache URIs to ensure the image exists. If missing, use placeholder.
    useEffect(() => {
        let mounted = true;

        async function resolve() {
            try {
                // If source is an object with uri property, check it
                if (typeof source === 'object' && source !== null && 'uri' in source) {
                    const uri = (source as ImageURISource).uri || '';
                    // For local file URIs (file://) or app cache paths (/data/...), verify existence
                    if (uri.startsWith('file:') || uri.startsWith('/data') || uri.startsWith(FileSystem.cacheDirectory || '')) {
                        try {
                            const info = await FileSystem.getInfoAsync(uri);
                            if (mounted && info.exists) {
                                setResolvedSource(source);
                                return;
                            }
                        } catch (e) {
                            // getInfoAsync can throw for malformed paths; fall through to placeholder
                        }
                        // fall back to placeholder
                        if (mounted) setResolvedSource(images.placeholder);
                        return;
                    }
                }

                // Otherwise use the provided source (remote URL or static resource)
                if (mounted) setResolvedSource(source);
            } catch (e) {
                if (mounted) setResolvedSource(images.placeholder);
            }
        }

        resolve();

        return () => {
            mounted = false;
        };
    }, [source]);

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-200, 200],
    });

    return (
        <View style={[styles.container, containerStyle]}>
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

            {/* Actual image - always rendered to maintain layout. Let the Image control sizing via its style (aspectRatio or explicit height). */}
            <Animated.View style={{ opacity: fadeAnim }}>
                <Image
                    source={resolvedSource || images.placeholder}
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
        // Ensure the component fills available width but do not force height — let child Image's aspectRatio determine height
        width: '100%',
        alignSelf: 'stretch',
    },
    image: {
        width: '100%',
        // Don't force a height here. Let callers provide aspectRatio or explicit height.
        height: undefined,
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
