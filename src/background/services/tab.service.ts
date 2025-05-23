import { PrefService } from './pref.service';

export class TabService {
    constructor(private prefService: PrefService) {}
    private lastMergeTriggerTime: number = 0;
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
        return window.tabs?.find((tab) => tab.active);
    }

    /**
     * A function that creates a new tab in a specified group.
     *
     * @async
     * @param {string} url - The URL to open in the new tab
     * @param {number} groupId - The ID of the group to open the new tab in
     * @returns {Promise<void>}
     */
    async openNewTabInGroup(url?: string, groupId?: number): Promise<void> {
        try {
            const tab = await this.getActiveTabInCurrentWindow();
            if (!tab?.url || !tab.id) {
                console.error('No URL or id found for current tab');
                return;
            }
            // Use provided group id if passed in, else add to current group
            let currentGroupId = groupId ? groupId : tab.groupId;

            const shouldNewTabBeActive = (await this.prefService.getBooleanPreference('makeNewTabsActive')) ?? false;
            // Create a new tab
            // console.log(`Creating new tab in group (${currentGroupId})`);
            const newTab = await chrome.tabs.create({
                openerTabId: tab.id,
                active: shouldNewTabBeActive,
                url: url ? url : 'chrome://new-tab-page',
            });

            if (!newTab.id) {
                console.error('No id found for new tab');
                return;
            }
            // Create a group with just the current tab if one doesn't exist already
            if (currentGroupId === -1) {
                // console.log(`Creating a new group with current tab`);
                currentGroupId = await chrome.tabs.group({
                    tabIds: [tab.id],
                });
            }
            // Add the new tab to the group
            // console.log(`Adding new tab to group ${currentGroupId}`);
            newTab.groupId = currentGroupId;
            chrome.tabs.group({
                tabIds: [newTab.id],
                groupId: currentGroupId,
            });
        } catch (err) {
            console.error('Error opening new tab in current group: ', err);
        }
    }

    /**
     * Duplicates the currently active tab in the current window
     *
     * @async
     * @returns {Promise<void>}
     */
    async duplicateCurrentTab(): Promise<void> {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab) {
            await chrome.tabs.duplicate(tab.id!);
        }
    }

    /**
     * Merges all windows into the current window while maintaining tab groupings.
     *
     * @async
     * @returns {Promise<void>}
     */
    async mergeAllWindows(): Promise<void> {
        const confirmMergeWindows = (await this.prefService.getBooleanPreference('confirmMergeWindows')) ?? false;
        if (confirmMergeWindows) {
            // console.log('last merge trigger time: ', this.lastMergeTriggerTime);
            // console.log('current time: ', Date.now());
            // console.log('time diff: ', Date.now() - this.lastMergeTriggerTime);
            // Do not merge if last trigger was over 1 second ago
            if (Date.now() - this.lastMergeTriggerTime > 1000) {
                this.lastMergeTriggerTime = Date.now();
                return;
            }
        }
        // Update the last merge trigger time
        this.lastMergeTriggerTime = Date.now();
        // console.log('Starting to merge all windows into the current window.');

        // Get all windows
        const windows = await chrome.windows.getAll({ populate: true });
        // console.log(`Found ${windows.length} windows.`);
        // console.log(windows);

        if (windows.length <= 1) {
            // console.log('Nothing to merge, only one window is open.');
            return; // Nothing to merge
        }

        // Merge all "normal" windows into the current window
        const targetWindow = await chrome.windows.getCurrent();
        if (targetWindow.type !== 'normal') {
            // console.log('Target window is not normal, nothing to merge.');
            return; // Nothing to merge
        }
        // console.log(`Target window ID: ${targetWindow.id}`);

        for (const win of windows) {
            if (win.id === targetWindow.id || win.type !== 'normal') continue; // Skip the target window and non-normal windows

            // console.log(`Processing window with ID: ${win.id}`);

            let tabGroups: chrome.tabGroups.TabGroup[] = await chrome.tabGroups.query({ windowId: win.id });
            // console.log(`Found ${tabGroups.length} tab groups in window ID: ${win.id}`);

            // Move each ungrouped tab from the current window to the target window
            for (const tab of win.tabs || []) {
                if (tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
                    let wasTabPinned = tab.pinned ?? false;
                    let wasTabMuted = tab.mutedInfo?.muted ?? false;
                    // console.log(`Moving tab ID: ${tab.id} from window ID: ${win.id} to target window ID: ${targetWindow.id}`);
                    await chrome.tabs.move(tab.id!, {
                        windowId: targetWindow.id,
                        index: -1,
                    });
                    // Retain pinned and muted state
                    if (wasTabPinned || wasTabMuted) {
                        chrome.tabs.update(tab.id!, { pinned: wasTabPinned, muted: wasTabMuted });
                    }
                }
            }

            // Move each tab group from the current window to the target window
            for (const group of tabGroups) {
                // console.log(`Moving tabGroup ID: ${group.id} from window ID: ${win.id} to target window ID: ${targetWindow.id}`);
                await chrome.tabGroups.move(group.id!, {
                    windowId: targetWindow.id,
                    index: -1,
                });
            }
        }

        // console.log('Finished merging all windows.');
    }
}
