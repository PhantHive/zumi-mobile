// src/contexts/MusicContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import TrackPlayer, { State, Event } from 'react-native-track-player';
import { Alert, Linking } from 'react-native';
import { apiClient } from '../services/apiClient';
import { Song } from '../types';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';
import { trackPlayerService } from '../services/trackPlayerService';
import { PermissionService } from '../services/permissionService';
import { resizeArtworkForTrackPlayer } from '../utils/imageUtils';

interface Album {
    id: string;
    name: string;
    songs: Song[];
}

interface MusicContextType {
    albums: Album[];
    currentSong: Song | null;
    isPlaying: boolean;
    isLoading: boolean;
    loadingProgress: number;
    position: number;
    duration: number;
    refreshSongs: () => Promise<void>;
    startInitialLoad: () => void;
    playSong: (song: Song) => void;
    pauseSong: () => void;
    resumeSong: () => void;
    nextSong: () => void;
    previousSong: () => void;
    playRandomSong: () => void;
    seekTo: (positionMillis: number) => Promise<void>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const hasInitialLoad = React.useRef(false);
    const positionInterval = React.useRef<NodeJS.Timeout | null>(null);
    const trackPlayerInitialized = React.useRef(false);
    const { user } = useAuth();

    useEffect(() => {
        let mounted = true;

        const setupTrackPlayer = async () => {
            try {
                console.log('🔔 Requesting notification permissions...');
                const permissionGranted = await PermissionService.requestNotificationPermissions();

                if (!permissionGranted) {
                    console.warn('⚠️ Notification permission DENIED - TrackPlayer will NOT be initialized');
                    console.warn('⚠️ Music will still play but no lock screen controls');
                    // ❌ NE PAS INITIALISER si pas de permissions!
                    return;
                }

                console.log('🎵 Permissions granted, initializing TrackPlayer...');
                await trackPlayerService.initialize();
                trackPlayerInitialized.current = true;
                console.log('✅ TrackPlayer ready with lock screen controls!');
            } catch (error) {
                console.error('❌ Failed to initialize TrackPlayer:', error);
            }
        };

        if (!trackPlayerInitialized.current) {
            setupTrackPlayer();
        }

        const stateListener = TrackPlayer.addEventListener(Event.PlaybackState, async ({ state }) => {
            if (!mounted) return;
            setIsPlaying(state === State.Playing || state === State.Buffering);
        });

        const trackEndListener = TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async () => {
            if (!mounted) return;
            nextSong();
        });

        return () => {
            mounted = false;
            stateListener.remove();
            trackEndListener.remove();
            if (positionInterval.current) {
                clearInterval(positionInterval.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isPlaying) {
            positionInterval.current = setInterval(async () => {
                try {
                    const pos = await trackPlayerService.getPosition();
                    const dur = await trackPlayerService.getDuration();
                    setPosition(pos * 1000);
                    setDuration(dur * 1000);
                } catch (error) {
                    // Ignore
                }
            }, 1000);
        } else {
            if (positionInterval.current) {
                clearInterval(positionInterval.current);
            }
        }

        return () => {
            if (positionInterval.current) {
                clearInterval(positionInterval.current);
            }
        };
    }, [isPlaying]);

    const startInitialLoad = () => {
        if (user && !hasInitialLoad.current) {
            refreshSongs();
        }
    };

    const refreshSongs = async () => {
        const shouldShowLoading = albums.length === 0;

        try {
            if (shouldShowLoading) {
                setIsLoading(true);
                setLoadingProgress(0);
            }

            const response = await apiClient.getSongs();
            if (shouldShowLoading) setLoadingProgress(20);

            const filteredSongs = response.data.filter((song: Song) => {
                if (song.visibility === 'public' || !song.visibility) {
                    return true;
                }
                if (song.visibility === 'private') {
                    return song.uploadedBy === user?.email;
                }
                return true;
            });

            const genreMap = new Map<string, Song[]>();
            filteredSongs.forEach((song: Song) => {
                const genre = song.genre || 'Unknown Genre';
                if (!genreMap.has(genre)) {
                    genreMap.set(genre, []);
                }
                genreMap.get(genre)?.push(song);
            });

            const albumsArray: Album[] = Array.from(genreMap.entries()).map(([genre, songs]) => ({
                id: genre,
                name: genre,
                songs,
            }));

            console.log('📊 Songs grouped by genre:', albumsArray.map(a => `${a.name} (${a.songs.length} songs)`));
            setAlbums(albumsArray);
            if (shouldShowLoading) setLoadingProgress(40);

            if (shouldShowLoading && !hasInitialLoad.current) {
                const allSongs = filteredSongs;
                const totalSongs = allSongs.length;
                let loadedCount = 0;

                const preloadPromises = allSongs.map(async (song: Song) => {
                    if (song.thumbnailUrl) {
                        try {
                            await apiClient.getThumbnailUrlWithAuth(song.thumbnailUrl);
                            const filename = song.thumbnailUrl;
                            await apiClient.getImageColors(filename);

                            loadedCount++;
                            const progress = 40 + (loadedCount / totalSongs) * 60;
                            setLoadingProgress(Math.round(progress));
                        } catch (error) {
                            loadedCount++;
                            const progress = 40 + (loadedCount / totalSongs) * 60;
                            setLoadingProgress(Math.round(progress));
                        }
                    }
                });

                await Promise.all(preloadPromises);
                setLoadingProgress(100);
                console.log('✅ All resources loaded!');
                hasInitialLoad.current = true;
            }

        } catch (error) {
            console.error('Error fetching songs:', error);
        } finally {
            if (shouldShowLoading) {
                setTimeout(() => {
                    setIsLoading(false);
                    setLoadingProgress(0);
                }, 500);
            }
        }
    };

    const playSong = async (song: Song) => {
        try {
            // ✅ VÉRIFIER LES PERMISSIONS AVANT DE JOUER
            if (!trackPlayerInitialized.current) {
                console.warn('⚠️ TrackPlayer not initialized - requesting permissions');
                const granted = await PermissionService.requestNotificationPermissions();

                if (!granted) {
                    Alert.alert(
                        '🔔 Permissions Required',
                        'To show music controls on your lock screen, please enable notification permissions in Settings.\n\nYou can still play music without them.',
                        [
                            {
                                text: 'Play Without Controls',
                                style: 'cancel',
                                onPress: async () => {
                                    // Jouer quand même mais sans controls
                                    console.log('⚠️ Playing without lock screen controls');
                                    // La musique jouera via expo-av si nécessaire
                                }
                            },
                            {
                                text: 'Open Settings',
                                onPress: () => Linking.openSettings()
                            }
                        ]
                    );
                    return;
                }

                await trackPlayerService.initialize();
                trackPlayerInitialized.current = true;
            }

            const token = await SecureStore.getItemAsync('serverToken');
            const audioUrl = apiClient.getStreamUrl(song.id);

            console.log('🎵 Playing:', song.title, 'from', audioUrl);

            // 🖼️ Get and resize artwork to avoid TransactionTooLargeException
            let artworkUrl;
            if (song.thumbnailUrl) {
                try {
                    const originalArtworkUrl = await apiClient.getThumbnailUrlWithAuth(song.thumbnailUrl);
                    // Resize to 512x512 to stay under Android's 1MB binder limit
                    artworkUrl = await resizeArtworkForTrackPlayer(originalArtworkUrl);
                    console.log('✅ Artwork resized for TrackPlayer');
                } catch (e) {
                    console.warn('⚠️ Could not process artwork:', e);
                    // Continue without artwork rather than failing
                }
            }

            const track = {
                url: audioUrl,
                title: song.title,
                artist: song.artist || 'Unknown Artist',
                album: song.genre || 'Unknown Album',
                artwork: artworkUrl, // Now using resized artwork
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };

            await trackPlayerService.addAndPlay(track);
            setCurrentSong(song);
            setIsPlaying(true);

            const state = await trackPlayerService.getState();
            setIsPlaying(state === State.Playing || state === State.Buffering);
        } catch (error) {
            console.error('❌ Error playing song:', error);
            Alert.alert('Playback Error', 'Failed to play song. Please try again.');
        }
    };

    const pauseSong = async () => {
        try {
            await trackPlayerService.pause();
            setIsPlaying(false);
        } catch (error) {
            console.error('Error pausing:', error);
        }
    };

    const resumeSong = async () => {
        try {
            await trackPlayerService.play();
            setIsPlaying(true);
        } catch (error) {
            console.error('Error resuming:', error);
        }
    };

    const nextSong = () => {
        if (!currentSong) return;

        const allSongs = albums.flatMap(album => album.songs);
        const currentIndex = allSongs.findIndex(s => s.id === currentSong.id);

        if (currentIndex < allSongs.length - 1) {
            playSong(allSongs[currentIndex + 1]);
        } else {
            playSong(allSongs[0]);
        }
    };

    const previousSong = () => {
        if (!currentSong) return;

        const allSongs = albums.flatMap(album => album.songs);
        const currentIndex = allSongs.findIndex(s => s.id === currentSong.id);

        if (currentIndex > 0) {
            playSong(allSongs[currentIndex - 1]);
        }
    };

    const playRandomSong = () => {
        const allSongs = albums.flatMap(album => album.songs);
        if (allSongs.length === 0) return;

        const randomIndex = Math.floor(Math.random() * allSongs.length);
        playSong(allSongs[randomIndex]);
    };

    const seekTo = async (positionMillis: number) => {
        try {
            await trackPlayerService.seekTo(positionMillis / 1000);
        } catch (error) {
            console.error('Error seeking:', error);
        }
    };

    const value: MusicContextType = {
        albums,
        currentSong,
        isPlaying,
        isLoading,
        loadingProgress,
        position,
        duration,
        refreshSongs,
        startInitialLoad,
        playSong,
        pauseSong,
        resumeSong,
        nextSong,
        previousSong,
        playRandomSong,
        seekTo,
    };

    return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) {
        throw new Error('useMusic must be used within MusicProvider');
    }
    return context;
};