// src/utils/version.ts

/**
 * Compare two semantic version strings
 * @param version1 - First version (e.g., "1.0.5")
 * @param version2 - Second version (e.g., "1.0.4")
 * @returns 1 if version1 > version2, -1 if version1 < version2, 0 if equal
 */
export const compareVersions = (version1: string, version2: string): number => {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;

        if (v1Part > v2Part) return 1;
        if (v1Part < v2Part) return -1;
    }

    return 0;
};

/**
 * Check if version1 is greater than version2
 */
export const isNewerVersion = (version1: string, version2: string): boolean => {
    return compareVersions(version1, version2) > 0;
};

/**
 * Check if version meets minimum required version
 */
export const meetsMinimumVersion = (currentVersion: string, minVersion: string): boolean => {
    return compareVersions(currentVersion, minVersion) >= 0;
};

/**
 * Format version for display
 */
export const formatVersion = (version: string): string => {
    return `v${version}`;
};

