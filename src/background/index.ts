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


// Copy the current tab's URL to clipboard
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy-current-tab-url') {
        try {
            // Get current active tab in the current window
            const [tab] = (await chrome.tabs.query({
                active: true,
                currentWindow: true,
            })) as [chrome.tabs.Tab];

            if (!tab?.url || !tab.id) {
                console.error('No URL found for current tab');
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
    }
});

function getActiveTab(window: chrome.windows.Window) {
    return window.tabs?.filter((tab) => tab.active)[0];
}

// Update the context menu item with information about all open windows
function updateContextMenu() {
    chrome.windows.getAll({ populate: true }).then((windows: chrome.windows.Window[]) => {
        const windowIdToDescription = new Map<number, string>();

        windows.forEach((window: chrome.windows.Window) => {
            console.log(window.tabs);

            if (window.tabs) {
                // Map window ids to descriptions of form: [id, "{first tab title}(...) and X other tabs"]
                let description = `${getActiveTab(window)?.title}`;
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

            // Add click listener to open link in specific window
            chrome.contextMenus.onClicked.addListener((info, _tab) => {
                if (info.menuItemId === `open-link-in-specific-window-${windowId}`) {
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
                    })
                    // TODO(future): Add a user prefs page to control whether to set the new tab as active (or focus it).
                }
            })
        })
    });
}
