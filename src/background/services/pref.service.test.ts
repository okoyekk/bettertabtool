interface PreferenceDescription<T> {
    description: string;
    defaultValue: T;
    type: 'boolean' | 'string' | 'number';
}

const userPreferencesToDescriptions: { [K: string]: PreferenceDescription<any> } = {
    preferenceA: {
        description: 'PreferenceA Description',
        defaultValue: false,
        type: 'boolean',
    },
    preferenceB: {
        description: 'PreferenceB Description',
        defaultValue: 'auto',
        type: 'string',
    },
    preferenceC: {
        description: 'PreferenceC Description',
        defaultValue: 123,
        type: 'number',
    },
};

jest.mock('../../constants', () => ({
    userPreferencesToDescriptions: userPreferencesToDescriptions,
    ThemeMode: {} as any, // Mock ThemeMode if needed for types, though not directly used in PrefService
}));

import { PrefService } from './pref.service';

describe('PrefServiceTest', () => {
    let chromeStorageLocalSetMock: jest.Mock;
    let chromeStorageLocalGetMock: jest.Mock;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        chromeStorageLocalSetMock = jest.fn();
        chromeStorageLocalGetMock = jest.fn();

        (global as any).chrome = {
            storage: {
                local: {
                    set: chromeStorageLocalSetMock,
                    get: chromeStorageLocalGetMock,
                },
            },
        };
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        jest.restoreAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('init_setsUndefinedPrefsToDefaultValue', async () => {
        const prefService = new PrefService();
        chromeStorageLocalGetMock.mockResolvedValue({});

        await prefService.init();
        expect(chromeStorageLocalSetMock).toHaveBeenCalledWith({
            preferenceA: userPreferencesToDescriptions.preferenceA.defaultValue,
        });
        expect(chromeStorageLocalSetMock).toHaveBeenCalledWith({
            preferenceB: userPreferencesToDescriptions.preferenceB.defaultValue,
        });
        expect(chromeStorageLocalSetMock).toHaveBeenCalledWith({
            preferenceC: userPreferencesToDescriptions.preferenceC.defaultValue,
        });
        expect(chromeStorageLocalSetMock).toHaveBeenCalledTimes(Object.keys(userPreferencesToDescriptions).length);
    });

    it('init_doesNotAlterExistingPrefs', async () => {
        const prefService = new PrefService();
        const existingPrefs = {
            preferenceA: true,
            preferenceB: 'dark',
            preferenceC: 456,
        };
        chromeStorageLocalGetMock.mockResolvedValue(existingPrefs);

        await prefService.init();
        expect(chromeStorageLocalSetMock).not.toHaveBeenCalled();
    });

    it('setPreference_returnsNullForInvalidKey', async () => {
        const prefService = new PrefService();
        const result = await prefService.setPreference('invalidKey', true);
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith('Preference invalidKey is not valid');
        expect(chromeStorageLocalSetMock).not.toHaveBeenCalled();
    });

    it('setPreference_returnsNullForInvalidValueType', async () => {
        const prefService = new PrefService();
        const result = await prefService.setPreference('preferenceA', 'notABoolean');
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith(
            'Invalid type for preference preferenceA. Expected boolean, got string',
        );
        expect(chromeStorageLocalSetMock).not.toHaveBeenCalled();
    });

    it('setPreference_setsCorrectValueForValidKeyAndType', async () => {
        const prefService = new PrefService();
        const key = 'preferenceA';
        const value = true;
        const result = await prefService.setPreference(key, value);
        expect(result).toBe(true);
        expect(chromeStorageLocalSetMock).toHaveBeenCalledWith({ [key]: value });
    });

    it('getPreference_returnsNullForInvalidKey', async () => {
        const prefService = new PrefService();
        const result = await prefService.getPreference('invalidKey');
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith('Preference invalidKey is not valid');
        expect(chromeStorageLocalGetMock).not.toHaveBeenCalled();
    });

    it('getPreference_returnsDefaultValueIfNotFound', async () => {
        const prefService = new PrefService();
        const key = 'preferenceA';
        chromeStorageLocalGetMock.mockResolvedValue({});
        const result = await prefService.getPreference(key);
        expect(result).toBe(userPreferencesToDescriptions[key].defaultValue);
    });

    it('getPreference_returnsCorrectValueForValidKey', async () => {
        const prefService = new PrefService();
        const key = 'preferenceA';
        const value = true;
        chromeStorageLocalGetMock.mockResolvedValue({ [key]: value });
        const result = await prefService.getPreference(key);
        expect(result).toBe(value);
    });

    it('getAllPreferences_returnsAllPreferencesWithDefaults', async () => {
        const prefService = new PrefService();
        chromeStorageLocalGetMock.mockResolvedValue({
            preferenceA: true,
        });

        const allPreferences = await prefService.getAllPreferences();
        expect(allPreferences).toEqual({
            preferenceA: true,
            preferenceB: userPreferencesToDescriptions.preferenceB.defaultValue,
            preferenceC: userPreferencesToDescriptions.preferenceC.defaultValue,
        });
    });

    it('removeAllPreferences_removesAllPreferences', async () => {
        const prefService = new PrefService();
        const chromeStorageLocalRemoveMock = jest.fn();
        (global as any).chrome.storage.local.remove = chromeStorageLocalRemoveMock;
        await prefService.removeAllPreferences();
        expect(chromeStorageLocalRemoveMock).toHaveBeenCalledWith(Object.keys(userPreferencesToDescriptions));
    });
});
