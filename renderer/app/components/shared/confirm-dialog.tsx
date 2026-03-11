'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import './confirm-dialog.css';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

interface ConfirmContextType {
    showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface ConfirmState extends ConfirmOptions {
    resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

    const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({ ...options, resolve });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (!confirmState) return;
        confirmState.resolve(true);
        setConfirmState(null);
    }, [confirmState]);

    const handleCancel = useCallback(() => {
        if (!confirmState) return;
        confirmState.resolve(false);
        setConfirmState(null);
    }, [confirmState]);

    /** 모달이 열리면 확인 버튼에 포커스를 준다. */
    useEffect(() => {
        if (confirmState && confirmBtnRef.current) {
            confirmBtnRef.current.focus();
        }
    }, [confirmState]);

    /** Escape 키로 취소, Enter 키로 확인을 처리한다. */
    useEffect(() => {
        if (!confirmState) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [confirmState, handleCancel]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    return (
        <ConfirmContext.Provider value={{ showConfirm }}>
            {children}
            {confirmState && (
                <div className="confirm-overlay" onClick={handleOverlayClick}>
                    <div className="confirm-dialog">
                        {confirmState.title && (
                            <h3 className="confirm-dialog__title">{confirmState.title}</h3>
                        )}
                        <p className="confirm-dialog__message">{confirmState.message}</p>
                        <div className="confirm-dialog__actions">
                            <button
                                className="confirm-dialog__btn confirm-dialog__btn--cancel"
                                onClick={handleCancel}
                            >
                                {confirmState.cancelText || '취소'}
                            </button>
                            <button
                                ref={confirmBtnRef}
                                className={`confirm-dialog__btn confirm-dialog__btn--confirm ${confirmState.danger ? 'confirm-dialog__btn--danger' : ''}`}
                                onClick={handleConfirm}
                            >
                                {confirmState.confirmText || '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (context === undefined) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};
