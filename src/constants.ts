export type ThemeMode = 'light' | 'dark' | 'auto';

interface PreferenceDescription<T> {
    description: string;
    defaultValue: T;
    type: 'boolean' | 'string' | 'number'; // Extend as needed
}

const userPreferencesToDescriptions: { [K: string]: PreferenceDescription<any> } = {
    showCopyNotification: {
        description: 'Show notification on Copy Current Tab URL',
        defaultValue: false,
        type: 'boolean',
    },
    makeNewTabsActive: {
        description: 'Make newly created tabs active',
        defaultValue: false,
        type: 'boolean',
    },
    confirmMergeWindows: {
        description: 'Merge when the shortcut is pressed twice quickly',
        defaultValue: false,
        type: 'boolean',
    },
    mergeSameDisplayOnly: {
        description: 'Merge windows only if they are on the same display',
        defaultValue: false,
        type: 'boolean',
    },
    themeMode: {
        description: 'Theme mode (light/dark/auto)',
        defaultValue: 'auto',
        type: 'string',
    },
};

export { userPreferencesToDescriptions };
