import { detectSystemTheme, getEffectiveTheme, onSystemThemeChange } from './utils';

describe('utils', () => {
    let matchMediaMock: jest.Mock;

    beforeEach(() => {
        matchMediaMock = jest.fn();
        Object.defineProperty(global, 'window', {
            value: {
                matchMedia: matchMediaMock,
                location: {
                    pathname: '',
                },
            },
            writable: true,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('detectSystemTheme', () => {
        it('should return "dark" when prefers-color-scheme is dark', () => {
            matchMediaMock.mockReturnValue({ matches: true });
            expect(detectSystemTheme()).toBe('dark');
            expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
        });

        it('should return "light" when prefers-color-scheme is not dark', () => {
            matchMediaMock.mockReturnValue({ matches: false });
            expect(detectSystemTheme()).toBe('light');
            expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
        });

        it('should return "light" when window.matchMedia is undefined', () => {
            Object.defineProperty(global, 'window', {
                value: {},
                writable: true,
            });
            expect(detectSystemTheme()).toBe('light');
        });
    });

    describe('getEffectiveTheme', () => {
        it('should return "dark" when themeMode is "dark"', () => {
            expect(getEffectiveTheme('dark')).toBe('dark');
        });

        it('should return "light" when themeMode is "light"', () => {
            expect(getEffectiveTheme('light')).toBe('light');
        });

        it('should return system theme when themeMode is "auto"', () => {
            matchMediaMock.mockReturnValue({ matches: true }); // System is dark
            expect(getEffectiveTheme('auto')).toBe('dark');

            matchMediaMock.mockReturnValue({ matches: false }); // System is light
            expect(getEffectiveTheme('auto')).toBe('light');
        });
    });

    describe('onSystemThemeChange', () => {
        it('should register a listener for system theme changes', () => {
            const addEventListenerMock = jest.fn();
            matchMediaMock.mockReturnValue({
                addEventListener: addEventListenerMock,
                matches: true,
            });

            const callback = jest.fn();
            onSystemThemeChange(callback);

            expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
            expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
        });

        it('should call callback with "dark" when system theme changes to dark', () => {
            const addEventListenerMock = jest.fn();
            matchMediaMock.mockReturnValue({
                addEventListener: addEventListenerMock,
                matches: true,
            });

            const callback = jest.fn();
            onSystemThemeChange(callback);

            // Simulate the event
            const eventHandler = addEventListenerMock.mock.calls[0][1];
            eventHandler({ matches: true });

            expect(callback).toHaveBeenCalledWith('dark');
        });

        it('should call callback with "light" when system theme changes to light', () => {
            const addEventListenerMock = jest.fn();
            matchMediaMock.mockReturnValue({
                addEventListener: addEventListenerMock,
                matches: true,
            });

            const callback = jest.fn();
            onSystemThemeChange(callback);

            // Simulate the event
            const eventHandler = addEventListenerMock.mock.calls[0][1];
            eventHandler({ matches: false });

            expect(callback).toHaveBeenCalledWith('light');
        });

        it('should safely do nothing if window.matchMedia is undefined', () => {
            Object.defineProperty(global, 'window', {
                value: {},
                writable: true,
            });
            const callback = jest.fn();
            expect(() => onSystemThemeChange(callback)).not.toThrow();
        });
    });
});
