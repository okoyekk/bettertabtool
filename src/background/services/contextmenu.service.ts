import { TabService } from './tab.service';

export class ContextMenuService {
    constructor(private readonly tabService: TabService) {}

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
    }

    private createOpenLinkInWindowContextMenu() {
        chrome.contextMenus.create({
            id: 'open-link-in-specific-window',
            title: 'Open Link in Specific Window',
            contexts: ['link'],
        });
    }

    private createOpenLinkInGroupContextMenu() {
        chrome.contextMenus.create({
            id: 'open-link-in-specific-group',
            title: 'Open Link in Specific Group',
            contexts: ['link'],
        });
    }

    private contextMenuClickHandler = (
        info: chrome.contextMenus.OnClickData,
        _tab?: chrome.tabs.Tab
    ) => {
        const linkUrl = info.linkUrl;
        if (!linkUrl) {
            console.error('No link URL found');
            return;
        }

        //  Open link in a specific window
        const windowIdMatcher = info.menuItemId
            .toString()
            .match(/^open-link-in-specific-window-(\d+)$/);
        if (windowIdMatcher) {
            const windowId = parseInt(windowIdMatcher[1]);
            chrome.tabs.create({
                url: linkUrl,
                windowId: windowId,
                active: true,
            });
            console.log(`Opened link ${linkUrl} in window ${windowId}`);
        }

        //  Open link in a specific group
        const groupIdMatcher = info.menuItemId
            .toString()
            .match(/^open-link-in-specific-group-(\d+)$/);
        if (groupIdMatcher) {
            const groupId = parseInt(groupIdMatcher[1]);
            this.tabService.openNewTabInGroup(linkUrl, groupId);
            console.log(`Opened link ${linkUrl} in group ${groupId}`);
        }
    };

    private readonly updateContextMenuTabEvents: (keyof typeof chrome.tabs)[] =
        [
            'onActivated',
            'onAttached',
            'onCreated',
            'onDetached',
            'onMoved',
            'onRemoved',
            'onUpdated',
        ];

    private readonly updateContextMenuTabGroupEvents: (keyof typeof chrome.tabGroups)[] =
        ['onCreated', 'onMoved', 'onUpdated', 'onRemoved'];

    private registerTabEventListeners() {
        this.updateContextMenuTabEvents.forEach((event) => {
            const tabEvent = chrome.tabs[event] as chrome.events.Event<any>;
            tabEvent.addListener(this.updateContextMenu);
        });
    }

    private registerTabGroupEventListeners() {
        this.updateContextMenuTabGroupEvents.forEach((event) => {
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

    // TODO: Break up into Window and Group context menu updates
    // Update the context menu item with information about all open windows
    private updateContextMenu = async () => {
        // Remove existing context menu listeners
        chrome.contextMenus.onClicked.removeListener(
            this.contextMenuClickHandler
        );

        chrome.windows
            .getAll({ populate: true })
            .then((windows: chrome.windows.Window[]) => {
                const windowIdToDescription = new Map<number, string>();

                windows.forEach((window: chrome.windows.Window) => {
                    // console.log("updateContextMenu tabs: ", window.tabs);

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

                // Remove all context menu items and recreate "Open Link in Specific Window"
                chrome.contextMenus.removeAll();
                this.createOpenLinkInWindowContextMenu();

                // Add each window to context menu as a subitem of "Open Link in Specific Window"
                windowIdToDescription.forEach(
                    (description: string, windowId: number) => {
                        chrome.contextMenus.create({
                            id: `open-link-in-specific-window-${windowId}`,
                            title: description,
                            contexts: ['link'],
                            parentId: 'open-link-in-specific-window',
                        });

                        // TODO(future): Add a user prefs page to control whether to set the new tab's window as active (or focus it).

                        // Add click listener to open link in specific window
                        chrome.contextMenus.onClicked.addListener(
                            this.contextMenuClickHandler
                        );
                    }
                );
            });

        // Get all existing tab groups and create context menu items for each
        const groups = await this.getAllTabGroups();
        console.log(groups);
        // Recreate "Open Link in Group" context menu if groups exist
        if (groups.length > 0) {
            this.createOpenLinkInGroupContextMenu();
            // Add each tab group to context menu as a subitem of "Open Link in Group"
            groups.forEach((group) => {
                chrome.contextMenus.create({
                    id: `open-link-in-specific-group-${group.id}`,
                    title: group.title,
                    contexts: ['link'],
                    parentId: 'open-link-in-specific-group',
                });
                // Add click listener to open link in group
                chrome.contextMenus.onClicked.addListener(
                    this.contextMenuClickHandler
                );
            });
        }
    };
}
