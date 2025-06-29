import { ContextMenuService } from './contextmenu.service';
import { PrefService } from './pref.service';
import { TabService } from './tab.service';
import { isBackgroundPage } from '../../utils';

jest.mock('./tab.service');
jest.mock('./pref.service');
jest.mock('../../utils', () => ({
    isBackgroundPage: jest.fn(),
}));

describe('ContextMenuService', () => {
    let tabService: jest.Mocked<TabService>;
    let prefService: jest.Mocked<PrefService>;
    let contextMenuService: ContextMenuService;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    const TEST_URL = 'https://google.com';
    const MENU_ITEM_BASE_WINDOW = 'open-link-in-specific-window';
    const MENU_ITEM_BASE_GROUP = 'open-link-in-specific-group';
    const UPDATE_CONTEXT_MENU_METHOD = 'updateContextMenu';
    const MENU_ITEM_ID_PROP = 'menuItemId';
    const LINK_URL_PROP = 'linkUrl';
    const ACTIVE_TAB_TRUE = true;

    const mockChrome = {
        contextMenus: {
            create: jest.fn((options, callback) => callback && callback()),
            removeAll: jest.fn((callback) => callback && callback()),
            onClicked: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
            },
        },
        tabs: {
            create: jest.fn(),
            onActivated: { addListener: jest.fn(), removeListener: jest.fn() },
            onAttached: { addListener: jest.fn(), removeListener: jest.fn() },
            onCreated: { addListener: jest.fn(), removeListener: jest.fn() },
            onDetached: { addListener: jest.fn(), removeListener: jest.fn() },
            onMoved: { addListener: jest.fn(), removeListener: jest.fn() },
            onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
            onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
        },
        tabGroups: {
            query: jest.fn(),
            onCreated: { addListener: jest.fn(), removeListener: jest.fn() },
            onMoved: { addListener: jest.fn(), removeListener: jest.fn() },
            onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
            onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
        },
        windows: {
            getAll: jest.fn(),
        },
        runtime: {
            lastError: null as { message: string } | null,
        },
    };

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        (global as any).chrome = mockChrome;

        jest.clearAllMocks();

        (isBackgroundPage as jest.Mock).mockReturnValue(true);

        prefService = new PrefService() as jest.Mocked<PrefService>;
        tabService = new TabService(prefService) as jest.Mocked<TabService>;
        contextMenuService = new ContextMenuService(tabService, prefService);

        mockChrome.windows.getAll.mockResolvedValue([]);
        mockChrome.tabGroups.query.mockImplementation((_, callback) => callback([]));
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('init', () => {
        it('init_shouldInitializeServiceWhenInBackroundPage', async () => {
            await contextMenuService.init();

            expect(mockChrome.contextMenus.removeAll).toHaveBeenCalled();
            expect(mockChrome.contextMenus.create).toHaveBeenCalledWith(
                expect.objectContaining({ id: MENU_ITEM_BASE_WINDOW }),
                expect.any(Function),
            );
            expect(mockChrome.tabs.onActivated.addListener).toHaveBeenCalled();
            expect(mockChrome.tabGroups.onCreated.addListener).toHaveBeenCalled();
            expect(mockChrome.contextMenus.onClicked.addListener).toHaveBeenCalled();
        });

        it('init_shouldExitEarlyWhenNotInBackgroundPage', async () => {
            (isBackgroundPage as jest.Mock).mockReturnValue(false);
            await contextMenuService.init();
            expect(mockChrome.contextMenus.removeAll).not.toHaveBeenCalled();
        });

        it('init_shouldUnregisterListenersBeforeRegistering', async () => {
            await contextMenuService.init();
            await contextMenuService.init();

            expect(mockChrome.tabs.onActivated.removeListener).toHaveBeenCalledTimes(1);
            expect(mockChrome.tabGroups.onCreated.removeListener).toHaveBeenCalledTimes(1);
            expect(mockChrome.contextMenus.onClicked.removeListener).toHaveBeenCalledTimes(1);
        });
    });

    describe('contextMenuClickHandler', () => {
        const clickHandler = (...args: any[]) => (contextMenuService as any).contextMenuClickHandler(...args);

        const TEST_WINDOW_ID = 123;
        const TEST_GROUP_ID = 456;
        const WINDOW_MENU_ITEM_ID = `${MENU_ITEM_BASE_WINDOW}-${TEST_WINDOW_ID}`;
        const GROUP_MENU_ITEM_ID = `${MENU_ITEM_BASE_GROUP}-${TEST_GROUP_ID}`;

        it('contextMenuClickHandler_shouldOpenLinkInWindowWhenWindowIdMatches', async () => {
            const info = { [MENU_ITEM_ID_PROP]: WINDOW_MENU_ITEM_ID, [LINK_URL_PROP]: TEST_URL };
            prefService.getBooleanPreference.mockResolvedValue(true);

            await clickHandler(info);

            expect(mockChrome.tabs.create).toHaveBeenCalledWith({
                url: TEST_URL,
                windowId: TEST_WINDOW_ID,
                active: ACTIVE_TAB_TRUE,
            });
        });

        it('contextMenuClickHandler_shouldOpenLinkInGroupWhenGroupIdMatches', async () => {
            const info = { [MENU_ITEM_ID_PROP]: GROUP_MENU_ITEM_ID, [LINK_URL_PROP]: TEST_URL };
            await clickHandler(info);
            expect(tabService.openNewTabInGroup).toHaveBeenCalledWith(TEST_URL, TEST_GROUP_ID);
        });

        it('contextMenuClickHandler_shouldDoNothingIfNoLinkUrl', async () => {
            const info = { [MENU_ITEM_ID_PROP]: WINDOW_MENU_ITEM_ID };
            await clickHandler(info);
            expect(mockChrome.tabs.create).not.toHaveBeenCalled();
            expect(tabService.openNewTabInGroup).not.toHaveBeenCalled();
        });

        it('contextMenuClickHandler_shouldDoNothingIfNoMatcher', async () => {
            const info = { [MENU_ITEM_ID_PROP]: 'some-other-id', [LINK_URL_PROP]: TEST_URL };
            await clickHandler(info);
            expect(mockChrome.tabs.create).not.toHaveBeenCalled();
            expect(tabService.openNewTabInGroup).not.toHaveBeenCalled();
        });
    });

    describe('updateContextMenu', () => {
        const updateContextMenu = () => (contextMenuService as any).updateContextMenu();

        it('updateContextMenu_shouldNotRunIfAlreadyUpdating', async () => {
            (contextMenuService as any).isContextMenuUpdating = true;
            await updateContextMenu();
            expect(mockChrome.contextMenus.removeAll).not.toHaveBeenCalled();
        });

        it('updateContextMenu_shouldSetAndResetUpdatingFlag', async () => {
            expect((contextMenuService as any).isContextMenuUpdating).toBe(false);
            const promise = updateContextMenu();
            expect((contextMenuService as any).isContextMenuUpdating).toBe(true);
            await promise;
            expect((contextMenuService as any).isContextMenuUpdating).toBe(false);
        });

        it('updateContextMenu_shouldResetUpdatingFlagOnError', async () => {
            mockChrome.windows.getAll.mockRejectedValue(new Error('Failed to get windows'));
            await expect(updateContextMenu()).rejects.toThrow('Failed to get windows');
            expect((contextMenuService as any).isContextMenuUpdating).toBe(false);
        });
    });

    describe('updateWindowContextMenus', () => {
        const updateWindowContextMenus = () => (contextMenuService as any).updateWindowContextMenus();

        const SHORT_TAB_TITLE = 'Short';
        const OTHER_TAB_TITLE = 'Other';

        it('updateWindowContextMenus_shouldCreateMenuForAllWindowsWithTabs', async () => {
            const windows = [
                { id: 1, tabs: [{ id: 101, title: 'Tab A' }] },
                {
                    id: 2,
                    tabs: [
                        { id: 201, title: 'Tab B' },
                        { id: 202, title: 'Tab C' },
                    ],
                },
                { id: 3, tabs: undefined },
            ];
            mockChrome.windows.getAll.mockResolvedValue(windows as any);
            tabService.getActiveTabInWindow.mockImplementation((win: any) => win.tabs[0]);

            await updateWindowContextMenus();

            expect(mockChrome.contextMenus.create).toHaveBeenCalledTimes(3);
            expect(mockChrome.contextMenus.create).toHaveBeenCalledWith(
                expect.objectContaining({ id: `${MENU_ITEM_BASE_WINDOW}-1` }),
                expect.any(Function),
            );
            expect(mockChrome.contextMenus.create).toHaveBeenCalledWith(
                expect.objectContaining({ id: `${MENU_ITEM_BASE_WINDOW}-2` }),
                expect.any(Function),
            );
        });

        it('updateWindowContextMenus_shouldFormatTabTitlesCorrectly', async () => {
            const longTitle = 'This is a very long tab title that should be truncated';
            const windows = [
                { id: 1, tabs: [{ id: 101, title: SHORT_TAB_TITLE }] },
                {
                    id: 2,
                    tabs: [
                        { id: 201, title: SHORT_TAB_TITLE },
                        { id: 202, title: OTHER_TAB_TITLE },
                    ],
                },
                {
                    id: 3,
                    tabs: [
                        { id: 301, title: longTitle },
                        { id: 302, title: OTHER_TAB_TITLE },
                        { id: 303, title: 'Another' },
                    ],
                },
            ];
            mockChrome.windows.getAll.mockResolvedValue(windows as any);
            tabService.getActiveTabInWindow.mockImplementation((win: any) => win.tabs[0]);

            await updateWindowContextMenus();

            expect(mockChrome.contextMenus.create).toHaveBeenCalledWith(
                expect.objectContaining({ title: SHORT_TAB_TITLE }),
                expect.any(Function),
            );
            expect(mockChrome.contextMenus.create).toHaveBeenCalledWith(
                expect.objectContaining({ title: `${SHORT_TAB_TITLE} and 1 other tab` }),
                expect.any(Function),
            );
            expect(mockChrome.contextMenus.create).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'This is a very long tab title that shoul... and 2 other tabs' }),
                expect.any(Function),
            );
        });
    });

    describe('registerTabEventListeners', () => {
        it('registerTabEventListeners_shouldAddListenersForTabEvents', () => {
            (contextMenuService as any).registerTabEventListeners();
            expect(mockChrome.tabs.onActivated.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onAttached.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onCreated.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onDetached.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onMoved.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onRemoved.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onUpdated.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
        });

        it('registerTabEventListeners_shouldNotAddDuplicateListeners', () => {
            (contextMenuService as any).registerTabEventListeners();
            (contextMenuService as any).registerTabEventListeners();
            expect(mockChrome.tabs.onActivated.addListener).toHaveBeenCalledTimes(1);
        });
    });

    describe('registerTabGroupEventListeners', () => {
        it('registerTabGroupEventListeners_shouldAddListenersForTabGroupEvents', () => {
            (contextMenuService as any).registerTabGroupEventListeners();
            expect(mockChrome.tabGroups.onCreated.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabGroups.onMoved.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabGroups.onUpdated.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabGroups.onRemoved.addListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
        });

        it('registerTabGroupEventListeners_shouldNotAddDuplicateListeners', () => {
            (contextMenuService as any).registerTabGroupEventListeners();
            (contextMenuService as any).registerTabGroupEventListeners();
            expect(mockChrome.tabGroups.onCreated.addListener).toHaveBeenCalledTimes(1);
        });
    });

    describe('registerContextMenuClickHandler', () => {
        it('registerContextMenuClickHandler_shouldAddClickHandler', () => {
            (contextMenuService as any).registerContextMenuClickHandler();
            expect(mockChrome.contextMenus.onClicked.addListener).toHaveBeenCalledWith(
                (contextMenuService as any).contextMenuClickHandler,
            );
            expect((contextMenuService as any).isContextMenuClickHandlerRegistered).toBe(true);
        });

        it('registerContextMenuClickHandler_shouldNotAddDuplicateClickHandler', () => {
            (contextMenuService as any).registerContextMenuClickHandler();
            (contextMenuService as any).registerContextMenuClickHandler();
            expect(mockChrome.contextMenus.onClicked.addListener).toHaveBeenCalledTimes(1);
        });
    });

    describe('unregisterTabEventListeners', () => {
        it('unregisterTabEventListeners_shouldRemoveListenersForTabEvents', () => {
            (contextMenuService as any).registerTabEventListeners();
            (contextMenuService as any).unregisterTabEventListeners();
            expect(mockChrome.tabs.onActivated.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onAttached.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onCreated.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onDetached.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onMoved.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onRemoved.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabs.onUpdated.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect((contextMenuService as any).registeredTabEventListeners.size).toBe(0);
        });
    });

    describe('unregisterTabGroupEventListeners', () => {
        it('unregisterTabGroupEventListeners_shouldRemoveListenersForTabGroupEvents', () => {
            (contextMenuService as any).registerTabGroupEventListeners();
            (contextMenuService as any).unregisterTabGroupEventListeners();
            expect(mockChrome.tabGroups.onCreated.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabGroups.onMoved.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabGroups.onUpdated.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect(mockChrome.tabGroups.onRemoved.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any)[UPDATE_CONTEXT_MENU_METHOD],
            );
            expect((contextMenuService as any).registeredTabGroupEventListeners.size).toBe(0);
        });
    });

    describe('unregisterContextMenuClickHandler', () => {
        it('unregisterContextMenuClickHandler_shouldRemoveClickHandler', () => {
            (contextMenuService as any).registerContextMenuClickHandler();
            (contextMenuService as any).unregisterContextMenuClickHandler();
            expect(mockChrome.contextMenus.onClicked.removeListener).toHaveBeenCalledWith(
                (contextMenuService as any).contextMenuClickHandler,
            );
            expect((contextMenuService as any).isContextMenuClickHandlerRegistered).toBe(false);
        });

        it('unregisterContextMenuClickHandler_shouldDoNothingIfNotRegistered', () => {
            (contextMenuService as any).unregisterContextMenuClickHandler();
            expect(mockChrome.contextMenus.onClicked.removeListener).not.toHaveBeenCalled();
        });
    });

    describe('updateGroupContextMenus', () => {
        const updateGroupContextMenus = () => (contextMenuService as any).updateGroupContextMenus();

        it('updateGroupContextMenus_shouldCreateMenuForGroupsWithTitles', async () => {
            const groups = [
                { id: 1, title: 'Group A' },
                { id: 2, title: 'Group B' },
                { id: 3, title: '' },
            ];
            mockChrome.tabGroups.query.mockImplementation((_, callback) => callback(groups as any));

            await updateGroupContextMenus();

            expect(mockChrome.contextMenus.create).toHaveBeenCalledTimes(3);
            expect(mockChrome.contextMenus.create).toHaveBeenCalledWith(
                expect.objectContaining({ id: `${MENU_ITEM_BASE_GROUP}-1` }),
                expect.any(Function),
            );
            expect(mockChrome.contextMenus.create).toHaveBeenCalledWith(
                expect.objectContaining({ id: `${MENU_ITEM_BASE_GROUP}-2` }),
                expect.any(Function),
            );
        });

        it('updateGroupContextMenus_shouldNotCreateMainMenuIfNoGroups', async () => {
            mockChrome.tabGroups.query.mockImplementation((_, callback) => callback([]));
            await updateGroupContextMenus();
            expect(mockChrome.contextMenus.create).not.toHaveBeenCalled();
        });
    });

    describe('getAllTabGroups', () => {
        const getAllTabGroups = () => (contextMenuService as any).getAllTabGroups();

        it('getAllTabGroups_shouldResolveWithGroupsOnSuccess', async () => {
            const groups = [{ id: 1, title: 'Test' }];
            mockChrome.tabGroups.query.mockImplementation((_, callback) => callback(groups as any));
            await expect(getAllTabGroups()).resolves.toEqual(groups);
        });

        it('getAllTabGroups_shouldRejectOnRuntimeError', async () => {
            const error = { message: 'An error occurred' };
            mockChrome.runtime.lastError = error;
            mockChrome.tabGroups.query.mockImplementation((_, callback) => callback([]));
            await expect(getAllTabGroups()).rejects.toBe(error);
            mockChrome.runtime.lastError = null;
        });
    });
});
