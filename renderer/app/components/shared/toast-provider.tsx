'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast } from './toast';

interface ToastOptions {
    message: string;
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
            <div style={{ position: 'fixed', bottom: 0, left: 0, zIndex: 9999 }}>
                {toasts.map((toast, index) => (
                    // 멀티플 토스트를 위해 약간씩 위로 쌓이게 예외처리 (css calc 활용 가능)
                    // 여기선 가장 단순하게 간격만 주어 쌓이게 렌더링
                    <div key={toast.id} style={{ marginBottom: index > 0 ? '10px' : '0' }}>
                        <Toast
                            message={toast.message}
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
