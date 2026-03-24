'use client';

import { useCallback, useEffect, useState } from 'react';
import './auto-start-toggle.css';

export default function AutoStartToggle() {
    const [autoStart, setAutoStart] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSetting = async () => {
            if (typeof window === 'undefined' || !window.electronAPI) return;

            const response = await window.electronAPI.getConfig({ key: 'autoStart' });
            if (response.success && response.data !== undefined) {
                setAutoStart(response.data as boolean);
            }
            setIsLoading(false);
        };

        loadSetting();
    }, []);

    const handleToggle = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const newValue = !autoStart;
        setAutoStart(newValue);

        const response = await window.electronAPI.setConfig({
            key: 'autoStart',
            value: newValue,
        });

        if (!response.success) {
            setAutoStart(!newValue);
        }
    }, [autoStart]);

    if (isLoading) return null;

    return (
        <button
            className={`auto-start-toggle${autoStart ? ' auto-start-toggle--active' : ''}`}
            onClick={handleToggle}
            title={`PC 부팅 시 자동으로 앱 실행 (${autoStart ? '켜짐' : '꺼짐'})`}
            aria-label={`PC 부팅 시 자동으로 앱 실행 (${autoStart ? '켜짐' : '꺼짐'})`}
            role="switch"
            aria-checked={autoStart}
            type="button"
        >
            <span className="auto-start-toggle__knob" />
        </button>
    );
}
