'use client';

import React, { useEffect, useState } from 'react';
import './toast.css';

interface ToastProps {
    message: string;
    duration?: number; // 자동 닫힘 시간 (ms), 0이면 자동 안 닫힘
    showConfirm?: boolean;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
    onClose?: () => void; // 완전히 사라진 후 호출됨
}

export function Toast({
    message,
    duration = 3000,
    showConfirm = false,
    showCancel = false,
    onConfirm,
    onCancel,
    onClose,
}: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    useEffect(() => {
        // 마운트 후 애니메이션 시작
        const mountTimer = setTimeout(() => {
            setIsVisible(true);
        }, 10); // 약간의 지연 후 렌더링해야 transition이 적용됨

        let autoCloseTimer: NodeJS.Timeout;

        if (duration > 0) {
            autoCloseTimer = setTimeout(() => {
                handleClose();
            }, duration);
        }

        return () => {
            clearTimeout(mountTimer);
            if (autoCloseTimer) clearTimeout(autoCloseTimer);
        };
    }, [duration]);

    const handleClose = () => {
        setIsAnimatingOut(true);
        // 애니메이션이 끝난 후 DOM 트리에서 제거되도록 onClose 콜백 호출
        setTimeout(() => {
            if (onClose) onClose();
        }, 300); // css transition duration (300ms)과 맞춤
    };

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        handleClose();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        handleClose();
    };

    return (
        <div
            className={`toast-container ${isVisible ? 'toast-visible' : ''} ${isAnimatingOut ? 'toast-hiding' : ''
                }`}
        >
            <div className="toast-content">
                <span className="toast-message">{message}</span>

                {(showConfirm || showCancel) && (
                    <div className="toast-actions">
                        {showCancel && (
                            <button className="toast-btn toast-btn-cancel" onClick={handleCancel}>
                                취소
                            </button>
                        )}
                        {showConfirm && (
                            <button className="toast-btn toast-btn-confirm" onClick={handleConfirm}>
                                확인
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
