// src/components/ZumiAssistant.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    TouchableWithoutFeedback,
    Dimensions,
    AppState,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Gyroscope } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { useMusic } from '../contexts/MusicContext';
import { useCarMode } from '../contexts/CarModeContext';
import { colors } from '../styles/theme';
import { videos, getRandomVideo } from '../utils/assets';
import { apiClient } from '../services/apiClient';
import * as SecureStore from 'expo-secure-store';

const INACTIVITY_TIMEOUT = 120000; // 2 minutes
const GYROSCOPE_THRESHOLD = 0.5; // Sensitivity for gyroscope movement

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ZumiAssistantProps {
    onUserActivity?: () => void;
}

const ZumiAssistant: React.FC<ZumiAssistantProps> = ({ onUserActivity }) => {
    const { isCarMode } = useCarMode();
    const { playRandomSong, isPlaying, currentSong } = useMusic();
    const [showControls, setShowControls] = useState(false);
    // Start with the greeting interaction
    const [currentVideo, setCurrentVideo] = useState(videos.zumiGreet);
    const [isInForeground, setIsInForeground] = useState(false);
    const [showSplitVideo, setShowSplitVideo] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [musicVideoUrl, setMusicVideoUrl] = useState<string | null>(null);
    const [useLoopVideo, setUseLoopVideo] = useState(false); // Switch to loop after intro
    const videoRef = useRef<any>(null);
    // new ref for split video (enjoy music or music video)
    const splitVideoRef = useRef<any>(null);
    // track whether we explicitly unloaded videos to free decoders when app backgrounded
    const wasUnloadedRef = useRef<boolean>(false);
    const fadeAnim = useRef(new Animated.Value(0.3)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const foregroundAnim = useRef(new Animated.Value(0)).current;
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
    const gyroscopeSubscription = useRef<any>(null);

    // New animations: glow for button and slide-up for bottom panel
    const glowAnim = useRef(new Animated.Value(0)).current;
    const slideUpAnim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = visible
    // Parallax animated values
    const parallax = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    useEffect(() => {
        // Subtle breathing animation
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0.65,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1.05,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0.45,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();

        // Glow loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Fetch music video URL when current song changes
    useEffect(() => {
        const fetchVideoUrl = async () => {
            if (currentSong && currentSong.videoUrl) {
                try {
                    // Check if the video exists by making a HEAD request
                    const token = await SecureStore.getItemAsync('serverToken');
                    const videoUrl = await apiClient.getVideoStreamUrlWithAuth(currentSong.id);
                    console.log('🎬 Music video URL prepared:', videoUrl);
                    setMusicVideoUrl(videoUrl);
                } catch (error) {
                    console.log('ℹ️ No music video available for this song');
                    setMusicVideoUrl(null);
                }
            } else {
                setMusicVideoUrl(null);
            }
        };

        fetchVideoUrl();
    }, [currentSong]);

    // Update assistant video based on playback state
    useEffect(() => {
        if (isPlaying) {
            setCurrentVideo(videos.zumiEnjoyMusic);
            setUseLoopVideo(false); // Start with intro video
            // Animate bottom panel sliding up with spring for natural feel
            Animated.spring(slideUpAnim, {
                toValue: 1,
                tension: 65,
                friction: 11,
                useNativeDriver: true
            }).start();

            // Delay video render to let audio decoder initialize first
            const timer = setTimeout(() => {
                setShowSplitVideo(true);
            }, 300);

            return () => clearTimeout(timer);
        } else {
            setShowSplitVideo(false);
            setUseLoopVideo(false); // Reset loop state
            // Slide panel down smoothly
            Animated.timing(slideUpAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true
            }).start();

            // Reset parallax
            Animated.spring(parallax, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true
            }).start();

            // Return to idle video
            setCurrentVideo(videos.zumiIdle);
        }
    }, [isPlaying]);

    // Ensure loop video starts playing when we switch to it
    useEffect(() => {
        if (useLoopVideo && splitVideoRef.current && !musicVideoUrl) {
            console.log('🔄 Starting loop video playback');
            setTimeout(() => {
                splitVideoRef.current?.playAsync?.();
            }, 150);
        }
    }, [useLoopVideo, musicVideoUrl]);

    // Inactivity detection
    useEffect(() => {
        resetInactivityTimer();
        return () => {
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
            }
        };
    }, []);

    // Gyroscope detection - only active when Zumi is in foreground
    useEffect(() => {
        if (isInForeground || isPlaying) {
            startGyroscopeDetection();
        } else {
            stopGyroscopeDetection();
        }

        return () => {
            stopGyroscopeDetection();
        };
    }, [isInForeground, isPlaying]);

    // AppState handling: unload heavy video resources when app goes to background
    useEffect(() => {
        const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState !== 'active') {
                // backgrounded or inactive -> pause and unload to free hardware decoders
                try {
                    videoRef.current?.pauseAsync?.();
                } catch (e) {
                    /* ignore */
                }
                try {
                    splitVideoRef.current?.pauseAsync?.();
                } catch (e) {
                    /* ignore */
                }

                try {
                    // unloadAsync is the key to free platform resources
                    videoRef.current?.unloadAsync?.();
                    splitVideoRef.current?.unloadAsync?.();
                    wasUnloadedRef.current = true;
                } catch (e) {
                    console.warn('Error unloading videos on background:', e);
                }
            } else {
                // app returned to foreground
                if (wasUnloadedRef.current) {
                    // attempt to replay the appropriate video
                    try {
                        if (isPlaying) {
                            splitVideoRef.current?.replayAsync?.();
                        } else {
                            videoRef.current?.replayAsync?.();
                        }
                        wasUnloadedRef.current = false;
                    } catch (e) {
                        console.warn('Error replaying videos on foreground:', e);
                    }
                }
            }
        };

        // RN >=0.65 returns a subscription object; older RN supports removeEventListener.
        let sub: { remove?: () => void } | null = null;
        try {
            if ((AppState as any).addEventListener) {
                sub = (AppState as any).addEventListener('change', handleAppStateChange);
            } else {
                // older RN - still call addEventListener (typed as any)
                (AppState as any).addEventListener('change', handleAppStateChange);
            }
        } catch (e) {
            // ignore
        }

        return () => {
            try {
                if (sub && typeof sub.remove === 'function') {
                    sub.remove();
                } else if ((AppState as any).removeEventListener) {
                    // legacy fallback
                    (AppState as any).removeEventListener('change', handleAppStateChange);
                }
            } catch (e) {
                // ignore
            }
        };
    }, [isPlaying]);

    // Global cleanup on unmount: clear timers, stop sensors, unload videos
    useEffect(() => {
        return () => {
            // clear inactivity timer
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
                inactivityTimer.current = null;
            }

            // stop gyroscope
            try {
                stopGyroscopeDetection();
            } catch (e) {
                // ignore
            }

            // attempt to unload video resources to avoid dangling decoders
            try {
                videoRef.current?.pauseAsync?.();
                videoRef.current?.unloadAsync?.();
            } catch (e) {
                // ignore
            }
            try {
                splitVideoRef.current?.pauseAsync?.();
                splitVideoRef.current?.unloadAsync?.();
            } catch (e) {
                // ignore
            }
        };
    }, []);

    const startGyroscopeDetection = () => {
        // Prevent starting if already running
        if (gyroscopeSubscription.current) {
            return;
        }

        Gyroscope.setUpdateInterval(150);

        gyroscopeSubscription.current = Gyroscope.addListener((data) => {
            const { x, y, z } = data;
            const movement = Math.abs(x) + Math.abs(y) + Math.abs(z);

            if (movement > GYROSCOPE_THRESHOLD) {
                resetInactivityTimer();
            }

            // Parallax effect while music playing
            if (isPlaying) {
                const px = Math.max(Math.min(y * -18, 22), -22);
                const py = Math.max(Math.min(x * 12, 18), -18);

                Animated.spring(parallax, {
                    toValue: { x: px, y: py },
                    friction: 7,
                    tension: 40,
                    useNativeDriver: true
                }).start();
            }
        });
    };

    const stopGyroscopeDetection = () => {
        if (gyroscopeSubscription.current) {
            try {
                gyroscopeSubscription.current.remove();
            } catch (e) {
                console.warn('Failed to remove gyroscope subscription:', e);
            }
            gyroscopeSubscription.current = null;
        }
    };

    const resetInactivityTimer = () => {
        // Clear existing timer
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
        }

        // If Zumi is in foreground, hide it
        if (isInForeground) {
            hideZumiFromForeground();
        }

        // Notify parent of user activity
        onUserActivity?.();

        // Start new timer
        inactivityTimer.current = setTimeout(() => {
            showZumiInForeground();
        }, INACTIVITY_TIMEOUT);
    };

    const showZumiInForeground = () => {
        setIsInForeground(true);
        Animated.timing(foregroundAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
        }).start();
    };

    const hideZumiFromForeground = () => {
        Animated.timing(foregroundAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
        }).start(() => {
            setIsInForeground(false);
        });
    };

    const handleZumiPress = () => {
        setShowControls(!showControls);
        resetInactivityTimer();

        // If currently playing music, focusing the assistant should show enjoy animation as well
        if (isPlaying) {
            setCurrentVideo(videos.zumiEnjoyMusic);
        } else {
            // Play random interaction video
            const randomVideo = getRandomVideo();
            setCurrentVideo(randomVideo);
        }
    };

    const handleChooseSong = () => {
        playRandomSong();
        setShowControls(false);
        resetInactivityTimer();
    };

    const handleScreenTouch = () => {
        resetInactivityTimer();
    };

    // Handle video playback status for smooth intro-to-loop transition
    const handleVideoPlaybackStatus = (status: any) => {
        // When the intro video finishes, switch to loop video
        if (!useLoopVideo && !musicVideoUrl && isPlaying) {
            // Method 1: Check didJustFinish
            if (status.didJustFinish) {
                console.log('🎬 Intro animation finished (didJustFinish), switching to loop');
                setUseLoopVideo(true);
                // Force video to replay with new source
                setTimeout(() => {
                    splitVideoRef.current?.playAsync?.();
                }, 100);
            }
            // Method 2: Check if we're at/near the end
            else if (status.isLoaded && status.durationMillis && status.positionMillis) {
                const remaining = status.durationMillis - status.positionMillis;
                // Switch when very close to end (within 200ms)
                if (remaining <= 200 && remaining > 0) {
                    console.log('🎬 Intro animation near end, switching to loop');
                    setUseLoopVideo(true);
                    // Force video to replay with new source
                    setTimeout(() => {
                        splitVideoRef.current?.playAsync?.();
                    }, 100);
                }
            }
        }
    };

    if (isCarMode) return null;

    // Glow interpolation for styles
    const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.35] });
    const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.08] });

    // Bottom panel height - 45% of screen when not fullscreen, 100% when fullscreen
    const BOTTOM_HEIGHT = isFullscreen ? SCREEN_HEIGHT : SCREEN_HEIGHT * 0.45;

    // Slide-up animation: translate from bottom (hidden) to visible position
    const slideTranslateY = slideUpAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [BOTTOM_HEIGHT, 0] // Start below screen, slide to position
    });

    return (
        <>
            {/* Background Hologram - always behind */}
            {!isPlaying && (
                <Animated.View
                    style={[
                        styles.hologramOverlay,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        }
                    ]}
                    pointerEvents="none"
                >
                    <Video
                        ref={videoRef}
                        source={currentVideo}
                        style={styles.hologramVideo}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay
                        isLooping
                        isMuted
                    />
                    {/* Hologram glow effect */}
                    <Animated.View
                        style={[
                            styles.hologramGlow,
                            { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }) }
                        ]}
                    />
                </Animated.View>
            )}

            {/* Bottom panel with video - slides up when music is playing */}
            {isPlaying && (
                <Animated.View
                    key="bottom-panel"
                    style={[
                        styles.bottomPanel,
                        {
                            height: BOTTOM_HEIGHT,
                            transform: [{ translateY: slideTranslateY }]
                        },
                        isFullscreen && styles.bottomPanelFullscreen,
                        musicVideoUrl && styles.bottomPanelMusicVideo
                    ]}
                    pointerEvents="auto"
                >
                    {/* Video background - music video if available, otherwise assistant animation */}
                    {showSplitVideo && (
                        <Video
                            key={musicVideoUrl ? `music-video-${currentSong?.id}` : (useLoopVideo ? "loop-video" : "intro-video")}
                            ref={splitVideoRef}
                            source={
                                musicVideoUrl
                                    ? { uri: musicVideoUrl }
                                    : (useLoopVideo ? videos.zumiEnjoyMusicLoop : videos.zumiEnjoyMusic)
                            }
                            style={styles.bottomVideo}
                            resizeMode={musicVideoUrl ? ResizeMode.CONTAIN : ResizeMode.COVER}
                            shouldPlay={true}
                            isLooping={musicVideoUrl || useLoopVideo} // Loop music videos and loop animation
                            isMuted={musicVideoUrl ? false : true}
                            volume={musicVideoUrl ? 0 : 1.0}
                            onPlaybackStatusUpdate={handleVideoPlaybackStatus}
                            progressUpdateIntervalMillis={100} // Check status every 100ms
                        />
                    )}

                    {/* Video expand icon button - top right */}
                    <TouchableOpacity
                        style={[
                            styles.videoExpandButton,
                            musicVideoUrl && styles.videoExpandButtonEnhanced
                        ]}
                        onPress={() => setIsFullscreen(!isFullscreen)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.videoIconWrapper}>
                            <Ionicons
                                name={isFullscreen ? "contract" : "expand"}
                                size={22}
                                color={musicVideoUrl ? '#fff' : colors.accent}
                            />
                        </View>
                    </TouchableOpacity>

                    {/* Show video label when music video is playing */}
                    {musicVideoUrl && !isFullscreen && (
                        <View style={styles.videoLabel}>
                            <Ionicons name="videocam" size={16} color={colors.accent} />
                            <Text style={styles.videoLabelText}>Music Video</Text>
                        </View>
                    )}

                    {/* Show song info when in fullscreen with music video */}
                    {musicVideoUrl && isFullscreen && currentSong && (
                        <View style={styles.fullscreenSongInfo}>
                            <Text style={styles.fullscreenSongTitle}>{currentSong.title}</Text>
                            <Text style={styles.fullscreenSongArtist}>{currentSong.artist}</Text>
                        </View>
                    )}

                    {/* Hologram frame overlay - only show for assistant video */}
                    {!musicVideoUrl && (
                        <Animated.View
                            style={[
                                styles.hologramFrame,
                                {
                                    opacity: glowAnim.interpolate({
                                        inputRange: [0, 1],
                                    outputRange: [0.7, 1]
                                }),
                            }
                        ]}
                        pointerEvents="none"
                    >
                        {/* Border glow */}
                        <View style={styles.frameBorder} />

                        {/* Corner markers */}
                        <View style={styles.cornerTopLeft} />
                        <View style={styles.cornerTopRight} />
                        <View style={styles.cornerBottomLeft} />
                        <View style={styles.cornerBottomRight} />

                        {/* Scanline effect */}
                        <Animated.View
                            style={[
                                styles.scanline,
                                {
                                    opacity: glowAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.05, 0.15]
                                    })
                                }
                            ]}
                        />
                    </Animated.View>
                    )}
                </Animated.View>
            )}

            {/* Foreground Zumi - appears after inactivity */}
            {/* Hide foreground if music is playing to avoid multiple heavy decoders at once */}
            {isInForeground && !isPlaying && (
                <TouchableWithoutFeedback onPress={handleScreenTouch}>
                    <Animated.View
                        style={[
                            styles.foregroundContainer,
                            {
                                opacity: foregroundAnim,
                                transform: [
                                    {
                                        scale: foregroundAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                    },
                                ],
                            }
                        ]}
                    >
                        <Video
                            source={currentVideo}
                            style={styles.foregroundVideo}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay
                            isLooping
                            isMuted
                        />
                        <Text style={styles.foregroundText}>Tap anywhere to continue...</Text>
                    </Animated.View>
                </TouchableWithoutFeedback>
            )}

            {/* Interactive Zumi Button - zoomed in portrait with white circle */}
            {!showSplitVideo && (
                <TouchableOpacity
                    style={styles.zumiButton}
                    onPress={handleZumiPress}
                    activeOpacity={0.9}
                >
                    <Animated.View style={[styles.zumiButtonInner, { transform: [{ scale: glowScale }], shadowOpacity: glowOpacity }]}>
                        {!isPlaying && (
                            <Video
                                source={videos.zumiGreet}
                                style={styles.zumiButtonVideo}
                                resizeMode={ResizeMode.COVER}
                                shouldPlay={true}
                                isLooping={true}
                                isMuted={true}
                            />
                        )}
                        {isPlaying && (
                            <View style={styles.zumiButtonPlaceholder} />
                        )}
                    </Animated.View>
                </TouchableOpacity>
            )}

            {/* Control Panel */}
            {showControls && (
                <Animated.View style={styles.controlPanel}>
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={handleZumiPress}
                    >
                        <Text style={styles.buttonText}>Hi Zumi! 👋</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={handleChooseSong}
                    >
                        <Text style={styles.buttonText}>Choose a song 🎵</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, styles.closeButton]}
                        onPress={() => {
                            setShowControls(false);
                            resetInactivityTimer();
                        }}
                    >
                        <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    // Hologram background overlay - brighter
    hologramOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        pointerEvents: 'none',
    },
    hologramVideo: {
        width: '100%',
        height: '100%',
        opacity: 0.45, // Increased from 0.25 to 0.45
    },
    hologramGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.accentPurple,
        opacity: 0.15,
        shadowColor: colors.accentPurple,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 40,
        elevation: 5,
    },
    // Bottom panel for video playback - slides up from bottom
    bottomPanel: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        backgroundColor: 'rgba(5, 0, 15, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        borderTopWidth: 3,
        borderTopColor: colors.accentPurple,
        shadowColor: colors.accentPurple,
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.7,
        shadowRadius: 30,
        overflow: 'hidden',
        elevation: 10,
    },
    bottomPanelFullscreen: {
        top: 0, // Expand to full screen
        borderTopWidth: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.98)',
    },
    bottomPanelMusicVideo: {
        backgroundColor: 'rgba(0, 0, 0, 0.98)', // Darker background for music videos
    },
    bottomVideo: {
        width: '100%',
        height: '100%',
    },
    videoLabel: {
        position: 'absolute',
        top: 16,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    videoLabelText: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    videoExpandButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.accent,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 8,
    },
    videoExpandButtonEnhanced: {
        backgroundColor: 'rgba(181, 101, 216, 0.3)',
        borderColor: '#fff',
        shadowColor: '#fff',
        shadowOpacity: 0.5,
    },
    videoIconWrapper: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenSongInfo: {
        position: 'absolute',
        bottom: 80,
        left: 24,
        right: 24,
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingVertical: 20,
        paddingHorizontal: 24,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.accentPurple,
        shadowColor: colors.accentPurple,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 20,
    },
    fullscreenSongTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    fullscreenSongArtist: {
        color: colors.accent,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    hologramFrame: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
    },
    scanline: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.accentPurple,
        opacity: 0.1,
    },
    frameBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 2,
        borderTopWidth: 4,
        borderColor: colors.accentPurple,
        shadowColor: colors.accentPurple,
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.7,
        shadowRadius: 25,
    },
    cornerTopLeft: {
        position: 'absolute',
        top: 12,
        left: 12,
        width: 30,
        height: 30,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderColor: colors.accent,
        opacity: 0.9,
    },
    cornerTopRight: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 30,
        height: 30,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderColor: colors.accent,
        opacity: 0.9,
    },
    cornerBottomLeft: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        width: 30,
        height: 30,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderColor: colors.accent,
        opacity: 0.9,
    },
    cornerBottomRight: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 30,
        height: 30,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderColor: colors.accent,
        opacity: 0.9,
    },
    // Foreground Zumi - appears after inactivity
    foregroundContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998, // Just below mini player (9999)
        backgroundColor: 'rgba(10, 0, 25, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    foregroundVideo: {
        width: '100%',
        height: '100%',
    },
    foregroundText: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.7,
        letterSpacing: 0.5,
    },
    // Interactive Zumi button - zoomed and white circle
    zumiButton: {
        position: 'absolute',
        top: 28, // bumped up a bit
        right: 18,
        width: 96,
        height: 96,
        borderRadius: 48,
        zIndex: 3000,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.accentPurple,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 12,
    },
    zumiButtonInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    zumiButtonVideo: {
        width: '160%',
        height: '160%',
        transform: [{ scale: 1.4 }, { translateY: 25 }], // move DOWN more to show head
    },
    zumiButtonPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.accentPurple,
        opacity: 0.3,
    },
    pinkGlow: {
        position: 'absolute',
        top: -8,
        left: -8,
        right: -8,
        bottom: -8,
        borderRadius: 43,
        backgroundColor: colors.accentPurple,
        opacity: 0.25,
        zIndex: -1,
    },
    // Control panel - elegant and minimal
    controlPanel: {
        position: 'absolute',
        top: 140,
        right: 18,
        backgroundColor: 'rgba(10, 0, 25, 0.95)',
        borderRadius: 16,
        padding: 14,
        gap: 8,
        zIndex: 1001,
        minWidth: 170,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(181, 101, 216, 0.2)',
    },
    controlButton: {
        backgroundColor: 'rgba(181, 101, 216, 0.15)',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 0,
    },
    closeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'transparent',
    },
    buttonText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});

export default ZumiAssistant;
