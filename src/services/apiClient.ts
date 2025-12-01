// src/services/apiClient.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import env from '../config/env';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        console.log('🌐 Initializing API Client with baseURL:', env.api.baseUrl);

        this.client = axios.create({
            baseURL: env.api.baseUrl,
            timeout: 15000, // 15 second timeout to prevent hanging forever
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add request interceptor to include auth token
        this.client.interceptors.request.use(
            async (config) => {
                console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
                const token = await SecureStore.getItemAsync('serverToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                console.error('❌ Request interceptor error:', error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => {
                console.log('✅ API Response:', response.config.method?.toUpperCase(), response.config.url, 'Status:', response.status);
                return response;
            },
            async (error) => {
                if (error.code === 'ECONNABORTED') {
                    console.error('⏱️ Request timeout - server took too long to respond');
                } else if (error.code === 'ERR_NETWORK') {
                    console.error('🌐 Network error - cannot reach server at:', env.api.baseUrl);
                } else if (error.response?.status === 401) {
                    console.error('🔒 Unauthorized - clearing tokens');
                    // Handle token expiration - clear tokens and redirect to login
                    await SecureStore.deleteItemAsync('serverToken');
                    await SecureStore.deleteItemAsync('googleToken');
                } else {
                    console.error('❌ API Error:', error.message, 'Code:', error.code);
                }
                return Promise.reject(error);
            }
        );
    }

    async get<T>(endpoint: string): Promise<T> {
        try {
            const response: AxiosResponse<T> = await this.client.get(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('❌ GET request failed:', endpoint, error.message);
            throw error;
        }
    }

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        try {
            const response: AxiosResponse<T> = await this.client.post(endpoint, data);
            return response.data;
        } catch (error: any) {
            console.error('❌ POST request failed:', endpoint, error.message);
            throw error;
        }
    }

    async put<T>(endpoint: string, data?: unknown): Promise<T> {
        try {
            const response: AxiosResponse<T> = await this.client.put(endpoint, data);
            return response.data;
        } catch (error: any) {
            console.error('❌ PUT request failed:', endpoint, error.message);
            throw error;
        }
    }

    async delete<T>(endpoint: string): Promise<T> {
        try {
            const response: AxiosResponse<T> = await this.client.delete(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('❌ DELETE request failed:', endpoint, error.message);
            throw error;
        }
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

    async getMyUploads(): Promise<{ data: any[] }> {
        return this.get('/api/songs/my-uploads');
    }

    async getLikedSongs(): Promise<{ data: any[] }> {
        return this.get('/api/songs/liked');
    }

    async getAlbums(): Promise<{ data: string[] }> {
        return this.get('/api/songs/albums');
    }

    async getArtists(): Promise<{ data: string[] }> {
        return this.get('/api/songs/artists');
    }

    async toggleLike(songId: number): Promise<any> {
        return this.post(`/api/songs/${songId}/like`);
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

    async getImageColors(filename: string): Promise<any> {
        return this.get(`/api/songs/thumbnails/${filename}/colors`);
    }

    // PIN Management APIs
    async setPin(pinHash: string): Promise<{ message: string }> {
        console.log('🔐 Setting PIN on server');
        return this.post('/api/profile/pin', { pinHash });
    }

    async verifyPin(pinHash: string): Promise<{ valid: boolean }> {
        console.log('🔐 Verifying PIN with server');
        return this.post('/api/profile/pin/verify', { pinHash });
    }

    async deletePin(): Promise<{ message: string }> {
        console.log('🔐 Deleting PIN from server');
        return this.delete('/api/profile/pin');
    }

    async getUserProfile(): Promise<any> {
        console.log('👤 Fetching user profile');
        return this.get('/api/profile');
    }
}

export const apiClient = new ApiClient();