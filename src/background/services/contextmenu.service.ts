import { TabService } from './tab.service';

export class ContextMenuService {
    constructor(private readonly tabService: TabService) {}

    /**
     * Initializes the context menu service by creating the "open link in specific window"
     * context menu item and registering tab event listeners.
     *
     */
    init() {
        this.createOpenLinkContextMenu();
        this.registerTabEventListeners();
    }

    private createOpenLinkContextMenu() {
        chrome.contextMenus.create({
            id: 'open-link-in-specific-window',
            title: 'Open Link in Specific Window',
            contexts: ['link'],
        });
    }

    private contextMenuClickHandler = (
        info: chrome.contextMenus.OnClickData,
        tab?: chrome.tabs.Tab
    ) => {
        const windowIdMatcher = info.menuItemId
            .toString()
            .match(/^open-link-in-specific-window-(\d+)$/);
        if (windowIdMatcher) {
            const windowId = parseInt(windowIdMatcher[1]);
            const linkUrl = info.linkUrl;

            if (!linkUrl) {
                console.error('No link URL found');
                return;
            }

            //  Open link in a specific window
            chrome.tabs.create({
                url: linkUrl,
                windowId: windowId,
                active: true,
            });
            console.log(`Opened link ${linkUrl} in window ${windowId}`);
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

    private registerTabEventListeners() {
        this.updateContextMenuTabEvents.forEach((event) => {
            const tabEvent = chrome.tabs[event] as chrome.events.Event<any>;
            tabEvent.addListener(this.updateContextMenu);
        });
    }

    // Update the context menu item with information about all open windows
    private updateContextMenu = () => {
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
                chrome.contextMenus.create({
                    id: 'open-link-in-specific-window',
                    title: 'Open Link in Specific Window',
                    contexts: ['link'],
                });

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
    };
}
