'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, type ToastType } from './toast';

interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
    showConfirm?: boolean;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
}

interface ToastContextType {
    showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<(ToastOptions & { id: string })[]>([]);

    const showToast = useCallback((options: ToastOptions) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { ...options, id }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* 
        여러 토스트가 쌓일 수 있도록 구현할 수도 있지만,
        보통 좌측 하단 토스트는 최상단 하나 혹은 쌓이는 형태로 둡니다. 
        여기서는 간단하게 화면에 렌더링하도록 맵핑합니다.
      */}
            <div 
                style={{ 
                    position: 'fixed', 
                    bottom: '2rem', 
                    left: '2rem', 
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    gap: '0.75rem',
                    pointerEvents: 'none' // 컨테이너 자체는 클릭 무시
                }}
            >
                {toasts.map((toast) => (
                    <div key={toast.id} style={{ pointerEvents: 'auto' }}>
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            duration={toast.duration}
                            showConfirm={toast.showConfirm}
                            showCancel={toast.showCancel}
                            onConfirm={toast.onConfirm}
                            onCancel={toast.onCancel}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
