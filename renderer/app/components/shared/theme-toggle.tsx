'use client';

import type { ThemeMode } from '../../utils/use-theme';
import { useThemeContext } from './theme-provider';
import './theme-toggle.css';

const THEME_OPTIONS: { value: ThemeMode; icon: string; label: string }[] = [
    { value: 'light', icon: '\u2600', label: '라이트 모드' },
    { value: 'system', icon: '\uD83D\uDDA5', label: '시스템 설정' },
    { value: 'dark', icon: '\uD83C\uDF19', label: '다크 모드' },
];

export default function ThemeToggle() {
    const { themeMode, setThemeMode } = useThemeContext();

    return (
        <div className="theme-toggle" role="radiogroup" aria-label="테마 설정">
            {THEME_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    className={`theme-toggle__btn${themeMode === option.value ? ' theme-toggle__btn--active' : ''}`}
                    onClick={() => setThemeMode(option.value)}
                    aria-checked={themeMode === option.value}
                    aria-label={option.label}
                    data-tooltip={option.label}
                    role="radio"
                    type="button"
                >
                    {option.icon}
                </button>
            ))}
        </div>
    );
}
