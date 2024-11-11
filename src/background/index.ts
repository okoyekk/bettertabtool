chrome.runtime.onInstalled.addListener(() => {
    console.log("BetterTabTool installed");
});


// Copy current tab's URL to clipboard
chrome.commands.onCommand.addListener((command) => {
    if (command === "copy-current-tab-url") {
        console.log("TODO: Copying current tab's URL to clipboard");
    }
})