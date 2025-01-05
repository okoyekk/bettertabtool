import { ClipboardService } from './services/clipboard.service';
import { ContextMenuService } from './services/contextmenu.service';
import { TabService } from './services/tab.service';

const tabService = new TabService();
const clipboardService = new ClipboardService(tabService);
const contextMenuService = new ContextMenuService(tabService);

chrome.runtime.onInstalled.addListener(() => {
    console.log('BetterTabTool installed');
    contextMenuService.init();
});

// Init the context menu service on startup
chrome.runtime.onStartup.addListener(() => {
    contextMenuService.init();
});

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy-current-tab-url') {
        clipboardService.copyCurrentTabUrl();
    } else if (command === 'open-new-tab-in-current-group') {
        tabService.openNewTabInGroup();
    }
});
