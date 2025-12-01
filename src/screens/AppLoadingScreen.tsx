// src/screens/AppLoadingScreen.tsx
import React from 'react';
import { useMusic } from '../contexts/MusicContext';
import LoadingScreen from './LoadingScreen';

/**
 * Wrapper component that connects LoadingScreen to MusicContext
 * to display real-time loading progress as a full-screen overlay
 */
const AppLoadingScreen: React.FC = () => {
    const { loadingProgress } = useMusic();

    return (
        <LoadingScreen progress={loadingProgress} />
    );
};

export default AppLoadingScreen;
