'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(mode: ThemeMode) {
    if (typeof document === 'undefined') return;

    if (mode === 'light' || mode === 'dark') {
        document.documentElement.setAttribute('data-theme', mode);
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function getStoredTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'system';

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }

    return 'system';
}

export interface UseThemeReturn {
    themeMode: ThemeMode;
    resolvedTheme: 'light' | 'dark';
    setThemeMode: (mode: ThemeMode) => void;
}

export function useTheme(): UseThemeReturn {
    const [themeMode, setThemeModeState] = useState<ThemeMode>(getStoredTheme);
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
        const stored = getStoredTheme();
        return stored === 'system' ? getSystemTheme() : stored;
    });

    const setThemeMode = useCallback((mode: ThemeMode) => {
        setThemeModeState(mode);
        localStorage.setItem(STORAGE_KEY, mode);
        applyThemeToDOM(mode);
        setResolvedTheme(mode === 'system' ? getSystemTheme() : mode);
    }, []);

    useEffect(() => {
        applyThemeToDOM(themeMode);
    }, [themeMode]);

    useEffect(() => {
        if (themeMode !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            setResolvedTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [themeMode]);

    return { themeMode, resolvedTheme, setThemeMode };
}
