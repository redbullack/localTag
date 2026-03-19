'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(mode: ThemeMode) {
    if (typeof document === 'undefined') return;

    const resolved = mode === 'system' ? getSystemTheme() : mode;
    document.documentElement.setAttribute('data-theme', resolved);
}

function getInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'system';

    // preload에서 동기 주입된 초기 설정값 사용
    const initial = window.__initialSettings;
    if (initial?.theme === 'light' || initial?.theme === 'dark' || initial?.theme === 'system') {
        return initial.theme;
    }

    return 'system';
}

export interface UseThemeReturn {
    themeMode: ThemeMode;
    resolvedTheme: 'light' | 'dark';
    setThemeMode: (mode: ThemeMode) => void;
}

export function useTheme(): UseThemeReturn {
    const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialTheme);
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
        const stored = getInitialTheme();
        return stored === 'system' ? getSystemTheme() : stored;
    });

    const setThemeMode = useCallback((mode: ThemeMode) => {
        setThemeModeState(mode);
        applyThemeToDOM(mode);
        setResolvedTheme(mode === 'system' ? getSystemTheme() : mode);

        // electron-store에 비동기 저장
        window.electronAPI.setConfig({ key: 'theme', value: mode });
    }, []);

    // 기존 localStorage 값이 있으면 electron-store로 일회성 마이그레이션
    useEffect(() => {
        const legacy = localStorage.getItem('theme');
        if (legacy === 'light' || legacy === 'dark' || legacy === 'system') {
            window.electronAPI.setConfig({ key: 'theme', value: legacy });
            localStorage.removeItem('theme');
        }
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
