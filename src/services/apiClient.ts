// src/services/apiClient.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import env from '../config/env';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: env.api.baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add request interceptor to include auth token
        this.client.interceptors.request.use(
            async (config) => {
                const token = await SecureStore.getItemAsync('serverToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    // Handle token expiration - clear tokens and redirect to login
                    await SecureStore.deleteItemAsync('serverToken');
                    await SecureStore.deleteItemAsync('googleToken');
                }
                return Promise.reject(error);
            }
        );
    }

    async get<T>(endpoint: string): Promise<T> {
        const response: AxiosResponse<T> = await this.client.get(endpoint);
        return response.data;
    }

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        const response: AxiosResponse<T> = await this.client.post(endpoint, data);
        return response.data;
    }

    async authenticateWithGoogle(googleToken: string): Promise<{ user: any; token: string }> {
        console.log('📤 Sending to backend - Token length:', googleToken.length);
        console.log('📤 Request URL:', `${this.client.defaults.baseURL}/api/auth/google`);
        console.log('📤 Request body:', { googleToken: googleToken.substring(0, 50) + '...' });
        return this.post('/api/auth/google', { googleToken });
    }

    async getSongs(): Promise<{ data: any[] }> {
        return this.get('/api/songs');
    }

    async getAlbums(): Promise<{ data: string[] }> {
        return this.get('/api/songs/albums');
    }

    async getArtists(): Promise<{ data: string[] }> {
        return this.get('/api/songs/artists');
    }

    async uploadSong(formData: FormData): Promise<{ data: any }> {
        const response = await this.client.post('/api/songs', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    getStreamUrl(songId: number): string {
        return `${env.api.baseUrl}/api/songs/${songId}/stream`;
    }

    async getStreamUrlWithAuth(songId: number): Promise<string> {
        const token = await SecureStore.getItemAsync('serverToken');
        const url = `${env.api.baseUrl}/api/songs/${songId}/stream`;
        // Return URL with token in query params for audio streaming
        return token ? `${url}?token=${token}` : url;
    }

    getThumbnailUrl(filename: string): string {
        return `${env.api.baseUrl}/api/songs/thumbnails/${filename}`;
    }

    async getThumbnailUrlWithAuth(filename: string): Promise<string> {
        try {
            const token = await SecureStore.getItemAsync('serverToken');

            // Fetch the image as a blob with proper auth headers
            const response = await fetch(`${env.api.baseUrl}/api/songs/thumbnails/${filename}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                // Silently fail for missing thumbnails (404 is normal)
                throw new Error(`Failed to fetch thumbnail: ${response.status}`);
            }

            // Convert to blob and create data URL
            const blob = await response.blob();

            // For React Native, we need to use FileReader to convert blob to base64
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    resolve(base64data);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            // Silently fail - missing thumbnails are normal
            throw error;
        }
    }
}

export const apiClient = new ApiClient();