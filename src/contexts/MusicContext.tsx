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
                console.log('Requesting notification permissions...');
                const permissionGranted = await PermissionService.requestNotificationPermissions();

                if (!permissionGranted) {
                    console.warn('Notification permission DENIED - TrackPlayer will NOT be initialized');
                    console.warn('Music will still play but no lock screen controls');
                    return;
                }

                console.log('Permissions granted, initializing TrackPlayer...');
                await trackPlayerService.initialize();
                trackPlayerInitialized.current = true;
                console.log('TrackPlayer ready with lock screen controls!');
            } catch (error) {
                console.error('Failed to initialize TrackPlayer:', error);
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

            // Debug: log sample metadata and counts to help diagnose grouping issues on mobile
            try {
                const sample = (filteredSongs || []).slice(0, 10).map(s => ({
                    id: s.id,
                    title: s.title,
                    genre: s.genre,
                    albumId: (s as any).albumId,
                    album: (s as any).album,
                    uploadedBy: s.uploadedBy,
                }));
                console.log('DEBUG: sample filtered songs metadata:', JSON.stringify(sample, null, 2));

                const albumCounts: Record<string, number> = {};
                const genreCounts: Record<string, number> = {};
                (filteredSongs || []).forEach(s => {
                    const a = (s as any).albumId || '__noAlbum';
                    const g = s.genre || '__noGenre';
                    albumCounts[a] = (albumCounts[a] || 0) + 1;
                    genreCounts[g] = (genreCounts[g] || 0) + 1;
                });
                console.log('DEBUG: albumCounts:', JSON.stringify(albumCounts));
                console.log('DEBUG: genreCounts:', JSON.stringify(genreCounts));
            } catch (e) {
                console.warn('DEBUG: failed to log sample metadata', e);
            }

            // Prefer grouping by albumId if available; otherwise group by genre.
            const groupMap = new Map<string, Song[]>();
            const nameMap = new Map<string, string>();

            filteredSongs.forEach((song: Song) => {
                // Determine grouping key in order: albumId (preferred), album name (readable), then genre
                const albumId = (song as any).albumId || '';
                const albumNameField = (song as any).album || '';
                const genreKey = song.genre || 'Unknown Genre';

                const key = albumId || albumNameField || genreKey;

                if (!groupMap.has(key)) {
                    groupMap.set(key, []);
                }
                groupMap.get(key)?.push(song);

                // Prefer a friendly display name: albumNameField > albumId > genre
                if (albumNameField) {
                    nameMap.set(key, albumNameField);
                } else if (albumId) {
                    nameMap.set(key, albumId);
                } else {
                    nameMap.set(key, genreKey);
                }
            });

            const albumsArray: Album[] = Array.from(groupMap.entries()).map(([key, songs]) => ({
                id: key,
                name: nameMap.get(key) || key,
                songs,
            }));

            console.log('Songs grouped by genre:', albumsArray.map(a => `${a.name} (${a.songs.length} songs)`));
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
                console.log('All resources loaded!');
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
            console.log('============ PLAY SONG START ============');
            console.log('Song:', song.title, 'ID:', song.id);

            // Check permissions
            if (!trackPlayerInitialized.current) {
                console.warn('TrackPlayer not initialized - requesting permissions');
                const granted = await PermissionService.requestNotificationPermissions();

                if (!granted) {
                    Alert.alert(
                        'Permissions Required',
                        'To show music controls on your lock screen, please enable notification permissions in Settings.\n\nYou can still play music without them.',
                        [
                            {
                                text: 'Play Without Controls',
                                style: 'cancel',
                                onPress: async () => {
                                    console.log('Playing without lock screen controls');
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
            console.log('Audio URL:', audioUrl);

            // Process artwork with detailed logging
            let artworkUrl;
            if (song.thumbnailUrl) {
                try {
                    console.log('Step 1: Getting thumbnail URL...');
                    const originalArtworkUrl = await apiClient.getThumbnailUrlWithAuth(song.thumbnailUrl);
                    console.log('Step 2: Got original artwork, type:', originalArtworkUrl?.substring(0, 50));

                    if (originalArtworkUrl) {
                        console.log('Step 3: Resizing artwork...');
                        const resizedUrl = await resizeArtworkForTrackPlayer(originalArtworkUrl);
                        console.log('Step 4: Resize complete:', resizedUrl?.substring(0, 100));

                        if (resizedUrl) {
                            artworkUrl = resizedUrl;
                            console.log('SUCCESS: Using resized artwork');
                        } else {
                            console.warn('WARNING: Resize returned null, using original');
                            artworkUrl = originalArtworkUrl;
                        }
                    } else {
                        console.warn('WARNING: No original artwork URL returned');
                    }
                } catch (e) {
                    console.error('ERROR processing artwork:', e);
                    // Continue without artwork
                }
            } else {
                console.log('INFO: No thumbnail URL for this song');
            }

            console.log('Final artwork URL:', artworkUrl ? 'SET' : 'NONE');

            const track = {
                id: song.id,
                url: audioUrl,
                title: song.title,
                artist: song.artist || 'Unknown Artist',
                album: song.genre || 'Unknown Album',
                artwork: artworkUrl,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };

            console.log('Track prepared:', {
                id: track.id,
                title: track.title,
                hasArtwork: !!track.artwork
            });

            await trackPlayerService.addAndPlay(track);
            setCurrentSong(song);
            setIsPlaying(true);

            const state = await trackPlayerService.getState();
            setIsPlaying(state === State.Playing || state === State.Buffering);

            console.log('============ PLAY SONG END ============');
        } catch (error) {
            console.error('Error playing song:', error);
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