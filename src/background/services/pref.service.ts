import { userPreferencesToDescriptions } from "../../constants";
// A class that persists boolean user preferences between sessions

export class PrefService {
    /**
     * Initializes the preference service by fetching all current preferences and
     * setting any not-found preferences to their default value (false).
     *
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        // Intializes preferences with default values (false) if not set
        const prefs = await this.getAllPreferences();
        console.log("===================");
        console.log(`Current preferences: ${JSON.stringify(prefs)}`);
        console.log("===================");

        for (const pref in userPreferencesToDescriptions) {
            if (prefs[pref] === undefined) {
                console.log(`Preference ${pref} not found, setting to false`);
                await this.setBooleanPreference(pref, false);
            }
        }
    }
    /**
     * Sets a boolean preference in local storage.
     *
     * @param {string} key - The key of the preference to set.
     * @param {boolean} value - The value to set for the preference.
     * @returns {Promise<true | null>} Returns true if the preference is set successfully,
     * or null if the preference key is invalid.
     */
    async setBooleanPreference(key: string, value: boolean): Promise<boolean | null> {
        if (!(Object.keys(userPreferencesToDescriptions).includes(key))) {
            console.error(`Preference ${key} is not valid`);
            return null;
        }

        chrome.storage.local.set({ [key]: value }).then(() => {
            console.log(`Preference ${key} set to ${value}`);
        });
        return true;
    }

    /**
     * Retrieves the boolean value of a specified preference from local storage.
     *
     * @param {string} key - The key of the preference to retrieve.
     * @returns {Promise<boolean | null>} A promise that resolves to the boolean value
     * of the preference if valid, or null if the preference key is invalid.
     */
    async getBooleanPreference(key: string): Promise<boolean | null> {
        if (!(Object.keys(userPreferencesToDescriptions).includes(key))) {
            console.error(`Preference ${key} is not valid`);
            return null;
        }

        const result = await chrome.storage.local.get(key);
        console.log(`Preference ${key} is ${result[key]}`);
        return result[key];
    }


    /**
     * Retrieves all boolean user preferences from local storage.
     * @returns {Promise<{[key: string]: boolean}>} A promise that resolves to an object
     * containing all boolean user preferences.
     */
    async getAllPreferences(): Promise<{ [key: string]: boolean }> {
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