import { userPreferencesToDescriptions, ThemeMode } from './constants';

// compareFn for sorting preferences based on userPreferencesToDescriptions key order
const preferenceCompareFn = (a: string, b: string): number => {
    // Get the index of both strings in userPreferencesToDescriptions, if they exist
    const aIndex = Object.keys(userPreferencesToDescriptions).indexOf(a);
    const bIndex = Object.keys(userPreferencesToDescriptions).indexOf(b);

    // If both a and b exist in the record, compare their positions
    if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
    }

    // If only one exists in the record, prioritize the one that exists
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // If neither exists in the record, sort them alphabetically or in any way you prefer
    return a.localeCompare(b);
};

function detectContext() {
    if (typeof importScripts === 'function') {
        return 'background';
    }
    if (window.location.pathname.includes('popup')) {
        return 'popup';
    }
    return 'unknown';
}

/**
 * Detects the system's preferred color scheme.
 * @returns {'light' | 'dark'} The system's preferred theme.
 */
export function detectSystemTheme(): 'light' | 'dark' {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

/**
 * Determines the effective theme based on user preference and system theme.
 * @param themeMode The user's theme mode preference ('light', 'dark', or 'auto').
 * @returns {'light' | 'dark'} The effective theme to be applied.
 */
export function getEffectiveTheme(themeMode: ThemeMode): 'light' | 'dark' {
    if (themeMode === 'auto') {
        return detectSystemTheme();
    }
    return themeMode;
}

/**
 * Registers a listener for changes in the system's preferred color scheme.
 * @param callback A function to be called when the system theme changes,
 *                 receiving the new system theme ('light' or 'dark').
 */
export function onSystemThemeChange(callback: (theme: 'light' | 'dark') => void): void {
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
            callback(event.matches ? 'dark' : 'light');
        });
    }
}

export { preferenceCompareFn };

export const isPopup = () => detectContext() === 'popup';
export const isBackgroundPage = () => detectContext() === 'background';
