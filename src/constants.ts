export type ThemeMode = 'light' | 'dark' | 'auto';

interface PreferenceDescription<T> {
    description: string;
    defaultValue: T;
    type: 'boolean' | 'string' | 'number'; // Extend as needed
}

const userPreferencesToDescriptions: { [K: string]: PreferenceDescription<any> } = {
    showCopyNotification: {
        description: 'Notify when copying tab URL',
        defaultValue: false,
        type: 'boolean',
    },
    makeNewTabsActive: {
        description: 'Make new tabs active',
        defaultValue: false,
        type: 'boolean',
    },
    confirmMergeWindows: {
        description: 'Confirm merging with double press',
        defaultValue: false,
        type: 'boolean',
    },
    mergeSameDisplayOnly: {
        description: 'Merge windows on same display only',
        defaultValue: false,
        type: 'boolean',
    },
    themeMode: {
        description: 'Theme mode',
        defaultValue: 'auto',
        type: 'string',
    },
};

export { userPreferencesToDescriptions };
