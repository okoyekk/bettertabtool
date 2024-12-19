chrome.runtime.onInstalled.addListener(() => {
    console.log('BetterTabTool installed');

    // Create when a link is right clicked
    chrome.contextMenus.create({
        id: "open-link-in-specific-window",
        title: "Open Link in Specific Window",
        contexts: ["link"],
    });

    updateContextMenu();
});

const updateContextMenuTabEvents: (keyof typeof chrome.tabs)[] = [
    'onActivated',
    'onAttached',
    'onCreated',
    'onDetached',
    'onMoved',
    'onRemoved',
    'onUpdated',
];

function registerContextMenuTabEventListeners() {
    updateContextMenuTabEvents.forEach((event) => {
        const tabEvent = chrome.tabs[event] as chrome.events.Event<any>;
        tabEvent.addListener(updateContextMenu)
    });
}

registerContextMenuTabEventListeners();

const contextMenuClickHandler = (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    const windowIdMatcher = info.menuItemId.toString().match(/^open-link-in-specific-window-(\d+)$/);
    if (windowIdMatcher) {
        const windowId = parseInt(windowIdMatcher[1]);
        const linkUrl = info.linkUrl

        if (!linkUrl) {
            console.error('No link URL found');
            return;
        }

        //  Open link in a specific window
        chrome.tabs.create({
            url: linkUrl,
            windowId: windowId,
            active: true,
        })
        console.log(`Opened link ${linkUrl} in window ${windowId}`);
    }
}

async function getActiveTabInCurrentWindow(): Promise<chrome.tabs.Tab> {
    const [tab] = (await chrome.tabs.query({
        active: true,
        currentWindow: true,
    })) as [chrome.tabs.Tab];

    return tab
}

function getActiveTabInWindow(window: chrome.windows.Window) {
    return window.tabs?.filter((tab) => tab.active)[0];
}

chrome.commands.onCommand.addListener(async (command) => {
    // Copy the current tab's URL to clipboard
    if (command === 'copy-current-tab-url') {
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

            console.log('URL copied to clipboard');

            chrome.notifications.create(
                'current-tab-url-created',
                {
                    type: 'basic',
                    iconUrl: '../assets/placeholder.png',
                    title: 'BetterTabTool',
                    message: 'Link copied to clipboard!',
                },
                function () { }
            );
        } catch (err) {
            console.error('Error copying URL to clipboard: ', err);
        }
    } else if (command === 'open-new-tab-in-current-group') {
        try {
            const tab = await getActiveTabInCurrentWindow();

            if (!tab?.url || !tab.id) {
                console.error('No URL or id found for current tab');
                return;
            }

            // Open a new tab
            console.log(`Opening new tab in current group`);
            const newTab = await chrome.tabs.create({
                openerTabId: tab.id,
                active: true,
            }) as chrome.tabs.Tab;

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
            })

        }
        catch (err) {
            console.error('Error opening new tab in current group: ', err);
        }
    };
});

// Update the context menu item with information about all open windows
function updateContextMenu() {
    // Remove existing context menu listeners
    chrome.contextMenus.onClicked.removeListener(contextMenuClickHandler);

    chrome.windows.getAll({ populate: true }).then((windows: chrome.windows.Window[]) => {
        const windowIdToDescription = new Map<number, string>();

        windows.forEach((window: chrome.windows.Window) => {
            console.log("updateContextMenu tabs: ", window.tabs);

            if (window.tabs) {
                // Map window ids to descriptions of form: [id, "{first tab title}(...) and X other tabs"]
                let description = `${getActiveTabInWindow(window)?.title}`;
                // Shorten description if it's too long
                if (description.length > 40) {
                    description = description.substring(0, 40) + '...';
                }

                // Add number of other tabs in window
                if (window.tabs.length > 1) {
                    description = description.concat(` and ${window.tabs.length - 1} other tab${window.tabs.length > 2 ? 's' : ''}`);
                }
                windowIdToDescription.set(window.id!, description);
            }
        });

        // Remove all context menu items and recreate "Open Link in Specific Window"
        chrome.contextMenus.removeAll();
        chrome.contextMenus.create({
            id: "open-link-in-specific-window",
            title: "Open Link in Specific Window",
            contexts: ["link"],
        });


        // Add each window to context menu as a subitem of "Open Link in Specific Window"
        windowIdToDescription.forEach((description: string, windowId: number) => {
            chrome.contextMenus.create({
                id: `open-link-in-specific-window-${windowId}`,
                title: description,
                contexts: ["link"],
                parentId: "open-link-in-specific-window",
            });

            // TODO(future): Add a user prefs page to control whether to set the new tab as active (or focus it).
            // Add click listener to open link in specific window
            chrome.contextMenus.onClicked.addListener(contextMenuClickHandler)
        })
    });
}
