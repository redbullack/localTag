'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const LOCAL_STORAGE_KEY = 'theme';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(mode: ThemeMode) {
    if (typeof document === 'undefined') return;

    const resolved = mode === 'system' ? getSystemTheme() : mode;
    document.documentElement.setAttribute('data-theme', resolved);
}

/** localStorage에서 캐시된 테마를 읽는다 (FOUC 방지 인라인 스크립트와 동일한 소스) */
function getCachedTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'system';

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }

    return 'system';
}

/** localStorage에 테마를 캐시한다 (FOUC 방지용 읽기 전용 캐시) */
function cacheThemeToLocalStorage(theme: ThemeMode) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_KEY, theme);
}

export interface UseThemeReturn {
    themeMode: ThemeMode;
    resolvedTheme: 'light' | 'dark';
    setThemeMode: (mode: ThemeMode) => void;
}

export function useTheme(): UseThemeReturn {
    const [themeMode, setThemeModeState] = useState<ThemeMode>(getCachedTheme);
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
        const cached = getCachedTheme();
        return cached === 'system' ? getSystemTheme() : cached;
    });

    // 마운트 시 electron-store에서 실제 테마를 가져와 동기화
    useEffect(() => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        window.electronAPI.getTheme().then((storedTheme) => {
            setThemeModeState(storedTheme);
            cacheThemeToLocalStorage(storedTheme);
            applyThemeToDOM(storedTheme);
            setResolvedTheme(storedTheme === 'system' ? getSystemTheme() : storedTheme);
        });
    }, []);

    const setThemeMode = useCallback((mode: ThemeMode) => {
        setThemeModeState(mode);
        applyThemeToDOM(mode);
        setResolvedTheme(mode === 'system' ? getSystemTheme() : mode);

        // electron-store에 저장 (source of truth)
        if (window.electronAPI) {
            window.electronAPI.setTheme(mode);
        }

        // localStorage에 캐시 (FOUC 방지용)
        cacheThemeToLocalStorage(mode);
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
