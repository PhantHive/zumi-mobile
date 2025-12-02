// src/contexts/MusicContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Audio } from 'expo-av';
import { apiClient } from '../services/apiClient';
import { Song } from '../types';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';
import { mediaSessionService } from '../services/mediaSessionService';

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
    startInitialLoad: () => void; // NEW: Manual trigger for initial load
    playSong: (song: Song) => void;
    pauseSong: () => void;
    resumeSong: () => void;
    nextSong: () => void;
    previousSong: () => void;
    playRandomSong: () => void;
    seekTo: (positionMillis: number) => Promise<void>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

interface MusicProviderProps {
    children: ReactNode;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Start as false
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const soundRef = React.useRef<Audio.Sound | null>(null);
    const hasInitialLoad = React.useRef(false);
    const { user } = useAuth();

    // Configure audio mode and initialize media session
    useEffect(() => {
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
        });

        // Initialize media session service
        mediaSessionService.initialize().then(() => {
            // Set up control handlers
            mediaSessionService.setControls({
                play: resumeSong,
                pause: pauseSong,
                next: nextSong,
                previous: previousSong,
                seekTo: seekTo,
            });
        });

        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
            mediaSessionService.hide();
        };
    }, []);

    // Update media session when playback state changes
    useEffect(() => {
        if (currentSong) {
            mediaSessionService.updateMetadata(
                {
                    title: currentSong.title,
                    artist: currentSong.artist || 'Unknown Artist',
                    album: currentSong.genre || 'Unknown Album',
                    artwork: currentSong.thumbnailUrl,
                },
                isPlaying,
                duration,
                position
            );
        }
    }, [currentSong, isPlaying, duration, position]);

    // Manual trigger for initial load - called AFTER pin unlock
    const startInitialLoad = () => {
        if (user && !hasInitialLoad.current) {
            refreshSongs();
        }
    };

    const refreshSongs = async () => {
        // Don't show loading if we already have data (for pull-to-refresh)
        const shouldShowLoading = albums.length === 0;

        try {
            if (shouldShowLoading) {
                setIsLoading(true);
                setLoadingProgress(0);
            }

            // Step 1: Fetch songs metadata
            const response = await apiClient.getSongs();
            if (shouldShowLoading) setLoadingProgress(20);

            // Filter songs based on visibility
            const filteredSongs = response.data.filter((song: Song) => {
                if (song.visibility === 'public' || !song.visibility) {
                    return true;
                }
                if (song.visibility === 'private') {
                    return song.uploadedBy === user?.email;
                }
                return true;
            });

            // Group songs by genre
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

            // Step 2: Preload thumbnails and colors ONLY on initial load
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
            // Unload previous sound
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            // Get authenticated stream URL
            const token = await SecureStore.getItemAsync('serverToken');
            const audioUrl = apiClient.getStreamUrl(song.id);

            console.log('Playing:', song.title, 'from', audioUrl);

            // Create and play new sound with auth headers
            const { sound } = await Audio.Sound.createAsync(
                {
                    uri: audioUrl,
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );

            soundRef.current = sound;
            setCurrentSong(song);
            setIsPlaying(true);

            // Update media session
            mediaSessionService.updateMetadata(
                {
                    title: song.title,
                    artist: song.artist || 'Unknown Artist',
                    album: song.genre || 'Unknown Album',
                    artwork: song.thumbnailUrl,
                },
                true,
                0,
                0
            );
        } catch (error) {
            console.error('Error playing song:', error);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setPosition(status.positionMillis);
            setDuration(status.durationMillis);

            // Auto-play next song when current one finishes
            if (status.didJustFinish) {
                nextSong();
            }
        }
    };

    const pauseSong = async () => {
        if (soundRef.current) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
            mediaSessionService.updatePlaybackState(false, position);
        }
    };

    const resumeSong = async () => {
        if (soundRef.current) {
            await soundRef.current.playAsync();
            setIsPlaying(true);
            mediaSessionService.updatePlaybackState(true, position);
        }
    };

    const nextSong = () => {
        if (!currentSong) return;

        const allSongs = albums.flatMap(album => album.songs);
        const currentIndex = allSongs.findIndex(s => s.id === currentSong.id);

        if (currentIndex < allSongs.length - 1) {
            playSong(allSongs[currentIndex + 1]);
        } else {
            // Loop back to first song
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
        if (soundRef.current) {
            try {
                await soundRef.current.setPositionAsync(positionMillis);
            } catch (error) {
                console.error('Error seeking:', error);
            }
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
