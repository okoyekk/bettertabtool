const userPreferencesToDescriptions: Record<string, string> = {
    preferenceA: 'PreferenceA Description',
    preferenceB: 'PreferenceB Description',
    preferenceC: 'PreferenceC Description',
};

jest.mock('../../constants', () => ({
    userPreferencesToDescriptions: userPreferencesToDescriptions,
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

    it('init_setsUndefinedPrefsToFalse', async () => {
        const prefService = new PrefService();
        chromeStorageLocalGetMock.mockResolvedValue({});

        await prefService.init();
        expect(chromeStorageLocalSetMock).toHaveBeenCalledWith({ preferenceA: false });
        expect(chromeStorageLocalSetMock).toHaveBeenCalledTimes(Object.keys(userPreferencesToDescriptions).length);
    });

    it('init_doesNotAlterExistingPrefs', async () => {
        const prefService = new PrefService();

        let firstPrefKey = Object.keys(userPreferencesToDescriptions)[0];

        chromeStorageLocalGetMock.mockResolvedValue({
            firstPrefKey: true,
        });

        await prefService.init();
        expect(chromeStorageLocalSetMock).not.toHaveBeenCalledWith({ firstPrefKey: false });
        expect(chromeStorageLocalSetMock).toHaveBeenCalledTimes(Object.keys(userPreferencesToDescriptions).length);
    });

    it('init_doesNotSetPrefsWhenAllExist', async () => {
        const allPrefsSetToTrue = Object.fromEntries(
            Object.keys(userPreferencesToDescriptions).map((key) => [key, true]),
        );
        chromeStorageLocalGetMock.mockResolvedValue(allPrefsSetToTrue);

        const prefService = new PrefService();
        await prefService.init();

        expect(chromeStorageLocalSetMock).not.toHaveBeenCalled();
    });

    it('setBooleanPreference_returnsNullForInvalidKey', async () => {
        const prefService = new PrefService();
        const result = await prefService.setBooleanPreference('invalidKey', true);
        expect(result).toBeNull();
        expect(chromeStorageLocalSetMock).not.toHaveBeenCalled();
    });

    it('getBooleanPreference_returnsNullForInvalidKey', async () => {
        const prefService = new PrefService();
        const result = await prefService.getBooleanPreference('invalidKey');
        expect(result).toBeNull();
        expect(chromeStorageLocalGetMock).not.toHaveBeenCalled();
    });

    it('getBooleanPreference_returnsCorrectValueForValidKey', async () => {
        const prefService = new PrefService();
        const key = Object.keys(userPreferencesToDescriptions)[0];
        const value = true;
        chromeStorageLocalGetMock.mockResolvedValue({ [key]: value });
        const result = await prefService.getBooleanPreference(key);
        expect(result).toBe(value);
        expect(chromeStorageLocalGetMock).toHaveBeenCalledWith(key);
    });

    it('removeAllPreferences_removesAllPreferences', async () => {
        const prefService = new PrefService();
        const chromeStorageLocalRemoveMock = jest.fn();
        (global as any).chrome.storage.local.remove = chromeStorageLocalRemoveMock;
        await prefService.removeAllPreferences();
        expect(chromeStorageLocalRemoveMock).toHaveBeenCalledWith(Object.keys(userPreferencesToDescriptions));
    });
});
