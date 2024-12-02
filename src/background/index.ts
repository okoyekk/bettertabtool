chrome.runtime.onInstalled.addListener(() => {
    console.log('BetterTabTool installed');

    // Create when a link is right clicked
    chrome.contextMenus.create({
        id: "open-link-in-specific-window",
        title: "Open Link in Specific Window",
        contexts: ["link"],
    });
});

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

// Open a link in a specific window
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "open-link-in-specific-window") {
        const linkUrl = info.linkUrl;
        if (!linkUrl) {
            console.error('No link URL found');
            return;
        }

        // Get all open windows and log them
        let windows = chrome.windows.getAll({ populate: true });
        console.log(windows);
        // TODO: Open link in a specific window
        // Currently opens as popup
        chrome.windows.create({ url: linkUrl, type: 'normal' });
    }
})