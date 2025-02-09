import { TabService } from './tab.service';
import { PrefService } from './pref.service';


export class ClipboardService {
    constructor(private tabService: TabService, private prefService: PrefService) {}

    /**
     * Asynchronously copies the URL of the current tab to the clipboard.
     *
     * @async
     * @returns {Promise<void>} Promise that resolves once the URL is copied to the clipboard
     */
    async copyCurrentTabUrl(): Promise<void> {
        try {
            const tab = await this.tabService.getActiveTabInCurrentWindow();

            if (!tab?.url || !tab.id) {
                console.error('No URL or id found for current tab');
                return;
            }
            // Copy URL to clipboard via scripting
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (url) => {
                    navigator.clipboard.writeText(url);
                },
                args: [tab.url],
            });
            if (await this.prefService.getBooleanPreference('showCopyNotification')) {
                this.showCopyNotification();
            }
        } catch (err) {
            console.error('Error copying URL to clipboard: ', err);
        }
    }

    /**
     * Shows a native notification when a link is copied to the clipboard.
     */
    private showCopyNotification(): void {
        chrome.notifications.create(
            'current-tab-url-created',
            {
                type: 'basic',
                iconUrl: '../assets/icon-512.png',
                title: 'BetterTabTool',
                message: 'Link copied to clipboard!',
            },
            () => {}
        );
    }
}
