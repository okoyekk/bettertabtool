async function getActiveTabInCurrentWindow(): Promise<chrome.tabs.Tab> {
    // TODO: Move into tabService
    const [tab] = (await chrome.tabs.query({
        active: true,
        currentWindow: true,
    })) as [chrome.tabs.Tab];

    return tab
}

export class ClipboardService {
    constructor() {
        // TODO: Should eventually take in a tabService
    }

    async copyCurrentTabUrl(): Promise<void> {
        try {
            const tab = await getActiveTabInCurrentWindow();

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

            console.log(`URL ${tab.url} copied to clipboard`);
            this.showCopyNotification();
        } catch (err) {
            console.error('Error copying URL to clipboard: ', err);
        }
    }

    private showCopyNotification() {
        chrome.notifications.create(
            'current-tab-url-created',
            {
                type: 'basic',
                iconUrl: '../assets/placeholder.png',
                title: 'BetterTabTool',
                message: 'Link copied to clipboard!',
            },
            () => { }
        );
    }
}