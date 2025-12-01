// src/utils/colorExtractor.ts
import * as ImageManipulator from 'expo-image-manipulator';

export interface ExtractedColors {
    background: string;
    primary: string;
    secondary: string;
    detail: string;
}

// Cache to avoid re-extracting colors for the same image
const colorCache = new Map<string, ExtractedColors>();

// Simple but effective color extraction using image sampling
export const extractColorsFromImage = async (imageUri: string): Promise<ExtractedColors> => {
    try {
        // Check cache first
        if (colorCache.has(imageUri)) {
            return colorCache.get(imageUri)!;
        }

        // For now, generate beautiful colors based on a hash of the URI
        // This provides consistent colors per image without heavy processing
        const hash = simpleHash(imageUri);

        // Generate a base hue from the hash (0-360)
        const baseHue = hash % 360;

        // Create a color scheme based on the hue
        const extractedColors: ExtractedColors = {
            background: hslToHex(baseHue, 35, 12), // Dark, muted
            primary: hslToHex(baseHue, 75, 55), // Vibrant
            secondary: hslToHex(baseHue, 50, 25), // Medium dark
            detail: hslToHex((baseHue + 30) % 360, 60, 65), // Lighter, slightly shifted hue
        };

        // Cache the result
        colorCache.set(imageUri, extractedColors);

        return extractedColors;
    } catch (error) {
        console.error('Color extraction error:', error);
        // Return subtle default colors if extraction fails
        return {
            background: '#1a1a2e',
            primary: '#6e4f8f',
            secondary: '#4a3a6e',
            detail: '#8e6faf',
        };
    }
};

// Simple hash function for string
const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
};

// Convert HSL to Hex color
const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

// Helper function to darken a color
const darkenColor = (hex: string, factor: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const r = Math.floor(rgb.r * factor);
    const g = Math.floor(rgb.g * factor);
    const b = Math.floor(rgb.b * factor);

    return rgbToHex(r, g, b);
};

// Helper function to lighten a color
const lightenColor = (hex: string, factor: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor));

    return rgbToHex(r, g, b);
};

// Convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    // Remove # if present
    hex = hex.replace('#', '');

    // Handle shorthand hex (e.g., #fff)
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return null;
    }

    return { r, g, b };
};

// Helper to convert RGB to hex
const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b]
        .map(x => {
            const hex = Math.max(0, Math.min(255, x)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        })
        .join('');
};

// Helper function to convert hex to rgba - exported for use in components
export const hexToRgba = (hex: string, alpha: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return `rgba(26, 26, 46, ${alpha})`;

    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

// Clear cache when needed (optional, for memory management)
export const clearColorCache = () => {
    colorCache.clear();
};
