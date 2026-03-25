import { useCallback, useEffect, useState } from 'react';
import type { UpdateDownloadProgress } from '../../global.d';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';

export interface AutoUpdateState {
    status: UpdateStatus;
    version: string | null;
    downloadPercent: number;
    errorMessage: string | null;
    startDownload: () => void;
    startInstall: () => void;
    recheckUpdate: () => void;
    dismiss: () => void;
}

/** 앱 자동 업데이트 상태를 관리하는 커스텀 훅 */
export function useAutoUpdate(): AutoUpdateState {
    const [status, setStatus] = useState<UpdateStatus>('idle');
    const [version, setVersion] = useState<string | null>(null);
    const [downloadPercent, setDownloadPercent] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        // 앱 시작 시 업데이트 확인
        setStatus('checking');
        window.electronAPI.checkForUpdate().then((response) => {
            if (!response.success) {
                setStatus('error');
                setErrorMessage(response.error ?? '업데이트 확인에 실패했습니다.');
                return;
            }

            if (response.data?.available) {
                setStatus('available');
                setVersion(response.data.version ?? null);
            } else {
                setStatus('up-to-date');
            }
        });

        // Main → Renderer 이벤트 리스너
        const cleanupAvailable = window.electronAPI.onUpdateAvailable((info) => {
            setStatus('available');
            setVersion(info.version);
        });

        const cleanupProgress = window.electronAPI.onUpdateDownloadProgress((progress: UpdateDownloadProgress) => {
            setStatus('downloading');
            setDownloadPercent(progress.percent);
        });

        const cleanupDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
            setStatus('downloaded');
            setVersion(info.version);
        });

        const cleanupError = window.electronAPI.onUpdateError((message) => {
            setStatus('error');
            setErrorMessage(message);
        });

        return () => {
            cleanupAvailable();
            cleanupProgress();
            cleanupDownloaded();
            cleanupError();
        };
    }, []);

    const startDownload = useCallback(() => {
        if (typeof window === 'undefined' || !window.electronAPI) return;
        setStatus('downloading');
        setDownloadPercent(0);
        window.electronAPI.downloadUpdate();
    }, []);

    const startInstall = useCallback(() => {
        if (typeof window === 'undefined' || !window.electronAPI) return;
        window.electronAPI.installUpdate();
    }, []);

    const recheckUpdate = useCallback(() => {
        if (typeof window === 'undefined' || !window.electronAPI) return;
        setStatus('checking');
        setErrorMessage(null);
        window.electronAPI.checkForUpdate().then((response) => {
            if (!response.success) {
                setStatus('error');
                setErrorMessage(response.error ?? '업데이트 확인에 실패했습니다.');
                return;
            }

            if (response.data?.available) {
                setStatus('available');
                setVersion(response.data.version ?? null);
            } else {
                setStatus('up-to-date');
            }
        });
    }, []);

    const dismiss = useCallback(() => {
        setStatus('idle');
    }, []);

    return { status, version, downloadPercent, errorMessage, startDownload, startInstall, recheckUpdate, dismiss };
}
