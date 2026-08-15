/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

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
