import { TabService } from './tab.service';
import { PrefService } from './pref.service';

export class ContextMenuService {
    constructor(private readonly tabService: TabService, private prefService: PrefService) {}

    private isContextMenuUpdating = false;

    /**
     * Initializes the context menu service by removing all existing context menus,
     * creating new context menu items and registering tab and tab group event listeners.
     *
     */
    init() {
        chrome.contextMenus.removeAll();
        this.createOpenLinkInWindowContextMenu();
        this.registerTabEventListeners();
        this.registerTabGroupEventListeners();

        chrome.contextMenus.onClicked.addListener(
            this.contextMenuClickHandler
        );
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

    private contextMenuClickHandler = async (
        info: chrome.contextMenus.OnClickData,
        _tab?: chrome.tabs.Tab
    ) => {
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
                active: shouldNewTabBeActive,
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

    private registerTabEventListeners() {
        this.TabEvents.forEach((event) => {
            const tabEvent = chrome.tabs[event] as chrome.events.Event<any>;
            tabEvent.addListener(this.updateContextMenu);
        });
    }

    private registerTabGroupEventListeners() {
        this.TabGroupEvents.forEach((event) => {
            const tabGroupEvent = chrome.tabGroups[
                event
            ] as chrome.events.Event<any>;
            tabGroupEvent.addListener(this.updateContextMenu);
        });
    }

    private getAllTabGroups = async () => {
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

    // Update "Open Link in Specific Window" context menu items
    private updateWindowContextMenus = async () => {
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
            // TODO(later): Add a user prefs page to control whether to set the new tab's window as active (or focus it).
        );
    };

    // Update "Open Link in Specific Group" context menu items
    private updateGroupContextMenus = async () => {
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

    // Remove all existing context menus and recreate them using updated data
    private updateContextMenu = async () => {
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
