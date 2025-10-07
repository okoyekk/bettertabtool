import { TabService } from './tab.service';
import { PrefService } from './pref.service';

jest.mock('./pref.service');

describe('TabService', () => {
    let prefService: jest.Mocked<PrefService>;
    let tabService: TabService;
    let mockChrome: any;
    let consoleErrorSpy: jest.SpyInstance;

    const WINDOW_TYPE_NORMAL = 'normal';
    const WINDOW_TYPE_POPUP = 'popup';
    const WINDOW_STATE_NORMAL = 'normal';
    const WINDOW_STATE_MINIMIZED = 'minimized';
    const TAB_GROUP_ID_NONE = -1;
    const MOCK_ACTIVE_TAB_ID = 100;
    const MOCK_GROUP_ID = 500;
    const MOCK_NEW_TAB_ID = 123;
    const MOCK_NEW_GROUP_ID = 456;
    const TARGET_WINDOW_ID = 1;
    const MOVE_TO_END_INDEX = -1;

    const DEFAULT_TAB_PROPS = {
        groupId: TAB_GROUP_ID_NONE,
        pinned: false,
        mutedInfo: { muted: false },
    };

    const QUERY_ACTIVE_CURRENT_WINDOW = {
        active: true,
        currentWindow: true,
    };

    const ERROR_MESSAGES = {
        NO_URL_OR_ID: 'No URL or id found for current tab',
        NO_NEW_TAB_ID: 'No id found for new tab',
        OPEN_TAB_ERROR: 'Error opening new tab in current group: ',
        DISPLAY_ERROR: 'Error checking if windows are on the same display',
    };

    const mockWindow1 = {
        id: TARGET_WINDOW_ID,
        type: WINDOW_TYPE_NORMAL,
        tabs: [{ id: 101, ...DEFAULT_TAB_PROPS }],
        state: WINDOW_STATE_NORMAL,
    };
    const mockWindow2 = {
        id: 2,
        type: WINDOW_TYPE_NORMAL,
        tabs: [{ id: 201, ...DEFAULT_TAB_PROPS }],
        state: WINDOW_STATE_NORMAL,
    };
    const mockWindow3 = {
        id: 3,
        type: WINDOW_TYPE_NORMAL,
        tabs: [{ id: 301, ...DEFAULT_TAB_PROPS }],
        state: WINDOW_STATE_NORMAL,
    };
    const mockWindow4 = {
        id: 4,
        type: WINDOW_TYPE_POPUP,
        tabs: [{ id: 401, ...DEFAULT_TAB_PROPS }],
        state: WINDOW_STATE_NORMAL,
    };

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        mockChrome = {
            tabs: {
                query: jest.fn(),
                create: jest.fn(),
                duplicate: jest.fn(),
                group: jest.fn(),
                move: jest.fn().mockResolvedValue({}),
                update: jest.fn().mockResolvedValue({}),
                TAB_GROUP_ID_NONE,
            },
            tabGroups: {
                move: jest.fn().mockResolvedValue({}),
                query: jest.fn().mockResolvedValue([]),
                TAB_GROUP_ID_NONE,
            },
            windows: {
                create: jest.fn(),
                getCurrent: jest.fn(),
                getAll: jest.fn(),
                get: jest.fn(),
                remove: jest.fn(),
            },
            system: {
                display: {
                    getInfo: jest.fn(),
                },
            },
            runtime: {
                lastError: undefined,
            },
        };
        (global as any).chrome = mockChrome;
        jest.clearAllMocks();

        prefService = new PrefService() as jest.Mocked<PrefService>;
        tabService = new TabService(prefService);

        mockChrome.tabs.query.mockResolvedValue([]);
        mockChrome.tabs.create.mockResolvedValue({ id: MOCK_NEW_TAB_ID, groupId: TAB_GROUP_ID_NONE });
        mockChrome.tabs.group.mockResolvedValue(MOCK_NEW_GROUP_ID);
        mockChrome.windows.getCurrent.mockResolvedValue({ id: TARGET_WINDOW_ID, type: WINDOW_TYPE_NORMAL });
        mockChrome.windows.getAll.mockResolvedValue([mockWindow1, mockWindow2, mockWindow3, mockWindow4]);

        mockChrome.system.display.getInfo.mockResolvedValue([]);
        prefService.getBooleanPreference.mockResolvedValue(false);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('getActiveTabInCurrentWindow', () => {
        it('getActiveTabInCurrentWindow_shouldReturnActiveTab', async () => {
            const mockTab = { id: 1, active: true, currentWindow: true };
            mockChrome.tabs.query.mockResolvedValue([mockTab]);

            const result = await tabService.getActiveTabInCurrentWindow();
            expect(result).toEqual(mockTab);
            expect(mockChrome.tabs.query).toHaveBeenCalledWith(QUERY_ACTIVE_CURRENT_WINDOW);
        });

        it('getActiveTabInCurrentWindow_shouldReturnUndefinedIfNoActiveTab', async () => {
            mockChrome.tabs.query.mockResolvedValue([]);

            const result = await tabService.getActiveTabInCurrentWindow();
            expect(result).toBeUndefined();
        });
    });

    describe('getActiveTabInWindow', () => {
        it('getActiveTabInWindow_shouldReturnActiveTabInGivenWindow', () => {
            const mockWindow = {
                tabs: [
                    { id: 1, active: false },
                    { id: 2, active: true },
                    { id: 3, active: false },
                ],
            };
            const result = tabService.getActiveTabInWindow(mockWindow as chrome.windows.Window);
            expect(result).toEqual({ id: 2, active: true });
        });

        it('getActiveTabInWindow_shouldReturnUndefinedIfNoActiveTabInGivenWindow', () => {
            const mockWindow = {
                tabs: [
                    { id: 1, active: false },
                    { id: 2, active: false },
                ],
            };
            const result = tabService.getActiveTabInWindow(mockWindow as chrome.windows.Window);
            expect(result).toBeUndefined();
        });

        it('getActiveTabInWindow_shouldReturnUndefinedIfNoTabsInGivenWindow', () => {
            const mockWindow = { tabs: undefined };
            const result = tabService.getActiveTabInWindow(mockWindow as chrome.windows.Window);
            expect(result).toBeUndefined();
        });
    });

    describe('openNewTabInGroup', () => {
        const TEST_URLS = {
            OLD: 'http://old.com',
            NEW: 'http://new.com',
        };
        const CHROME_NEW_TAB_URL = 'chrome://new-tab-page';
        it('openNewTabInGroup_shouldOpenNewTabInExistingGroup', async () => {
            const mockActiveTab = { id: MOCK_ACTIVE_TAB_ID, url: TEST_URLS.OLD, groupId: MOCK_GROUP_ID };
            mockChrome.tabs.query.mockResolvedValue([mockActiveTab]);
            prefService.getBooleanPreference.mockResolvedValue(true);

            await tabService.openNewTabInGroup(TEST_URLS.NEW, MOCK_GROUP_ID);

            expect(mockChrome.tabs.create).toHaveBeenCalledWith({
                openerTabId: MOCK_ACTIVE_TAB_ID,
                active: true,
                url: TEST_URLS.NEW,
            });
            expect(mockChrome.tabs.group).toHaveBeenCalledWith({
                tabIds: [MOCK_NEW_TAB_ID],
                groupId: MOCK_GROUP_ID,
            });
        });

        it('openNewTabInGroup_shouldCreateNewGroupIfNoneExists', async () => {
            const mockActiveTab = { id: MOCK_ACTIVE_TAB_ID, url: TEST_URLS.OLD, groupId: TAB_GROUP_ID_NONE };
            mockChrome.tabs.query.mockResolvedValue([mockActiveTab]);
            prefService.getBooleanPreference.mockResolvedValue(false);

            await tabService.openNewTabInGroup(TEST_URLS.NEW);

            expect(mockChrome.tabs.create).toHaveBeenCalledWith({
                openerTabId: MOCK_ACTIVE_TAB_ID,
                active: false,
                url: TEST_URLS.NEW,
            });
            expect(mockChrome.tabs.group).toHaveBeenCalledWith({
                tabIds: [MOCK_ACTIVE_TAB_ID],
            });
            expect(mockChrome.tabs.group).toHaveBeenCalledWith({
                tabIds: [MOCK_NEW_TAB_ID],
                groupId: MOCK_NEW_GROUP_ID,
            });
        });

        it('openNewTabInGroup_shouldUseNewTabPageIfNoUrlProvided', async () => {
            const mockActiveTab = { id: MOCK_ACTIVE_TAB_ID, url: TEST_URLS.OLD, groupId: MOCK_GROUP_ID };
            mockChrome.tabs.query.mockResolvedValue([mockActiveTab]);

            await tabService.openNewTabInGroup(undefined, MOCK_GROUP_ID);

            expect(mockChrome.tabs.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: CHROME_NEW_TAB_URL,
                }),
            );
        });

        it('openNewTabInGroup_shouldHandleNullPreferenceValue', async () => {
            const mockActiveTab = { id: MOCK_ACTIVE_TAB_ID, url: TEST_URLS.OLD, groupId: MOCK_GROUP_ID };
            mockChrome.tabs.query.mockResolvedValue([mockActiveTab]);
            prefService.getBooleanPreference.mockResolvedValue(null);

            await tabService.openNewTabInGroup(TEST_URLS.NEW, MOCK_GROUP_ID);

            expect(mockChrome.tabs.create).toHaveBeenCalledWith({
                openerTabId: MOCK_ACTIVE_TAB_ID,
                active: false,
                url: TEST_URLS.NEW,
            });
        });

        it('openNewTabInGroup_shouldHandleTabWithoutUrl', async () => {
            const mockActiveTab = { id: MOCK_ACTIVE_TAB_ID, groupId: MOCK_GROUP_ID };
            mockChrome.tabs.query.mockResolvedValue([mockActiveTab]);

            await tabService.openNewTabInGroup(TEST_URLS.NEW, MOCK_GROUP_ID);

            expect(consoleErrorSpy).toHaveBeenCalledWith(ERROR_MESSAGES.NO_URL_OR_ID);
            expect(mockChrome.tabs.create).not.toHaveBeenCalled();
        });

        it('openNewTabInGroup_shouldLogErrorIfNoActiveTabUrlOrId', async () => {
            mockChrome.tabs.query.mockResolvedValue([{}] as any);

            await tabService.openNewTabInGroup();

            expect(consoleErrorSpy).toHaveBeenCalledWith(ERROR_MESSAGES.NO_URL_OR_ID);
            expect(mockChrome.tabs.create).not.toHaveBeenCalled();
        });

        it('openNewTabInGroup_shouldLogErrorIfNewTabHasNoId', async () => {
            const mockActiveTab = { id: 100, url: 'http://old.com', groupId: 500 };
            mockChrome.tabs.query.mockResolvedValue([mockActiveTab]);
            mockChrome.tabs.create.mockResolvedValue({});

            await tabService.openNewTabInGroup();

            expect(consoleErrorSpy).toHaveBeenCalledWith(ERROR_MESSAGES.NO_NEW_TAB_ID);
            expect(mockChrome.tabs.group).not.toHaveBeenCalled();
        });

        it('openNewTabInGroup_shouldHandleErrorsGracefully', async () => {
            mockChrome.tabs.query.mockRejectedValue(new Error('Query failed'));

            await tabService.openNewTabInGroup();

            expect(consoleErrorSpy).toHaveBeenCalledWith(ERROR_MESSAGES.OPEN_TAB_ERROR, expect.any(Error));
        });
    });

    describe('duplicateCurrentTab', () => {
        it('duplicateCurrentTab_shouldDuplicateActiveTab', async () => {
            const mockTab = { id: TARGET_WINDOW_ID, ...QUERY_ACTIVE_CURRENT_WINDOW };
            mockChrome.tabs.query.mockResolvedValue([mockTab]);

            await tabService.duplicateCurrentTab();

            expect(mockChrome.tabs.duplicate).toHaveBeenCalledWith(TARGET_WINDOW_ID);
        });

        it('duplicateCurrentTab_shouldDoNothingIfNoActiveTab', async () => {
            mockChrome.tabs.query.mockResolvedValue([]);

            await tabService.duplicateCurrentTab();

            expect(mockChrome.tabs.duplicate).not.toHaveBeenCalled();
        });
    });

    describe('areWindowsOnSameDisplay', () => {
        const mockDisplayInfo = [
            { id: 'display1', bounds: { left: 0, top: 0, width: 1000, height: 800 } },
            { id: 'display2', bounds: { left: 1000, top: 0, width: 1000, height: 800 } },
        ];

        beforeEach(() => {
            mockChrome.system.display.getInfo.mockResolvedValue(mockDisplayInfo);
        });

        it('areWindowsOnSameDisplay_shouldReturnTrueIfWindowsAreOnSameDisplay', async () => {
            const window1 = { id: 1, left: 100, top: 100, width: 200, height: 200 };
            const window2 = { id: 2, left: 300, top: 300, width: 200, height: 200 };

            const result = await (tabService as any).areWindowsOnSameDisplay(window1, window2);
            expect(result).toBe(true);
        });

        it('areWindowsOnSameDisplay_shouldReturnFalseIfWindowsAreOnDifferentDisplays', async () => {
            const window1 = { id: 1, left: 100, top: 100, width: 200, height: 200 };
            const window2 = { id: 2, left: 1100, top: 100, width: 200, height: 200 };

            const result = await (tabService as any).areWindowsOnSameDisplay(window1, window2);
            expect(result).toBe(false);
        });

        it('areWindowsOnSameDisplay_shouldHandleErrorGracefully', async () => {
            mockChrome.system.display.getInfo.mockRejectedValue(new Error('Display error'));

            const window1 = { id: 1, left: 100, top: 100, width: 200, height: 200 };
            const window2 = { id: 2, left: 300, top: 300, width: 200, height: 200 };

            const result = await (tabService as any).areWindowsOnSameDisplay(window1, window2);
            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith(ERROR_MESSAGES.DISPLAY_ERROR, expect.any(Error));
        });
    });

    describe('mergeAllWindows', () => {
        const MERGE_TARGET_WINDOW = {
            id: TARGET_WINDOW_ID,
            type: WINDOW_TYPE_NORMAL,
            tabs: [],
            state: WINDOW_STATE_NORMAL,
        };
        const TAB_MOVE_PARAMS = { windowId: TARGET_WINDOW_ID, index: MOVE_TO_END_INDEX };
        const TABGROUP_MOVE_PARAMS = { windowId: TARGET_WINDOW_ID, index: MOVE_TO_END_INDEX };

        beforeEach(() => {
            mockChrome.windows.getCurrent.mockResolvedValue({ id: TARGET_WINDOW_ID, type: WINDOW_TYPE_NORMAL });
            mockChrome.windows.getAll.mockResolvedValue([mockWindow1, mockWindow2, mockWindow3, mockWindow4]);
            mockChrome.tabs.move.mockResolvedValue({});
            mockChrome.tabGroups.move.mockResolvedValue({});
            mockChrome.tabGroups.query.mockResolvedValue([]);
        });

        it('mergeAllWindows_shouldMergeAllNormalWindowsIntoCurrentWindow', async () => {
            const mockWindowToMerge = {
                id: 2,
                type: WINDOW_TYPE_NORMAL,
                tabs: [{ id: 201, ...DEFAULT_TAB_PROPS }],
                state: WINDOW_STATE_NORMAL,
            };
            mockChrome.windows.getAll.mockResolvedValue([MERGE_TARGET_WINDOW, mockWindowToMerge]);

            await tabService.mergeAllWindows();

            expect(mockChrome.tabs.move).toHaveBeenCalledTimes(1);
            expect(mockChrome.tabs.move).toHaveBeenCalledWith(201, TAB_MOVE_PARAMS);
            expect(mockChrome.tabGroups.move).toHaveBeenCalledTimes(0);
        });

        it('mergeAllWindows_shouldSkipNonNormalWindows', async () => {
            await tabService.mergeAllWindows();
            expect(mockChrome.tabs.move).not.toHaveBeenCalledWith(401, expect.any(Object));
        });

        it('mergeAllWindows_shouldSkipWindowsWithNonNormalState', async () => {
            const minimizedWindow = {
                id: 5,
                type: WINDOW_TYPE_NORMAL,
                tabs: [{ id: 501 }],
                state: WINDOW_STATE_MINIMIZED,
            };
            mockChrome.windows.getAll.mockResolvedValue([mockWindow1, minimizedWindow]);

            await tabService.mergeAllWindows();

            expect(mockChrome.tabs.move).not.toHaveBeenCalledWith(501, expect.any(Object));
        });

        it('mergeAllWindows_shouldHandleConfirmMergeWindowsPreference', async () => {
            prefService.getBooleanPreference.mockImplementation((prefName) => {
                if (prefName === 'confirmMergeWindows') return Promise.resolve(true);
                return Promise.resolve(false);
            });

            await tabService.mergeAllWindows();
            expect(mockChrome.windows.getAll).not.toHaveBeenCalled();

            await tabService.mergeAllWindows();
            expect(mockChrome.windows.getAll).toHaveBeenCalled();
        });

        it('mergeAllWindows_shouldHandleNullPreferenceValues', async () => {
            prefService.getBooleanPreference.mockResolvedValue(null);
            mockChrome.windows.getAll.mockResolvedValue([
                { id: 1, type: 'normal', tabs: [], state: 'normal' },
                {
                    id: 2,
                    type: 'normal',
                    tabs: [{ id: 201, groupId: -1, pinned: false, mutedInfo: { muted: false } }],
                    state: 'normal',
                },
            ]);

            await tabService.mergeAllWindows();

            expect(mockChrome.tabs.move).toHaveBeenCalledTimes(1);
        });

        it('mergeAllWindows_shouldHandleMergeSameDisplayOnlyPreference', async () => {
            prefService.getBooleanPreference.mockImplementation((prefName) => {
                if (prefName === 'mergeSameDisplayOnly') return Promise.resolve(true);
                return Promise.resolve(false);
            });
            mockChrome.windows.getAll.mockResolvedValue([
                { id: 1, type: 'normal', tabs: [], state: 'normal' },
                {
                    id: 2,
                    type: 'normal',
                    tabs: [{ id: 201, groupId: -1, pinned: false, mutedInfo: { muted: false } }],
                    state: 'normal',
                },
                {
                    id: 3,
                    type: 'normal',
                    tabs: [{ id: 301, groupId: -1, pinned: false, mutedInfo: { muted: false } }],
                    state: 'normal',
                },
            ]);
            (tabService as any).areWindowsOnSameDisplay = jest
                .fn()
                .mockResolvedValueOnce(true) // Window 2 is on same display
                .mockResolvedValueOnce(false); // Window 3 is on different display

            await tabService.mergeAllWindows();

            expect(mockChrome.tabs.move).toHaveBeenCalledTimes(1);
            expect(mockChrome.tabs.move).toHaveBeenCalledWith(201, TAB_MOVE_PARAMS);
            expect(mockChrome.tabs.move).not.toHaveBeenCalledWith(301, expect.any(Object));
        });

        it('mergeAllWindows_shouldMovePinnedAndMutedTabsCorrectly', async () => {
            const pinnedTab = { id: 601, groupId: -1, pinned: true, mutedInfo: { muted: false } };
            const mutedTab = { id: 602, groupId: -1, pinned: false, mutedInfo: { muted: true } };
            const pinnedMutedTab = { id: 603, groupId: -1, pinned: true, mutedInfo: { muted: true } };
            const sourceWindow = {
                id: 6,
                type: 'normal',
                tabs: [pinnedTab, mutedTab, pinnedMutedTab],
                state: 'normal',
            };
            mockChrome.windows.getAll.mockResolvedValue([
                { id: 1, type: 'normal', tabs: [], state: 'normal' },
                sourceWindow,
            ]);

            await tabService.mergeAllWindows();

            expect(mockChrome.tabs.update).toHaveBeenCalledWith(601, { pinned: true, muted: false });
            expect(mockChrome.tabs.update).toHaveBeenCalledWith(602, { pinned: false, muted: true });
            expect(mockChrome.tabs.update).toHaveBeenCalledWith(603, { pinned: true, muted: true });
        });

        it('mergeAllWindows_shouldHandleTabsWithoutPinnedOrMutedInfo', async () => {
            const tabWithoutInfo = { id: 701, groupId: -1 };
            const sourceWindow = {
                id: 7,
                type: 'normal',
                tabs: [tabWithoutInfo],
                state: 'normal',
            };
            mockChrome.windows.getAll.mockResolvedValue([
                { id: 1, type: 'normal', tabs: [], state: 'normal' },
                sourceWindow,
            ]);

            await tabService.mergeAllWindows();

            expect(mockChrome.tabs.move).toHaveBeenCalledWith(701, { windowId: 1, index: -1 });
            expect(mockChrome.tabs.update).not.toHaveBeenCalledWith(701, expect.any(Object));
        });

        it('mergeAllWindows_shouldMoveTabGroups', async () => {
            const mockGroup = { id: 700, windowId: 2 };
            mockChrome.tabGroups.query.mockResolvedValue([mockGroup]);

            await tabService.mergeAllWindows();

            expect(mockChrome.tabGroups.move).toHaveBeenCalledWith(700, { windowId: 1, index: -1 });
        });

        it('mergeAllWindows_shouldDoNothingIfOnlyOneWindowOpen', async () => {
            mockChrome.windows.getAll.mockResolvedValue([mockWindow1]);
            await tabService.mergeAllWindows();
            expect(mockChrome.tabs.move).not.toHaveBeenCalled();
            expect(mockChrome.tabGroups.move).not.toHaveBeenCalled();
        });

        it('mergeAllWindows_shouldDoNothingIfTargetWindowIsNotNormal', async () => {
            mockChrome.windows.getCurrent.mockResolvedValue({ id: 1, type: 'devtools' });
            await tabService.mergeAllWindows();
            expect(mockChrome.tabs.move).not.toHaveBeenCalled();
            expect(mockChrome.tabGroups.move).not.toHaveBeenCalled();
        });
    });

    describe('popOutCurrentTab', () => {
        it('popOutCurrentTab_shouldPopOutCurrentTab', async () => {
            const mockTab = { id: 1, windowId: 2, width: 800, height: 600 };
            mockChrome.tabs.query.mockResolvedValue([mockTab]);
            mockChrome.windows.get.mockResolvedValue({ type: 'normal', tabs: [{ id: 1 }, { id: 2 }] });
            mockChrome.windows.create.mockResolvedValue({});

            await tabService.popOutCurrentTab();

            expect(mockChrome.tabs.query).toHaveBeenCalledWith({
                active: true,
                currentWindow: true,
            });
            expect(mockChrome.windows.create).toHaveBeenCalledWith({
                tabId: mockTab.id,
                type: 'normal',
                focused: true,
            });
        });

        it('popOutCurrentTab_shouldLogErrorIfNoActiveTab', async () => {
            mockChrome.tabs.query.mockResolvedValue([]);

            await tabService.popOutCurrentTab();

            expect(consoleErrorSpy).toHaveBeenCalledWith('No id found for current tab');
            expect(mockChrome.windows.create).not.toHaveBeenCalled();
        });

        it('popOutCurrentTab_shouldHandleErrorGracefully', async () => {
            const mockTab = { id: 1, width: 800, height: 600 };
            mockChrome.tabs.query.mockResolvedValue([mockTab]);
            mockChrome.windows.create.mockRejectedValue(new Error('Create window failed'));

            await tabService.popOutCurrentTab();

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error popping out tab: ', expect.any(Error));
        });

        it('popOutCurrentTab_shouldNotPopOutIfWindowIsNotNormal', async () => {
            const mockTab = { id: 1, windowId: 2 };
            mockChrome.tabs.query.mockResolvedValue([mockTab]);
            mockChrome.windows.get.mockResolvedValue({ type: 'popup' });

            await tabService.popOutCurrentTab();

            expect(mockChrome.windows.create).not.toHaveBeenCalled();
        });

        it('popOutCurrentTab_shouldDoNothingIfTabIsAlone', async () => {
            const mockTab = { id: 1, windowId: 2 };
            mockChrome.tabs.query.mockResolvedValue([mockTab]);
            mockChrome.windows.get.mockResolvedValue({ type: 'normal', tabs: [{ id: 1 }] });

            await tabService.popOutCurrentTab();

            expect(mockChrome.windows.create).not.toHaveBeenCalled();
        });
    });

    describe('closeAllPopupWindows', () => {
        it('closeAllPopupWindows_shouldCloseAllPopupWindows', async () => {
            const mockWindows = [
                { id: 1, type: 'normal' },
                { id: 2, type: 'popup' },
                { id: 3, type: 'popup' },
                { id: 4, type: 'normal' },
            ];
            mockChrome.windows.getAll.mockResolvedValue(mockWindows);
            mockChrome.windows.remove.mockResolvedValue();

            await tabService.closeAllPopupWindows();

            expect(mockChrome.windows.remove).toHaveBeenCalledTimes(2);
            expect(mockChrome.windows.remove).toHaveBeenCalledWith(2);
            expect(mockChrome.windows.remove).toHaveBeenCalledWith(3);
        });

        it('closeAllPopupWindows_shouldDoNothingIfNoPopupWindows', async () => {
            const mockWindows = [
                { id: 1, type: 'normal' },
                { id: 4, type: 'normal' },
            ];
            mockChrome.windows.getAll.mockResolvedValue(mockWindows);

            await tabService.closeAllPopupWindows();

            expect(mockChrome.windows.remove).not.toHaveBeenCalled();
        });

        it('closeAllPopupWindows_shouldHandleErrorsGracefully', async () => {
            mockChrome.windows.getAll.mockRejectedValue(new Error('Get all windows failed'));

            await tabService.closeAllPopupWindows();

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error closing popup windows: ', expect.any(Error));
        });
    });
});
