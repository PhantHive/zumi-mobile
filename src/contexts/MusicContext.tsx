// src/contexts/MusicContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Audio } from 'expo-av';
import { apiClient } from '../services/apiClient';
import { Song } from '../types';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';

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
    position: number;
    duration: number;
    refreshSongs: () => Promise<void>;
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
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const soundRef = React.useRef<Audio.Sound | null>(null);
    const { user } = useAuth();

    // Configure audio mode
    useEffect(() => {
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
        });

        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const refreshSongs = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.getSongs();

            // Filter songs based on visibility
            const filteredSongs = response.data.filter((song: Song) => {
                // Show public songs to everyone
                if (song.visibility === 'public' || !song.visibility) {
                    return true;
                }
                // Show private songs only to the uploader
                if (song.visibility === 'private') {
                    return song.uploadedBy === user?.email;
                }
                return true;
            });

            // Group songs by genre first, then by album within each genre
            const genreMap = new Map<string, Song[]>();
            filteredSongs.forEach((song: Song) => {
                const genre = song.genre || 'Unknown Genre';
                if (!genreMap.has(genre)) {
                    genreMap.set(genre, []);
                }
                genreMap.get(genre)?.push(song);
            });

            // Convert to album array grouped by genre
            const albumsArray: Album[] = Array.from(genreMap.entries()).map(([genre, songs]) => ({
                id: genre,
                name: genre,
                songs,
            }));

            console.log('📊 Songs grouped by genre:', albumsArray.map(a => `${a.name} (${a.songs.length} songs)`));
            setAlbums(albumsArray);
        } catch (error) {
            console.error('Error fetching songs:', error);
        } finally {
            setIsLoading(false);
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
        }
    };

    const resumeSong = async () => {
        if (soundRef.current) {
            await soundRef.current.playAsync();
            setIsPlaying(true);
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

    const getSound = () => soundRef.current;

    return (
        <MusicContext.Provider
            value={{
                albums,
                currentSong,
                isPlaying,
                isLoading,
                position,
                duration,
                refreshSongs,
                playSong,
                pauseSong,
                resumeSong,
                nextSong,
                previousSong,
                playRandomSong,
                seekTo,
                getSound,
            }}
        >
            {children}
        </MusicContext.Provider>
    );
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) {
        throw new Error('useMusic must be used within MusicProvider');
    }
    return context;
};
