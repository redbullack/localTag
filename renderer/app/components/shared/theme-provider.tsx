'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useTheme, type UseThemeReturn } from '../../utils/use-theme';

const ThemeContext = createContext<UseThemeReturn | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const theme = useTheme();

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeContext(): UseThemeReturn {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used within ThemeProvider');
    }

    return context;
}
