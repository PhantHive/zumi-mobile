// src/utils/colorExtractor.ts

export interface ExtractedColors {
    background: string;
    primary: string;
    secondary: string;
    detail: string;
    vibrant: string;
    muted: string;
}

// Cache to avoid re-fetching colors for the same image
const colorCache = new Map<string, ExtractedColors>();

/**
 * Extract colors from image using backend API
 * This uses native image processing libraries for perfect results
 */
export const extractColorsFromImage = async (filename: string): Promise<ExtractedColors> => {
    try {
        // Check cache first
        if (colorCache.has(filename)) {
            return colorCache.get(filename)!;
        }

        // Import dynamically to avoid circular dependency
        const { apiClient } = await import('../services/apiClient');

        // Get colors from backend
        const colors = await apiClient.getImageColors(filename);

        // Cache the result
        colorCache.set(filename, colors);

        return colors;
    } catch (error) {
        console.warn('Color extraction failed:', error);
        // Return elegant fallback colors
        return {
            background: '#1a1a2e',
            primary: '#6e4f8f',
            secondary: '#4a3a6e',
            detail: '#8e6faf',
            vibrant: '#9370db',
            muted: '#5a4a6e',
        };
    }
};

// Hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
};

// Hex to RGBA with smooth opacity
export const hexToRgba = (hex: string, alpha: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return `rgba(26, 26, 46, ${alpha})`;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

// Clear cache when needed
export const clearColorCache = () => {
    colorCache.clear();
};
