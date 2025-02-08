import { ClipboardService } from './services/clipboard.service';
import { ContextMenuService } from './services/contextmenu.service';
import { PrefService } from './services/pref.service';
import { TabService } from './services/tab.service';

const prefService = new PrefService();
const tabService = new TabService(prefService);
const clipboardService = new ClipboardService(tabService, prefService);
const contextMenuService = new ContextMenuService(tabService, prefService);

chrome.runtime.onInstalled.addListener(() => {
    console.log('BetterTabTool installed!');
    contextMenuService.init();
    prefService.init();
});

// Init the context menu service on startup
chrome.runtime.onStartup.addListener(() => {
    contextMenuService.init();
    prefService.init();
});

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy-current-tab-url') {
        await clipboardService.copyCurrentTabUrl();
    } else if (command === 'open-new-tab-in-current-group') {
        await tabService.openNewTabInGroup();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handleMessage = async () => {
        try {
            switch (message.type) {
                case 'PREF_setBooleanPreference': {
                    const result = await prefService.setBooleanPreference(
                        message.key,
                        message.value
                    );
                    if (result === null) {
                        return { success: false, error: 'Invalid preference key' };
                    }
                    const prefs = await prefService.getAllPreferences();
                    return { success: true, preferences: prefs };
                }

                case 'PREF_getBooleanPreference': {
                    const value = await prefService.getBooleanPreference(message.key);
                    if (value === null) {
                        return { success: false, error: 'Invalid preference key' };
                    }
                    return { success: true, value };
                }

                case 'PREF_getAllPreferences': {
                    const prefs = await prefService.getAllPreferences();
                    return { success: true, preferences: prefs };
                }

                case 'PREF_removeAllPreferences': {
                    await prefService.removeAllPreferences();
                    const prefs = await prefService.getAllPreferences();
                    return { success: true, preferences: prefs };
                }

                default:
                    return { success: false, error: 'Unknown message type' };
            }
        } catch (error) {
            let errorMessage = "Failed to handle message"
            if (error instanceof Error) {
                errorMessage = error.message
            }
            return { success: false, error: errorMessage };
        }
    };

    // Properly handle the async response
    handleMessage().then(sendResponse);
    return true; // Keep the message channel open
});
