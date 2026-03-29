'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Tag } from '../../types';
import { useToast } from '../shared/toast-provider';
import TagSearchDropdown from '../shared/tag-search-dropdown';
import TagBadge from '../shared/tag-badge';
import '../tag-form-modal/tag-form-modal.css';
import './auto-collect-settings.css';

const MAX_WATCH_PATHS = 10;

interface AutoCollectSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    allTags: Tag[];
    onSettingsChanged: () => void;
}

export default function AutoCollectSettingsModal({
    isOpen,
    onClose,
    allTags,
    onSettingsChanged,
}: AutoCollectSettingsModalProps) {
    const { showToast } = useToast();
    const [enabled, setEnabled] = useState(false);
    const [watchPaths, setWatchPaths] = useState<string[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 설정 로드
    useEffect(() => {
        if (!isOpen) return;

        const loadSettings = async () => {
            if (typeof window === 'undefined' || !window.electronAPI) return;
            setIsLoading(true);

            const response = await window.electronAPI.getAutoCollectSettings();
            if (response.success && response.data) {
                const settings = response.data;
                setEnabled(settings.enabled);
                setWatchPaths(settings.watchPaths);
                setSelectedTagIds(new Set(settings.defaultTagIds));
            }
            setIsLoading(false);
        };

        loadSettings();
    }, [isOpen]);

    // 폴더 추가
    const handleAddFolder = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;
        if (watchPaths.length >= MAX_WATCH_PATHS) {
            showToast({ type: 'error', message: `감시 폴더는 최대 ${MAX_WATCH_PATHS}개까지 추가할 수 있습니다.` });
            return;
        }

        const response = await window.electronAPI.selectWatchFolder();
        if (response.success && response.data?.folderPath) {
            const newPath = response.data.folderPath;
            setWatchPaths(prev => {
                if (prev.includes(newPath)) return prev;
                return [...prev, newPath];
            });
        }
    }, [watchPaths.length, showToast]);

    // 폴더 제거
    const handleRemoveFolder = useCallback((pathToRemove: string) => {
        setWatchPaths(prev => prev.filter(p => p !== pathToRemove));
    }, []);

    // 태그 선택/해제
    const handleSelectTag = useCallback((tagId: number | null) => {
        if (tagId === null) return;
        setSelectedTagIds(prev => {
            const next = new Set(prev);
            if (next.has(tagId)) {
                next.delete(tagId);
            } else {
                next.add(tagId);
            }
            return next;
        });
    }, []);

    // 태그 제거 (뱃지에서)
    const handleRemoveTag = useCallback((tagId: number) => {
        setSelectedTagIds(prev => {
            const next = new Set(prev);
            next.delete(tagId);
            return next;
        });
    }, []);

    // 토글
    const handleToggle = useCallback(() => {
        setEnabled(prev => !prev);
    }, []);

    // 저장
    const handleSave = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;
        setIsSaving(true);

        const response = await window.electronAPI.updateAutoCollectSettings({
            enabled,
            watchPaths,
            defaultTagIds: Array.from(selectedTagIds),
        });

        setIsSaving(false);

        if (response.success) {
            showToast({ type: 'success', message: '자동 수집 설정이 저장되었습니다.' });
            onSettingsChanged();
            onClose();
        }
    }, [enabled, watchPaths, selectedTagIds, onSettingsChanged, onClose, showToast]);

    // 키보드 핸들링
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    // 오버레이 클릭
    const handleOverlayClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    if (!isOpen) return null;

    // 선택된 태그 정보 조회
    const selectedTags = allTags.filter(t => selectedTagIds.has(t.id));

    return (
        <div className="modal-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
            <div className="modal-container">
                {/* 헤더 */}
                <div className="modal-header">
                    <span className="modal-title">다운로드 자동 수집</span>
                    <button className="modal-close-button" onClick={onClose} type="button">
                        ✕
                    </button>
                </div>

                {/* 바디 */}
                <div className="modal-body">
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                            설정 불러오는 중...
                        </div>
                    ) : (
                        <>
                            {/* ON/OFF 토글 */}
                            <div className="collect-toggle-row">
                                <div>
                                    <div className="collect-toggle-row__label">자동 수집</div>
                                    <div className="collect-toggle-row__description">
                                        감시 폴더의 파일을 Vault로 자동 이동
                                    </div>
                                </div>
                                <button
                                    className={`auto-start-toggle${enabled ? ' auto-start-toggle--active' : ''}`}
                                    onClick={handleToggle}
                                    role="switch"
                                    aria-checked={enabled}
                                    type="button"
                                >
                                    <span className="auto-start-toggle__knob" />
                                </button>
                            </div>

                            {/* 감시 폴더 */}
                            <div className="form-group">
                                <label className="form-label">감시 폴더</label>
                                <div className="watch-path-list">
                                    {watchPaths.map((watchPath) => (
                                        <div key={watchPath} className="watch-path-item">
                                            <span className="watch-path-item__path" title={watchPath}>
                                                {watchPath}
                                            </span>
                                            <button
                                                className="watch-path-item__remove"
                                                onClick={() => handleRemoveFolder(watchPath)}
                                                title="폴더 제거"
                                                type="button"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        className="watch-path-add"
                                        onClick={handleAddFolder}
                                        disabled={watchPaths.length >= MAX_WATCH_PATHS}
                                        type="button"
                                    >
                                        + 폴더 추가 ({watchPaths.length}/{MAX_WATCH_PATHS})
                                    </button>
                                </div>
                            </div>

                            {/* 기본 태그 */}
                            <div className="form-group">
                                <label className="form-label">자동 부여 태그</label>
                                {selectedTags.length > 0 ? (
                                    <div className="selected-tags">
                                        {selectedTags.map(tag => (
                                            <TagBadge
                                                key={tag.id}
                                                name={tag.name}
                                                color={tag.color}
                                                onClose={() => handleRemoveTag(tag.id)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="selected-tags--empty">
                                        태그를 선택하면 수집된 파일에 자동 부여됩니다
                                    </div>
                                )}
                                <TagSearchDropdown
                                    tags={allTags}
                                    selectedTagIds={selectedTagIds}
                                    onSelectTag={handleSelectTag}
                                    selectionMode="multiple"
                                    searchPlaceholder="태그 검색..."
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* 푸터 */}
                <div className="modal-footer">
                    <button className="button button--secondary" onClick={onClose} type="button">
                        취소
                    </button>
                    <button
                        className="button button--primary"
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        type="button"
                    >
                        {isSaving ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}
