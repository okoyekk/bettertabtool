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
                currentGroupId = await chrome.tabs.group({
                    tabIds: [tab.id],
                });
            }
            // Add the new tab to the group
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
     * Pops out the current tab into a new window.
     *
     * @async
     * @returns {Promise<void>}
     */
    async popOutCurrentTab(): Promise<void> {
        try {
            const tab = await this.getActiveTabInCurrentWindow();
            if (!tab?.id) {
                console.error('No id found for current tab');
                return;
            }

            await chrome.windows.create({
                tabId: tab.id,
                type: 'normal',
                focused: true,
            });
        } catch (err) {
            console.error('Error popping out tab: ', err);
        }
    }

    private async areWindowsOnSameDisplay(
        window1: chrome.windows.Window,
        window2: chrome.windows.Window,
    ): Promise<boolean> {
        try {
            // Get all available displays
            const displays = await chrome.system.display.getInfo();

            // Helper to figure out which display a window is on
            function getDisplayForWindow(
                window: chrome.windows.Window,
                displays: chrome.system.display.DisplayUnitInfo[],
            ) {
                const windowCenterX = window.left! + window.width! / 2;
                const windowCenterY = window.top! + window.height! / 2;

                return displays.find((display) => {
                    const displayBounds = display.bounds;

                    return (
                        windowCenterX >= displayBounds.left &&
                        windowCenterX < displayBounds.left + displayBounds.width &&
                        windowCenterY >= displayBounds.top &&
                        windowCenterY < displayBounds.top + displayBounds.height
                    );
                });
            }

            const display1 = getDisplayForWindow(window1, displays);
            const display2 = getDisplayForWindow(window2, displays);

            return display1!.id === display2!.id;
        } catch (error) {
            console.error('Error checking if windows are on the same display', error);
            return false;
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
        const mergeSameDisplayOnly = (await this.prefService.getBooleanPreference('mergeSameDisplayOnly')) ?? false;

        if (confirmMergeWindows) {
            // Do not merge if last trigger was over 1 second ago
            if (Date.now() - this.lastMergeTriggerTime > 1000) {
                this.lastMergeTriggerTime = Date.now();
                return;
            }
        }
        // Update the last merge trigger time
        this.lastMergeTriggerTime = Date.now();

        // Get all windows
        const windows = await chrome.windows.getAll({ populate: true });

        if (windows.length <= 1) {
            return; // Nothing to merge
        }

        // Merge all "normal" windows into the current window
        const targetWindow = await chrome.windows.getCurrent();
        if (targetWindow.type !== 'normal') {
            return; // Nothing to merge
        }

        for (const win of windows) {
            // Skip the target window, non-normal type windows, and windows with states that aren't normal or maximized
            if (
                win.id === targetWindow.id ||
                win.type !== 'normal' ||
                (win.state !== 'normal' && win.state !== 'maximized')
            )
                continue;

            // Check if windows are on the same display when the preference is enabled
            if (mergeSameDisplayOnly) {
                const areOnSameDisplay = await this.areWindowsOnSameDisplay(win, targetWindow);
                if (!areOnSameDisplay) {
                    continue;
                }
            }

            let tabGroups: chrome.tabGroups.TabGroup[] = await chrome.tabGroups.query({ windowId: win.id });
            // Move each ungrouped tab from the current window to the target window
            for (const tab of win.tabs || []) {
                if (tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
                    let wasTabPinned = tab.pinned ?? false;
                    let wasTabMuted = tab.mutedInfo?.muted ?? false;
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
                await chrome.tabGroups.move(group.id!, {
                    windowId: targetWindow.id,
                    index: -1,
                });
            }
        }
    }
}
