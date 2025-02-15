import { TabService } from './tab.service';
import { PrefService } from './pref.service';

export class ContextMenuService {
    constructor(private readonly tabService: TabService, private prefService: PrefService) {}

    private isContextMenuUpdating = false;
    private isContextMenuClickHandlerRegistered = false;
    private registeredTabEventListeners = new Set<keyof typeof chrome.tabs>();
    private registeredTabGroupEventListeners = new Set<keyof typeof chrome.tabGroups>();

    /**
     * Initializes the context menu service by removing all existing context menus,
     * creating new context menu items and registering tab and tab group event listeners.
     *
     */
    init() {
        console.log("Initializing ContextMenuService...");
        // Remove all existing listeners
        this.unregisterTabEventListeners();
        this.unregisterTabGroupEventListeners();
        this.unregisterContextMenuClickHandler();
        // Remove all existing context menus and recreate them
        chrome.contextMenus.removeAll(() => {
            this.createOpenLinkInWindowContextMenu();
            this.updateContextMenu();
        })
        // (re-)Register event listeners
        this.registerTabEventListeners();
        this.registerTabGroupEventListeners();
        this.registerContextMenuClickHandler();
    }

    private createOpenLinkInWindowContextMenu(): Promise<void> {
        return new Promise<void>((resolve) => {
            chrome.contextMenus.create({
                id: 'open-link-in-specific-window',
                title: 'Open Link in Specific Window',
                contexts: ['link'],
            }, () => resolve());
        });
    }

    private createOpenLinkInGroupContextMenu(): Promise<void> {
        return new Promise<void>((resolve) => {
            chrome.contextMenus.create({
                id: 'open-link-in-specific-group',
                title: 'Open Link in Specific Group',
                contexts: ['link'],
            }, () => resolve());
        });
    }

    /**
     * Handles a click event on a context menu item.
     * 
     * @param {chrome.contextMenus.OnClickData} info - The information about the clicked context menu item.
     * @param {chrome.tabs.Tab} _tab - The tab that was clicked.
     * @returns {Promise<void>} A promise that resolves when the context menu item is clicked.
     */
    private contextMenuClickHandler = async (
        info: chrome.contextMenus.OnClickData,
        _tab?: chrome.tabs.Tab
    ): Promise<void> => {
        const linkUrl = info.linkUrl;
        if (!linkUrl) {
            console.error('No link URL found');
            return;
        }

        const shouldNewTabBeActive = await this.prefService.getBooleanPreference("makeNewTabsActive");

        //  Open link in a specific window
        const windowIdMatcher = info.menuItemId
            .toString()
            .match(/^open-link-in-specific-window-(\d+)$/);
        if (windowIdMatcher) {
            const windowId = parseInt(windowIdMatcher[1]);
            chrome.tabs.create({
                url: linkUrl,
                windowId: windowId,
                active: shouldNewTabBeActive!,
            });
            // console.log(`Opened link ${linkUrl} in window ${windowId}`);
        }

        //  Open link in a specific group
        const groupIdMatcher = info.menuItemId
            .toString()
            .match(/^open-link-in-specific-group-(\d+)$/);
        if (groupIdMatcher) {
            const groupId = parseInt(groupIdMatcher[1]);
            this.tabService.openNewTabInGroup(linkUrl, groupId);
            // console.log(`Opened link ${linkUrl} in group ${groupId}`);
        }
    };

    private readonly TabEvents: (keyof typeof chrome.tabs)[] =
        [
            'onActivated',
            'onAttached',
            'onCreated',
            'onDetached',
            'onMoved',
            'onRemoved',
            'onUpdated',
        ];

    private readonly TabGroupEvents: (keyof typeof chrome.tabGroups)[] =
        ['onCreated', 'onMoved', 'onUpdated', 'onRemoved'];

    /**
     * Registers event listeners for tab events. Maintains a set of registered
     * listeners to prevent duplicate registrations.
     */
    private registerTabEventListeners(): void {
        this.TabEvents.forEach((event) => {
            if (!this.registeredTabEventListeners.has(event)) {
                const tabEvent = chrome.tabs[event] as chrome.events.Event<any>;
                tabEvent.addListener(this.updateContextMenu);
                this.registeredTabEventListeners.add(event);
            }
        });
    }

    /**
     * Registers event listeners for tab group events. Maintains a set of registered
     * listeners to prevent duplicate registrations.
     */
    private registerTabGroupEventListeners(): void {
        this.TabGroupEvents.forEach((event) => {
            if (!this.registeredTabGroupEventListeners.has(event)) {
                const tabGroupEvent = chrome.tabGroups[
                    event
                ] as chrome.events.Event<any>;
                tabGroupEvent.addListener(this.updateContextMenu);
                this.registeredTabGroupEventListeners.add(event);
            }
        });
    }

    /**
     * Registers a click event handler for the context menu.
     */
    private registerContextMenuClickHandler(): void {
        if (!this.isContextMenuClickHandlerRegistered) {
            chrome.contextMenus.onClicked.addListener(
                this.contextMenuClickHandler
            );
            this.isContextMenuClickHandlerRegistered = true;
        }
    }

