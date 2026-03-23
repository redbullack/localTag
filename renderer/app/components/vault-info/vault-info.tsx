'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatBytes } from '../../utils/format-bytes';
import { useConfirm } from '../shared/confirm-dialog';
import { useLoadingOverlay } from '../shared/loading-overlay';
import { useToast } from '../shared/toast-provider';
import './vault-info.css';

interface StorageInfo {
    vaultSize: number;
    vaultFileCount: number;
    driveTotal: number;
    driveFree: number;
    driveUsed: number;
}

interface VaultInfoProps {
    vaultPath: string;
    isSyncing: boolean;
    isRelocating: boolean;
    onSync: () => void;
    onVaultRelocated: (newPath: string) => void;
    onRelocatingChange: (isRelocating: boolean) => void;
    /** 파일 변경 이벤트 시 용량 정보를 갱신하기 위한 트리거 카운터 */
    refreshTrigger: number;
}

export default function VaultInfo({
    vaultPath,
    isSyncing,
    isRelocating,
    onSync,
    onVaultRelocated,
    onRelocatingChange,
    refreshTrigger,
}: VaultInfoProps) {
    const { showToast } = useToast();
    const { showConfirm } = useConfirm();
    const { showLoading, updateProgress, hideLoading } = useLoadingOverlay();

    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

    const isDisabled = isSyncing || isRelocating;

    /** 용량 정보를 조회한다. */
    const loadStorageInfo = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const response = await window.electronAPI.getStorageInfo();
        if (response.success && response.data) {
            setStorageInfo(response.data);
        }
    }, []);

    // 마운트 시 + refreshTrigger 변경 시 용량 정보 로드
    useEffect(() => {
        loadStorageInfo();
    }, [loadStorageInfo, refreshTrigger]);

    /** Vault 위치를 변경한다. */
    const handleRelocate = async () => {
        if (typeof window === 'undefined' || !window.electronAPI || isDisabled) return;

        const confirmed = await showConfirm({
            title: 'Vault 위치 변경',
            message: '모든 파일을 새 위치로 이동합니다.\n파일 수에 따라 시간이 걸릴 수 있습니다.\n계속하시겠습니까?',
            confirmText: '이동',
        });
        if (!confirmed) return;

        onRelocatingChange(true);

        // 진행률 수신 등록 — 첫 번째 이벤트 수신 시 로딩 오버레이를 즉시 표시한다.
        // (relocateVault 내부에서 폴더 선택 다이얼로그가 먼저 열리므로,
        //  다이얼로그 전에 showLoading을 호출하면 500ms 지연 타이머가 소진되어 표시되지 않는다.)
        const overlayShownRef = { current: false };
        const cleanup = window.electronAPI.onVaultRelocateProgress((progress) => {
            if (!overlayShownRef.current) {
                overlayShownRef.current = true;
                showLoading({ operationType: 'relocate', description: 'Vault 이동 중...' }, { immediate: true });
            }
            updateProgress({
                currentFile: progress.currentFile,
                currentIndex: progress.current,
                totalCount: progress.total,
            });
        });

        try {
            const response = await window.electronAPI.relocateVault();

            if (!response.success) {
                if (response.error !== 'canceled') {
                    showToast({
                        type: 'error',
                        message: response.error || 'Vault 이동에 실패했습니다.',
                        duration: 4000,
                    });
                }
                return;
            }

            if (response.data) {
                showToast({
                    type: 'success',
                    message: `Vault가 새 위치로 이동되었습니다. (${response.data.movedFileCount}개 파일)`,
                    duration: 4000,
                });
                onVaultRelocated(response.data.newVaultPath);
            }
        } catch (error) {
            console.error('Vault relocate error:', error);
            showToast({
                type: 'error',
                message: 'Vault 이동 중 예기치 않은 오류가 발생했습니다.',
                duration: 4000,
            });
        } finally {
            cleanup();
            onRelocatingChange(false);
            hideLoading();
            loadStorageInfo();
        }
    };

    const driveUsedPercent = storageInfo && storageInfo.driveTotal > 0
        ? Math.round((storageInfo.driveUsed / storageInfo.driveTotal) * 100)
        : 0;

    // ── 기본 UI (2행 compact) ──
    return (
        <div className="vault-info">
            {/* 1행: 경로 + 액션 버튼 */}
            <div className="vault-info__row vault-info__row--primary">
                <div className="vault-info__path-group">
                    <span className="vault-info__label">Vault 경로</span>
                    <code className="vault-info__path">{vaultPath}</code>
                </div>
                <div className="vault-info__actions">
                    <button
                        className="vault-info__action-btn"
                        data-tooltip="⚠️ Vault 폴더(MyTaggedFiles)에서 파일을 수동으로 이동하거나 삭제하지 마세요."
                        onClick={handleRelocate}
                        disabled={isDisabled}
                    >
                        📁 위치 변경
                    </button>
                    <button
                        className="sync-button"
                        data-tooltip="Vault 폴더와 DB를 비교하여 파일 추가, 삭제, 메타데이터 변경 사항을 최신 상태로 맞춥니다."
                        onClick={onSync}
                        disabled={isDisabled}
                    >
                        <span className={isSyncing ? 'spin-animation' : ''}>🔄</span>
                        {isSyncing ? '동기화 중...' : '동기화'}
                    </button>
                </div>
            </div>

            {/* 2행: 용량 정보 */}
            {storageInfo && (
                <div className="vault-info__row vault-info__row--storage">
                    <div className="vault-info__storage-items">
                        <span className="vault-info__storage-item">
                            💾 Vault: {formatBytes(storageInfo.vaultSize)} ({storageInfo.vaultFileCount}개)
                        </span>
                        {storageInfo.driveTotal > 0 && (
                            <>
                                <span className="vault-info__storage-divider">|</span>
                                <span className="vault-info__storage-item">
                                    드라이브: {formatBytes(storageInfo.driveUsed)} / {formatBytes(storageInfo.driveTotal)} ({formatBytes(storageInfo.driveFree)} 여유)
                                </span>
                            </>
                        )}
                    </div>
                    {storageInfo.driveTotal > 0 && (
                        <div className="vault-info__capacity-bar">
                            <div
                                className="vault-info__capacity-fill"
                                style={{ width: `${driveUsedPercent}%` }}
                                data-warn={driveUsedPercent >= 90 ? '' : undefined}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
