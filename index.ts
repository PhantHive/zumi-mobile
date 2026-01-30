import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';

const playbackService = require('./src/services/playbackHandler');

TrackPlayer.registerPlaybackService(() => playbackService);

registerRootComponent(App);