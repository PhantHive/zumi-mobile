// src/styles/theme.ts
export const colors = {
    primary: '#6e254a',
    secondary: '#1a3e6a',
    background: '#0a0015', // Darker purple-black
    surface: 'rgba(0, 0, 0, 0.5)',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    accent: '#ff69b4', // Hot pink
    accentLight: '#ffb7c5',
    accentPurple: '#b565d8', // Zumi purple
    error: '#ff4081',
    success: '#4caf50',
    card: 'rgba(255, 255, 255, 0.1)',
    cardHover: 'rgba(255, 255, 255, 0.2)',
    // Pink glow colors matching desktop
    pinkGlow: 'rgba(255, 105, 180, 0.5)',
    pinkLight: 'rgba(255, 182, 193, 0.8)',
    pinkDark: 'rgba(255, 105, 180, 0.8)',
    // Kawaii color palette for albums
    kawaiPink: '#ff69b4',
    kawaiPurple: '#b565d8',
    kawaiBlue: '#6ec5ff',
    kawaiMint: '#7fffd4',
    kawaiPeach: '#ffb347',
    kawaiLavender: '#e6b3ff',
    kawaiCyan: '#00e5ff',
    kawaiCoral: '#ff6b9d',
};

// Album color variations based on artist/genre
export const albumColors: [string, string][] = [
    ['rgba(255, 105, 180, 0.15)', '#ff69b4'], // Pink
    ['rgba(181, 101, 216, 0.15)', '#b565d8'], // Purple
    ['rgba(110, 197, 255, 0.15)', '#6ec5ff'], // Blue
    ['rgba(127, 255, 212, 0.15)', '#7fffd4'], // Mint
    ['rgba(255, 179, 71, 0.15)', '#ffb347'],  // Peach
    ['rgba(230, 179, 255, 0.15)', '#e6b3ff'], // Lavender
    ['rgba(0, 229, 255, 0.15)', '#00e5ff'],   // Cyan
    ['rgba(255, 107, 157, 0.15)', '#ff6b9d'], // Coral
];

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    round: 9999,
};

export const typography = {
    h1: {
        fontSize: 32,
        fontWeight: 'bold' as const,
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold' as const,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
    },
    h4: {
        fontSize: 18,
        fontWeight: '600' as const,
    },
    body: {
        fontSize: 16,
        fontWeight: 'normal' as const,
    },
    subtitle1: {
        fontSize: 16,
        fontWeight: '500' as const,
    },
    caption: {
        fontSize: 14,
        fontWeight: 'normal' as const,
    },
    small: {
        fontSize: 12,
        fontWeight: 'normal' as const,
    },
};

// Animation configurations matching desktop design
export const animations = {
    wave: {
        duration1: 8000,
        duration2: 5000,
        duration3: 7000,
    },
    slidePanel: {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    fade: {
        duration: 200,
    },
};

// Shadow presets for consistent design
export const shadows = {
    pinkGlow: {
        shadowColor: 'rgba(255, 105, 180, 0.5)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 10,
    },
    accentGlow: {
        shadowColor: '#ff69b4',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
    },
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
};

// Helper to get album color based on index or artist name
export const getAlbumColor = (index: number, artistName?: string): [string, string] => {
    if (artistName) {
        // Generate consistent color based on artist name
        const hash = artistName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return albumColors[hash % albumColors.length];
    }
    return albumColors[index % albumColors.length];
};
