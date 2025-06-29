import { ClipboardService } from './clipboard.service';

const TEST_TAB_ID = 1;
const TEST_TAB_URL = 'https://example.com';

describe('ClipboardServiceTest', () => {
    let clipboardService: ClipboardService;
    let mockTabService: any;
    let mockPrefService: any;

    beforeEach(() => {
        mockTabService = {
            getActiveTabInCurrentWindow: jest.fn(),
        };

        mockPrefService = {
            getBooleanPreference: jest.fn(),
        };

        setupMockChrome();

        jest.spyOn(console, 'error').mockImplementation(() => {});

        clipboardService = new ClipboardService(mockTabService, mockPrefService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function setupMockChrome() {
        (global as any).chrome = {
            scripting: {
                executeScript: jest.fn().mockResolvedValue(undefined),
            },
            notifications: {
                create: jest.fn(),
            },
        };
    }

    const setupClipboardWriteMock = () => {
        const clipboardWriteMock = jest.fn();
        (chrome.scripting.executeScript as jest.Mock).mockImplementation(async ({ func, args }) => {
            (global as any).navigator = {
                clipboard: {
                    writeText: clipboardWriteMock,
                },
            };
            await func(...args);
        });
        return clipboardWriteMock;
    };

    it('copyCurrentTabUrl_copiesUrlToClipboard', async () => {
        mockTabService.getActiveTabInCurrentWindow.mockResolvedValue({
            id: TEST_TAB_ID,
            url: TEST_TAB_URL,
        });

        const clipboardWriteMock = setupClipboardWriteMock();

        await clipboardService.copyCurrentTabUrl();
        expect(clipboardWriteMock).toHaveBeenCalledWith(TEST_TAB_URL);
    });

    it('copyCurrentTabUrl_showsNotificationIfPrefTrue', async () => {
        mockTabService.getActiveTabInCurrentWindow.mockResolvedValue({
            id: TEST_TAB_ID,
            url: TEST_TAB_URL,
        });
        mockPrefService.getBooleanPreference.mockResolvedValue(true);

        await clipboardService.copyCurrentTabUrl();

        expect(chrome.notifications.create).toHaveBeenCalledWith(
            'current-tab-url-created',
            expect.objectContaining({
                type: 'basic',
                title: 'BetterTabTool',
                message: 'Link copied to clipboard!',
            }),
            expect.any(Function),
        );
    });

    it('copyCurrentTabUrl_noNotificationIfPrefFalse', async () => {
        mockTabService.getActiveTabInCurrentWindow.mockResolvedValue({
            id: TEST_TAB_ID,
            url: TEST_TAB_URL,
        });
        mockPrefService.getBooleanPreference.mockResolvedValue(false);

        await clipboardService.copyCurrentTabUrl();

        expect(chrome.notifications.create).not.toHaveBeenCalled();
    });

    it('copyCurrentTabUrl_handlesNoActiveTab', async () => {
        const clipboardWriteMock = setupClipboardWriteMock();
        await clipboardService.copyCurrentTabUrl();

        expect(clipboardWriteMock).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith('No URL or id found for current tab');
    });

    it('copyCurrentTabUrl_logsErrorOnException', async () => {
        mockTabService.getActiveTabInCurrentWindow.mockResolvedValue({
            id: TEST_TAB_ID,
            url: TEST_TAB_URL,
        });

        (chrome.scripting.executeScript as jest.Mock).mockRejectedValue(new Error('script failure'));

        await clipboardService.copyCurrentTabUrl();

        expect(console.error).toHaveBeenCalledWith('Error copying URL to clipboard: ', expect.any(Error));
    });
});
