import { userPreferencesToDescriptions } from '../../constants';
// A class that persists user preferences between sessions

export class PrefService {
    /**
     * Initializes the preference service by fetching all current preferences and
     * setting any not-found preferences to their default value.
     *
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        // Intializes preferences with default values if not set
        const allKeys = Object.keys(userPreferencesToDescriptions);
        const rawPrefs = await chrome.storage.local.get(allKeys);

        for (const key in userPreferencesToDescriptions) {
            if (rawPrefs[key] === undefined) {
                // Set default values based on preference type
                await this.setPreference(key, userPreferencesToDescriptions[key].defaultValue);
            }
        }
    }

    /**
     * Sets a preference in local storage.
     *
     * @param {string} key - The key of the preference to set.
     * @param {any} value - The value to set for the preference.
     * @returns {Promise<true | null>} Returns true if the preference is set successfully,
     * or null if the preference key is invalid or value type is incorrect.
     */
    async setPreference(key: string, value: any): Promise<boolean | null> {
        if (!userPreferencesToDescriptions[key]) {
            console.error(`Preference ${key} is not valid`);
            return null;
        }

        const expectedType = userPreferencesToDescriptions[key].type;
        if (typeof value !== expectedType) {
            console.error(`Invalid type for preference ${key}. Expected ${expectedType}, got ${typeof value}`);
            return null;
        }

        await chrome.storage.local.set({ [key]: value });
        return true;
    }

    /**
     * Retrieves the value of a specified preference from local storage.
     *
     * @param {string} key - The key of the preference to retrieve.
     * @returns {Promise<any | null>} A promise that resolves to the value
     * of the preference if valid, or null if the preference key is invalid.
     */
    async getPreference(key: string): Promise<any | null> {
        if (!userPreferencesToDescriptions[key]) {
            console.error(`Preference ${key} is not valid`);
            return null;
        }

        const result = await chrome.storage.local.get(key);
        // If preference is not set, return the default value
        if (result[key] === undefined) {
            return userPreferencesToDescriptions[key].defaultValue;
        }
        return result[key];
    }

    /**
     * Retrieves all user preferences from local storage.
     * @returns {Promise<{[key: string]: any}>} A promise that resolves to an object
     * containing all user preferences.
     */
    async getAllPreferences(): Promise<{ [key: string]: any }> {
        const allKeys = Object.keys(userPreferencesToDescriptions);
        const result = await chrome.storage.local.get(allKeys);

        // Fill in default values for any unset preferences
        for (const key of allKeys) {
            if (result[key] === undefined) {
                result[key] = userPreferencesToDescriptions[key].defaultValue;
            }
        }
        return result;
    }

    /**
     * Removes all user preferences from local storage.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when all user preferences
     * have been removed from local storage.
     */
    async removeAllPreferences(): Promise<void> {
        let prefs = [...Object.keys(userPreferencesToDescriptions)];
        return await chrome.storage.local.remove(prefs);
    }
}
