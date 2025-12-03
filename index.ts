import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './src/services/trackPlayerService';

import App from './App';

// Register the playback service BEFORE the app starts
TrackPlayer.registerPlaybackService(() => PlaybackService);

// TrackPlayer will be initialized in MusicContext after permissions are granted
registerRootComponent(App);
