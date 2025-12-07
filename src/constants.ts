export type ThemeMode = 'light' | 'dark' | 'auto';

const userPreferencesToDescriptions: Record<string, string> = {
    showCopyNotification: 'Show notification on Copy Current Tab URL',
    makeNewTabsActive: 'Make newly created tabs active',
    confirmMergeWindows: 'Merge when the shortcut is pressed twice quickly',
    mergeSameDisplayOnly: 'Merge windows only if they are on the same display',
    themeMode: 'Theme mode (light/dark/auto)',
};

export { userPreferencesToDescriptions };
