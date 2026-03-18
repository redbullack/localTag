'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './file-tag-editor.css';
import type { FileWithTags, Tag } from '../../types';
import TagSearchDropdown from '../shared/tag-search-dropdown';
import TagBadge from '../shared/tag-badge';
import { useClickOutside } from '../../utils/use-click-outside';

interface FileTagEditorProps {
    /** 모달 열림 여부 */
    isOpen: boolean;
    /** 편집 대상 파일 목록 */
    selectedFiles: FileWithTags[];
    /** 전체 태그 목록 (드롭다운 후보) */
    allTags: Tag[];
    /** 저장 콜백 */
    onSave: (fileIds: number[], tagIds: number[]) => void;
    /** 닫기 콜백 */
    onClose: () => void;
}

export default function FileTagEditor({
    isOpen,
    selectedFiles,
    allTags,
    onSave,
    onClose,
}: FileTagEditorProps) {
    const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isBulkEdit = selectedFiles.length > 1;

    /** 편집 대상 파일들의 태그 합집합을 초기 선택값으로 사용한다. */
    const initialSelectedTagIds = useMemo(() => {
        const union = new Set<number>();

        selectedFiles.forEach((file) => {
            file.tags.forEach((tag) => {
                union.add(tag.id);
            });
        });

        return union;
    }, [selectedFiles]);

    /** 모달이 열릴 때마다 현재 파일 기준으로 선택 상태를 초기화한다. */
    useEffect(() => {
        if (!isOpen || selectedFiles.length === 0) return;

        setSelectedTagIds(new Set(initialSelectedTagIds));
        setIsDropdownOpen(false);
    }, [initialSelectedTagIds, isOpen, selectedFiles]);

    /** ESC 키로 드롭다운 또는 모달을 닫는다. */
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;

            if (isDropdownOpen) {
                setIsDropdownOpen(false);
                return;
            }

            onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDropdownOpen, isOpen, onClose]);

    /** 드롭다운 바깥을 클릭하면 태그 검색 UI를 닫는다. */
    const handleCloseDropdown = useCallback(() => {
        setIsDropdownOpen(false);
    }, []);
    useClickOutside(dropdownRef, handleCloseDropdown, isDropdownOpen);

    /** 태그 검색 드롭다운에서 선택/해제를 토글한다. */
    const handleToggleTag = (tagId: number | null) => {
        if (tagId === null) return;

        setSelectedTagIds((prev) => {
            const next = new Set(prev);
            if (next.has(tagId)) {
                next.delete(tagId);
            } else {
                next.add(tagId);
            }
            return next;
        });
    };

    /** 태그 칩의 X 버튼으로 태그를 제거한다. */
    const handleRemoveTag = (tagId: number) => {
        setSelectedTagIds((prev) => {
            const next = new Set(prev);
            next.delete(tagId);
            return next;
        });
    };

    /** 저장 시 선택된 파일 ID와 태그 ID를 함께 전달한다. */
    const handleSave = () => {
        onSave(
            selectedFiles.map((file) => file.id),
            Array.from(selectedTagIds).sort((a, b) => a - b),
        );
    };

    /** 선택된 태그 ID를 실제 태그 객체 목록으로 변환한다. */
    const selectedTags = useMemo(() => {
        return allTags.filter((tag) => selectedTagIds.has(tag.id));
    }, [allTags, selectedTagIds]);

    if (!isOpen || selectedFiles.length === 0) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="file-tag-editor"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="file-tag-editor__header">
                    <h3 className="file-tag-editor__title">
                        {isBulkEdit ? '태그 일괄 편집' : '태그 편집'}
                    </h3>
                    <button
                        className="file-tag-editor__close-btn"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        ✕
                    </button>
                </div>

                {/* 파일 정보 */}
                <div className="file-tag-editor__file-info">
                    {isBulkEdit ? (
                        <>
                            <div className="file-tag-editor__file-info-title">
                                선택된 파일 {selectedFiles.length}개
                            </div>
                            <ul className="file-tag-editor__file-list">
                                {selectedFiles.map((file) => (
                                    <li key={file.id} className="file-tag-editor__file-list-item">
                                        {file.filename}
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <>📄 {selectedFiles[0].filename}</>
                    )}
                </div>

                {/* 현재 선택된 태그 (칩 목록) */}
                <div className="file-tag-editor__section-label">현재 태그</div>
                <div className="file-tag-editor__chips">
                    {selectedTags.length === 0 ? (
                        <span className="file-tag-editor__no-tags">선택된 태그 없음</span>
                    ) : (
                        selectedTags.map((tag) => (
                            <TagBadge
                                key={tag.id}
                                name={tag.name}
                                color={tag.color}
                                onClose={() => handleRemoveTag(tag.id)}
                            />
                        ))
                    )}
                </div>

                {/* 태그 검색 + 드롭다운 공통 컴포넌트 사용 */}
                <div className="file-tag-editor__section-label">태그 선택</div>
                <div
                    className="file-tag-editor__search-wrapper"
                    ref={dropdownRef}
                >
                    {/* 레이아웃 유지용 입력창이며 클릭 시 실제 검색 드롭다운을 연다. */}
                    <input
                        className="file-tag-editor__search-input-placeholder"
                        type="text"
                        placeholder="🔍 태그 검색..."
                        onClick={() => setIsDropdownOpen(true)}
                        readOnly
                    />

                    {isDropdownOpen && (
                        <div className="file-tag-editor__dropdown-wrapper">
                            <TagSearchDropdown
                                tags={allTags}
                                selectedTagIds={selectedTagIds}
                                onSelectTag={handleToggleTag}
                                selectionMode="multiple"
                                searchPlaceholder="🔍 태그 검색..."
                                autoFocus={true}
                            />
                        </div>
                    )}
                </div>

                {/* 하단 버튼 */}
                <div className="file-tag-editor__footer">
                    <button
                        className="file-tag-editor__cancel-btn"
                        onClick={onClose}
                    >
                        취소
                    </button>
                    <button
                        className="file-tag-editor__save-btn"
                        onClick={handleSave}
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
}

