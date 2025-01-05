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
     * A function that creates a new tab in a specified group.
     *
     * @async
     * @param {string} url - The URL to open in the new tab
     * @param {number} groupId - The ID of the group to open the new tab in
     * @returns {Promise<void>}
     */
    async openNewTabInGroup(url?: string, groupId?: number) {
        try {
            const tab = await this.getActiveTabInCurrentWindow();

            if (!tab?.url || !tab.id) {
                console.error('No URL or id found for current tab');
                return;
            }

            // Use provided group id if passed in, else add to current group
            let currentGroupId = groupId ? groupId : tab.groupId;

            // Create a new tab
            console.log(`Creating new tab in group (${currentGroupId})`);
            const newTab = (await chrome.tabs.create({
                openerTabId: tab.id,
                active: true,
                url: url ? url : 'chrome://new-tab-page',
            })) as chrome.tabs.Tab;

            if (!newTab.id) {
                console.error('No id found for new tab');
                return;
            }

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
