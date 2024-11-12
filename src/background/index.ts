chrome.runtime.onInstalled.addListener(() => {
    console.log('BetterTabTool installed')
})

// Copy the current tab's URL to clipboard
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy-current-tab-url') {
        try {
            // Get current active tab in the current window
            const [tab] = (await chrome.tabs.query({
                active: true,
                currentWindow: true,
            })) as [chrome.tabs.Tab]

            if (!tab?.url || !tab.id) {
                console.error('No URL found for current tab')
                return
            }

            // Copy URL to clipboard via scripting
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (url) => {
                    navigator.clipboard.writeText(url)
                },
                args: [tab.url],
            })

            console.log('URL copied to clipboard')

            // TODO: Show a notification via popup
        } catch (err) {
            console.error('Error copying URL to clipboard: ', err)
        }
    }
})
