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
        const prefs = await this.getAllPreferences();

        for (const pref in userPreferencesToDescriptions) {
            if (prefs[pref] === undefined) {
                // Set default values based on preference type
                if (pref === 'themeMode') {
                    await this.setPreference(pref, 'auto');
                } else {
                    await this.setPreference(pref, false);
                }
            }
        }
    }

    /**
     * Sets a preference in local storage.
     *
     * @param {string} key - The key of the preference to set.
     * @param {any} value - The value to set for the preference.
     * @returns {Promise<true | null>} Returns true if the preference is set successfully,
     * or null if the preference key is invalid.
     */
    async setPreference(key: string, value: any): Promise<boolean | null> {
        if (!Object.keys(userPreferencesToDescriptions).includes(key)) {
            console.error(`Preference ${key} is not valid`);
            return null;
        }

        await chrome.storage.local.set({ [key]: value });
        return true;
    }

    /**
     * Sets a boolean preference in local storage.
     * @deprecated Use setPreference instead.
     *
     * @param {string} key - The key of the preference to set.
     * @param {boolean} value - The value to set for the preference.
     * @returns {Promise<true | null>} Returns true if the preference is set successfully,
     * or null if the preference key is invalid.
     */
    async setBooleanPreference(key: string, value: boolean): Promise<boolean | null> {
        return this.setPreference(key, value);
    }

    /**
     * Retrieves the value of a specified preference from local storage.
     *
     * @param {string} key - The key of the preference to retrieve.
     * @returns {Promise<any | null>} A promise that resolves to the value
     * of the preference if valid, or null if the preference key is invalid.
     */
    async getPreference(key: string): Promise<any | null> {
        if (!Object.keys(userPreferencesToDescriptions).includes(key)) {
            console.error(`Preference ${key} is not valid`);
            return null;
        }

        const result = await chrome.storage.local.get(key);
        return result[key];
    }

    /**
     * Retrieves the boolean value of a specified preference from local storage.
     * @deprecated Use getPreference instead.
     *
     * @param {string} key - The key of the preference to retrieve.
     * @returns {Promise<boolean | null>} A promise that resolves to the boolean value
     * of the preference if valid, or null if the preference key is invalid.
     */
    async getBooleanPreference(key: string): Promise<boolean | null> {
        return this.getPreference(key);
    }

    /**
     * Retrieves all user preferences from local storage.
     * @returns {Promise<{[key: string]: any}>} A promise that resolves to an object
     * containing all user preferences.
     */
    async getAllPreferences(): Promise<{ [key: string]: any }> {
        return await chrome.storage.local.get(Object.keys(userPreferencesToDescriptions));
    }

    /**
     * Removes all boolean user preferences from local storage.
     *
     * @async
     * @returns {Promise<void>} A promise that resolves when all boolean user preferences
     * have been removed from local storage.
     */
    async removeAllPreferences(): Promise<void> {
        let prefs = [...Object.keys(userPreferencesToDescriptions)];
        return await chrome.storage.local.remove(prefs);
    }
}
