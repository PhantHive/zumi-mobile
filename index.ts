import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';

// Register the playback service - MUST be at root level
TrackPlayer.registerPlaybackService(() => require('./service'));

registerRootComponent(App);