/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { userPreferencesToDescriptions } from '../constants';

type MediaQueryListener = (event: { matches: boolean }) => void;

function mockMatchMedia(initialMatches: boolean) {
    const listeners: MediaQueryListener[] = [];
    const mql = {
        matches: initialMatches,
        media: '(prefers-color-scheme: dark)',
        addEventListener: (_event: string, listener: MediaQueryListener) => {
            listeners.push(listener);
        },
        removeEventListener: jest.fn(),
    };
    (window as any).matchMedia = jest.fn().mockReturnValue(mql);

    return {
        fireChange: (matches: boolean) => {
            mql.matches = matches;
            act(() => {
                listeners.forEach((listener) => listener({ matches }));
            });
        },
    };
}

function mockPreferences(preferences: { [key: string]: any }) {
    (global as any).chrome = {
        runtime: {
            sendMessage: jest.fn((_message: any, callback: (response: any) => void) => {
                callback({ success: true, preferences });
            }),
        },
    };
}

describe('App theme wiring', () => {
    it('reflects the system theme when themeMode preference is "auto"', async () => {
        mockMatchMedia(true); // system is dark
        mockPreferences({ themeMode: 'auto' });

        render(<App />);

        const root = await screen.findByTestId('app-root');
        expect(root).toHaveAttribute('data-theme', 'dark');
    });

    it('updates the effective theme when the system theme changes while themeMode is "auto"', async () => {
        const { fireChange } = mockMatchMedia(false); // system starts light
        mockPreferences({ themeMode: 'auto' });

        render(<App />);

        const root = await screen.findByTestId('app-root');
        expect(root).toHaveAttribute('data-theme', 'light');

        fireChange(true); // system switches to dark

        expect(root).toHaveAttribute('data-theme', 'dark');
    });

    it('ignores system theme changes when themeMode is explicitly set', async () => {
        const { fireChange } = mockMatchMedia(false); // system starts light
        mockPreferences({ themeMode: 'dark' });

        render(<App />);

        const root = await screen.findByTestId('app-root');
        expect(root).toHaveAttribute('data-theme', 'dark');

        fireChange(true); // system switches to dark; should have no effect since themeMode is fixed

        expect(root).toHaveAttribute('data-theme', 'dark');
    });
});

describe('App preference rows', () => {
    const BOOLEAN_PREF_KEY = 'showCopyNotification';
    const BOOLEAN_PREF_DESCRIPTION = userPreferencesToDescriptions[BOOLEAN_PREF_KEY].description;

    beforeEach(() => {
        mockMatchMedia(false);
        mockPreferences({ [BOOLEAN_PREF_KEY]: false });
    });

    it('gives the checkbox an accessible name matching its preference description', async () => {
        render(<App />);

        expect(await screen.findByRole('checkbox', { name: BOOLEAN_PREF_DESCRIPTION })).toBeInTheDocument();
    });

    it('toggles the preference when the row label text is clicked, not just the checkbox itself', async () => {
        render(<App />);

        const checkbox = await screen.findByRole('checkbox', { name: BOOLEAN_PREF_DESCRIPTION });
        expect(checkbox).not.toBeChecked();

        fireEvent.click(screen.getByText(BOOLEAN_PREF_DESCRIPTION));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'PREF_setPreference',
                key: BOOLEAN_PREF_KEY,
                value: true,
            }),
            expect.any(Function),
        );
    });
});