    /**
     * Unregisters event listeners for tab events.
     */
    private unregisterTabEventListeners(): void {
        this.registeredTabEventListeners.forEach((event) => {
            const tabEvent = chrome.tabs[event] as chrome.events.Event<any>;
            tabEvent.removeListener(this.updateContextMenu);
            this.registeredTabEventListeners.delete(event);
        });
        this.registeredTabEventListeners.clear(); // Reset tracking set
    }

    /**
     * Unregisters event listeners for tab group events.
     */
    private unregisterTabGroupEventListeners(): void {
        this.registeredTabGroupEventListeners.forEach((event) => {
            const tabGroupEvent = chrome.tabGroups[event] as chrome.events.Event<any>;
            tabGroupEvent.removeListener(this.updateContextMenu);
            this.registeredTabGroupEventListeners.delete(event);
        });
        this.registeredTabGroupEventListeners.clear(); // Reset tracking set
    }

    /**
     * Unregisters the click event listener for the context menu.
     */
    private unregisterContextMenuClickHandler(): void {
        if (this.isContextMenuClickHandlerRegistered) {
            chrome.contextMenus.onClicked.removeListener(
                this.contextMenuClickHandler
            );
            this.isContextMenuClickHandlerRegistered = false;
        }
    }

    /**
     * Retrieves all tab groups.
     * 
     * @returns {Promise<chrome.tabGroups.TabGroup[]>} A promise that resolves to an array of tab groups.
     */
    private getAllTabGroups = async (): Promise<chrome.tabGroups.TabGroup[]> => {
        return new Promise<chrome.tabGroups.TabGroup[]>((resolve, reject) => {
            chrome.tabGroups.query({}, (groups) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(groups);
            });
        });
    };

    /**
     * Updates the "Open Link in Specific Window" context menu items.
     * 
     * @returns {Promise<void>} A promise that resolves when the context menu items are updated.
     */
    private updateWindowContextMenus = async (): Promise<void> => {
        const windows = await chrome.windows.getAll({ populate: true })
        const windowIdToDescription = new Map<number, string>();

        windows.forEach((window: chrome.windows.Window) => {
            // console.log("updateWindowContextMenu tabs: ", window.tabs);
            if (window.tabs) {
                // Map window ids to descriptions of form: [id, "{first tab title}(...) and X other tabs"]
                let description = `${this.tabService.getActiveTabInWindow(window)?.title}`;
                // Shorten description if it's too long
                if (description.length > 40) {
                    description = description.substring(0, 40) + '...';
                }
                // Add number of other tabs in window
                if (window.tabs.length > 1) {
                    description = description.concat(
                        ` and ${window.tabs.length - 1} other tab${window.tabs.length > 2 ? 's' : ''}`
                    );
                }
                windowIdToDescription.set(window.id!, description);
            }
        });

        await this.createOpenLinkInWindowContextMenu();

        // Sequentially add each window to context menu as a subitem of "Open Link in Specific Window"
        windowIdToDescription.forEach(
            async (description: string, windowId: number) => {
                await new Promise<void>((resolve) => {
                    chrome.contextMenus.create({
                        id: `open-link-in-specific-window-${windowId}`,
                        title: description,
                        contexts: ['link'],
                        parentId: 'open-link-in-specific-window',
                    }, () => resolve());
                });
            }
        );
    };

    /**
     * Updates the "Open Link in Specific Group" context menu items.
     * 
     * @returns {Promise<void>} A promise that resolves when the context menu items are updated.
     */
    private updateGroupContextMenus = async (): Promise<void> => {
        // Get all existing tab groups and create context menu items for each
        const groups = await this.getAllTabGroups();
        // Recreate "Open Link in Group" context menu if groups exist
        if (groups.length > 0) {
            await this.createOpenLinkInGroupContextMenu();
            // Sequentially add each tab group to context menu as a subitem of "Open Link in Group"
            groups.forEach(async (group) => {
                if (group.title!.length > 0) {
                    await new Promise<void>((resolve) => {
                        chrome.contextMenus.create({
                            id: `open-link-in-specific-group-${group.id}`,
                            title: group.title,
                            contexts: ['link'],
                            parentId: 'open-link-in-specific-group',
                        }, () => resolve());
                    });
                }
            });
        }
    };

    /**
     * Removes all existing context menus and recreates them using updated data.
     * 
     * @returns {Promise<void>} A promise that resolves when the context menu items are updated.
     */
    private updateContextMenu = async (): Promise<void> => {
        if (this.isContextMenuUpdating) {
            // Prevent multiple updates at the same time
            console.log('updateContextMenu is already updating');
            return;
        }
        this.isContextMenuUpdating = true;

        try {
            await new Promise<void>((resolve) => {
                chrome.contextMenus.removeAll(() => resolve());
            });
            // TODO(later): Find a way to conditionally update context menus based on event
            //  type. This is weird because both menus are reliant on the same handler
            await this.updateWindowContextMenus();
            await this.updateGroupContextMenus();
        } finally {
            this.isContextMenuUpdating = false;
        }
    };
}
