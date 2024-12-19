export class TabService {
    /**
     * Gets the active tab in the current window.
     *
     * @async
     * @returns {Promise<chrome.tabs.Tab>} Promise that resolves to the active tab in the current window
     */
    async getActiveTabInCurrentWindow(): Promise<chrome.tabs.Tab> {
        const [tab] = (await chrome.tabs.query({
            active: true,
            currentWindow: true,
        })) as [chrome.tabs.Tab];

        return tab;
    }

    /**
     * Finds the active tab within a specified Chrome window.
     *
     * @param {chrome.windows.Window} window - The Chrome window object to search within.
     * @returns {chrome.tabs.Tab | undefined} The active tab in the specified window, or undefined if no active tab is found
     */
    getActiveTabInWindow(window: chrome.windows.Window) {
        return window.tabs?.filter((tab) => tab.active)[0];
    }
    /**
     * A function that creates a new tab in the current group based on the active tab.
     *
     * @async
     * @returns {Promise<void>}
     */
    async openNewTabInCurrentGroup() {
        try {
            const tab = await this.getActiveTabInCurrentWindow();

            if (!tab?.url || !tab.id) {
                console.error('No URL or id found for current tab');
                return;
            }

            // Open a new tab
            console.log(`Opening new tab in current group`);
            const newTab = (await chrome.tabs.create({
                openerTabId: tab.id,
                active: true,
            })) as chrome.tabs.Tab;

            if (!newTab.id) {
                console.error('No id found for new tab');
                return;
            }

            let currentGroupId = tab.groupId;
            // Create a group with just the current tab if one doesn't exist already
            if (currentGroupId === -1) {
                console.log(`Creating a new group with current tab`);
                currentGroupId = await chrome.tabs.group({
                    tabIds: [tab.id],
                });
            }
            // Add the new tab to the group
            console.log(`Adding new tab to group ${currentGroupId}`);
            newTab.groupId = currentGroupId;
            chrome.tabs.group({
                tabIds: [newTab.id],
                groupId: currentGroupId,
            });
        } catch (err) {
            console.error('Error opening new tab in current group: ', err);
        }
    }
}
