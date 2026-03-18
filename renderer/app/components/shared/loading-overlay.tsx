'use client';

import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { useDelayedLoading } from '../../utils/use-delayed-loading';
import './loading-overlay.css';

/** 파일 작업 진행률 상태 */
export interface LoadingProgress {
    operationType: 'add' | 'delete' | 'move' | 'copy' | 'sync';
    description: string;
    currentFile?: string;
    currentIndex?: number;
    totalCount?: number;
    bytesTransferred?: number;
    totalBytes?: number;
}

interface LoadingOverlayContextType {
    showLoading: (progress: LoadingProgress) => void;
    updateProgress: (progress: Partial<LoadingProgress>) => void;
    hideLoading: () => void;
    isOperationActive: boolean;
}

const LoadingOverlayContext = createContext<LoadingOverlayContextType | undefined>(undefined);

export function LoadingOverlayProvider({ children }: { children: ReactNode }) {
    const [progress, setProgress] = useState<LoadingProgress | null>(null);
    const isActiveRef = useRef(false);
    const { isVisible, startLoading, stopLoading } = useDelayedLoading();

    const showLoading = useCallback((initial: LoadingProgress) => {
        isActiveRef.current = true;
        setProgress(initial);
        startLoading();
    }, [startLoading]);

    const updateProgress = useCallback((partial: Partial<LoadingProgress>) => {
        setProgress((prev) => prev ? { ...prev, ...partial } : null);
    }, []);

    const hideLoading = useCallback(() => {
        isActiveRef.current = false;
        stopLoading();
        // progress 상태는 stopLoading의 최소 표시 시간 후 정리
        setTimeout(() => {
            if (!isActiveRef.current) {
                setProgress(null);
            }
        }, 400);
    }, [stopLoading]);

    const isDeterminate = progress?.totalCount != null && progress.totalCount > 0;
    const overallPercent = isDeterminate && progress.currentIndex != null
        ? Math.round((progress.currentIndex / progress.totalCount!) * 100)
        : 0;
    const bytePercent = progress?.totalBytes && progress.bytesTransferred
        ? Math.round((progress.bytesTransferred / progress.totalBytes) * 100)
        : 0;

    return (
        <LoadingOverlayContext.Provider
            value={{
                showLoading,
                updateProgress,
                hideLoading,
                isOperationActive: isActiveRef.current,
            }}
        >
            {children}
            {isVisible && progress && (
                <div className="loading-overlay">
                    <div className="loading-overlay__card">
                        <div className="loading-overlay__header">
                            <div className="loading-overlay__spinner" />
                            <h3 className="loading-overlay__title">{progress.description}</h3>
                        </div>

                        {progress.currentFile && (
                            <div className="loading-overlay__current-file">
                                {progress.currentFile}
                            </div>
                        )}

                        {isDeterminate ? (
                            <>
                                <div className="loading-overlay__progress-bar">
                                    <div
                                        className="loading-overlay__progress-fill"
                                        style={{ width: `${overallPercent}%` }}
                                    />
                                </div>

                                {progress.totalBytes != null && progress.totalBytes > 0 && (
                                    <div className="loading-overlay__byte-progress-bar">
                                        <div
                                            className="loading-overlay__byte-progress-fill"
                                            style={{ width: `${bytePercent}%` }}
                                        />
                                    </div>
                                )}

                                <div className="loading-overlay__detail">
                                    {progress.currentIndex} / {progress.totalCount} 파일
                                </div>
                            </>
                        ) : (
                            <div className="loading-overlay__progress-bar">
                                <div className="loading-overlay__progress-fill loading-overlay__progress-fill--indeterminate" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </LoadingOverlayContext.Provider>
    );
}

export const useLoadingOverlay = (): LoadingOverlayContextType => {
    const context = useContext(LoadingOverlayContext);
    if (context === undefined) {
        throw new Error('useLoadingOverlay must be used within a LoadingOverlayProvider');
    }
    return context;
};
