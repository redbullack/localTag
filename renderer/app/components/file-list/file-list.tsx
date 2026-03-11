'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import './file-list.css';
import type { FileWithTags, SortOption } from '../../types';
import TagBadge from '../tag-badge/tag-badge';
import { useToast } from '../shared/toast-provider';

interface FileListProps {
    files: FileWithTags[];
    selectedFileIds: Set<number>;
    currentPage: number;
    totalCount: number;
    sortOption: SortOption;
    onSortChange: (option: SortOption) => void;
    onPageChange: (page: number) => void;
    onToggleSelect: (fileId: number) => void;
    onToggleAllSelect: () => void;
    onAddFiles: () => void;
    onDropFiles?: (filePaths: string[]) => void;
    onRenameFile: (fileId: number, newFilename: string) => void;
    onDeleteFile: (fileId: number, skipConfirmation?: boolean) => void;
    onDeleteSelected: () => void;
    onMoveFile: (file: FileWithTags) => void;
    onCopyFile: (file: FileWithTags) => void;
    onMoveSelected: () => void;
    onCopySelected: () => void;
    onEditFileTags: (file: FileWithTags) => void;
    onEditSelectedTags: () => void;
    isSyncing?: boolean;
}

/** 파일 크기를 읽기 쉬운 문자열로 변환한다. */
const formatFileSize = (bytes: number | null): string => {
    if (bytes === null || bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

/** 확장자에 따라 파일 아이콘을 반환한다. */
const getFileIcon = (extension: string | null): string => {
    if (!extension) return '📄';

    const iconMap: Record<string, string> = {
        pdf: '📕',
        doc: '📘',
        docx: '📘',
        txt: '📝',
        xls: '📗',
        xlsx: '📗',
        csv: '📗',
        ppt: '📙',
        pptx: '📙',
        jpg: '🖼️',
        jpeg: '🖼️',
        png: '🖼️',
        gif: '🖼️',
        svg: '🖼️',
        webp: '🖼️',
        mp3: '🎵',
        wav: '🎵',
        flac: '🎵',
        mp4: '🎬',
        avi: '🎬',
        mkv: '🎬',
        mov: '🎬',
        zip: '📦',
        rar: '📦',
        '7z': '📦',
        js: '💛',
        ts: '💙',
        py: '🐍',
        java: '☕',
        html: '🌐',
        css: '🎨',
        json: '📋',
    };

    return iconMap[extension.toLowerCase()] || '📄';
};

/** 개별 파일 행 컴포넌트 */
function FileRow({
    file,
    isSelected,
    onToggleSelect,
    onRenameFile,
    onDeleteFile,
    onMoveFile,
    onCopyFile,
    onEditFileTags,
}: {
    file: FileWithTags;
    isSelected: boolean;
    onToggleSelect: (fileId: number) => void;
    onRenameFile: (fileId: number, newFilename: string) => void;
    onDeleteFile: (fileId: number, skipConfirmation?: boolean) => void;
    onMoveFile: (file: FileWithTags) => void;
    onCopyFile: (file: FileWithTags) => void;
    onEditFileTags: (file: FileWithTags) => void;
}) {
    const { showToast } = useToast();
    const [isHovered, setIsHovered] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(file.filename);

    /** 인라인 이름 편집을 확정하거나 취소한다. */
    const handleRenameSubmit = () => {
        const trimmedName = renameValue.trim();
        if (!trimmedName || trimmedName === file.filename) {
            setIsRenaming(false);
            setRenameValue(file.filename);
            return;
        }

        onRenameFile(file.id, trimmedName);
        setIsRenaming(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        }

        if (e.key === 'Escape') {
            setIsRenaming(false);
            setRenameValue(file.filename);
        }
    };

    const handleOpenFile = async () => {
        try {
            const result = await window.electronAPI.openFile({ filename: file.filename });
            if (!result.success) {
                showToast({ type: 'error', message: `파일 열기 실패: ${result.error}`, duration: 4000 });
            }
        } catch (error) {
            console.error('Failed to open file:', error);
            showToast({ type: 'error', message: '파일 열기에 실패했습니다.', duration: 4000 });
        }
    };

    return (
        <div
            className={`file-row ${isSelected ? 'file-row--selected' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onDoubleClick={handleOpenFile}
        >
            <div className="file-row__checkbox-cell">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(file.id)}
                    className="file-list__checkbox"
                />
            </div>

            {/* 파일 아이콘 + 이름 */}
            <div className="file-row__name-cell">
                <span className="file-row__icon">{getFileIcon(file.extension)}</span>
                {isRenaming ? (
                    <input
                        className="file-row__rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={handleRenameKeyDown}
                        autoFocus
                    />
                ) : (
                    <span className="file-row__filename">{file.filename}</span>
                )}
            </div>

            {/* 태그 뱃지 */}
            <div className="file-row__tags-cell">
                {file.tags.length > 0 ? (
                    file.tags.map((tag) => (
                        <TagBadge
                            key={tag.id}
                            name={tag.name}
                            color={tag.color}
                        />
                    ))
                ) : (
                    <span className="file-row__no-tags">태그 없음</span>
                )}
            </div>

            {/* 파일 크기 */}
            <div className="file-row__size-cell">
                {formatFileSize(file.size)}
            </div>

            {/* 액션 버튼 */}
            <div className={`file-row__actions-cell ${isHovered ? 'file-row__actions-cell--visible' : ''}`}>
                <button className="file-row__action-btn" onClick={handleOpenFile} title="열기">
                    📂
                </button>
                <button className="file-row__action-btn" onClick={() => onEditFileTags(file)} title="태그 수정">
                    🏷️
                </button>
                <button
                    className="file-row__action-btn"
                    onClick={() => {
                        setIsRenaming(true);
                        setRenameValue(file.filename);
                    }}
                    title="이름 변경"
                >
                    ✎
                </button>
                <button className="file-row__action-btn" onClick={() => onMoveFile(file)} title="이동">
                    📤
                </button>
                <button className="file-row__action-btn" onClick={() => onCopyFile(file)} title="복사">
                    📋
                </button>
                <button
                    className="file-row__action-btn file-row__action-btn--danger"
                    onClick={() => onDeleteFile(file.id)}
                    title="삭제"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
}

export default function FileList({
    files,
    selectedFileIds,
    currentPage,
    totalCount,
    sortOption,
    onSortChange,
    onPageChange,
    onToggleSelect,
    onToggleAllSelect,
    onAddFiles,
    onDropFiles,
    onRenameFile,
    onDeleteFile,
    onDeleteSelected,
    onMoveFile,
    onCopyFile,
    onMoveSelected,
    onCopySelected,
    onEditFileTags,
    onEditSelectedTags,
    isSyncing = false,
}: FileListProps) {
    const { showToast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [colWidths, setColWidths] = useState({ tags: 200, size: 80 });
    const [resizingCol, setResizingCol] = useState<'name' | 'tags' | null>(null);

    const isResizingRef = useRef<{
        column: 'name' | 'tags';
        startX: number;
        startWidths: { tags: number; size: number; name: number };
    } | null>(null);

    /** 마우스 이동량을 기준으로 컬럼 너비를 동적으로 계산한다. */
    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizingRef.current) return;

        const { column, startX, startWidths } = isResizingRef.current;
        const deltaX = e.clientX - startX;

        setColWidths((prev) => {
            if (column === 'name') {
                let newTagsWidth = startWidths.tags - deltaX;
                if (newTagsWidth < 80) newTagsWidth = 80;

                const maxTagsWidth = startWidths.tags + (startWidths.name - 150);
                if (newTagsWidth > maxTagsWidth) newTagsWidth = maxTagsWidth;

                return { ...prev, tags: newTagsWidth };
            }

            let newTagsWidth = startWidths.tags + deltaX;
            let newSizeWidth = startWidths.size - deltaX;

            if (newTagsWidth < 80) {
                const diff = 80 - newTagsWidth;
                newTagsWidth = 80;
                newSizeWidth -= diff;
            }

            if (newSizeWidth < 60) {
                const diff = 60 - newSizeWidth;
                newSizeWidth = 60;
                newTagsWidth -= diff;
            }

            return { ...prev, tags: newTagsWidth, size: newSizeWidth };
        });
    }, []);

    const handleResizeEnd = useCallback(() => {
        isResizingRef.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setResizingCol(null);
    }, [handleResizeMove]);

    /** 컬럼 리사이즈 시작 시 기준 너비를 저장한다. */
    const handleResizeStart = (column: 'name' | 'tags', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const thElement = e.currentTarget.parentElement;
        const tableHeader = thElement?.parentElement;
        const nameTh = tableHeader?.children[1] as HTMLElement;
        const startNameWidth = nameTh?.getBoundingClientRect().width || 150;

        isResizingRef.current = {
            column,
            startX: e.clientX,
            startWidths: { tags: colWidths.tags, size: colWidths.size, name: startNameWidth },
        };

        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        setResizingCol(column);
    };

    /** 컴포넌트 종료 시 리사이즈 이벤트를 정리한다. */
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [handleResizeMove, handleResizeEnd]);

    /** 더블 클릭 시 내용 길이에 맞게 컬럼을 자동 조정한다. */
    const handleResizeDoubleClick = (column: 'name' | 'tags', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (column === 'name') {
            let maxWidth = 150;
            document.querySelectorAll('.file-row__filename').forEach((el) => {
                maxWidth = Math.max(maxWidth, el.scrollWidth + 60);
            });

            const currentWidth = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect().width || 150;
            setColWidths((prev) => ({
                ...prev,
                tags: Math.max(80, prev.tags - (maxWidth - currentWidth)),
            }));
            return;
        }

        let maxWidth = 80;
        document.querySelectorAll('.file-row__tags-cell').forEach((el) => {
            const badgeWidths = Array.from(el.querySelectorAll('.tag-badge')).reduce(
                (sum, badge) => sum + badge.scrollWidth + 4,
                0,
            );
            maxWidth = Math.max(maxWidth, badgeWidths + 32);
        });

        setColWidths((prev) => {
            let newTagsWidth = maxWidth;
            const tableEl = document.querySelector('.file-list__table');

            if (tableEl) {
                const tableWidth = tableEl.clientWidth;
                // 고정 폭을 제외한 남는 너비 안에서만 태그 컬럼을 늘린다.
                const maxAllowed = tableWidth - prev.size - 336;
                if (newTagsWidth > maxAllowed) {
                    newTagsWidth = Math.max(80, maxAllowed);
                }
            }

            return { ...prev, tags: newTagsWidth };
        });
    };

    /** 파일 드래그 중 오버레이 표시 상태를 관리한다. */
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    };

    /** 드롭된 항목이 폴더가 아닌 파일인지 검증한 뒤 상위로 전달한다. */
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const items = e.dataTransfer.items;
        if (!items) return;

        for (let i = 0; i < items.length; i += 1) {
            const item = items[i];
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
                if (entry && entry.isDirectory) {
                    showToast({ type: 'warning', message: '폴더는 업로드할 수 없습니다. 파일만 드래그 앤 드롭해주세요.', duration: 4000 });
                    return;
                }
            }
        }

        const filePaths: string[] = [];
        for (let i = 0; i < e.dataTransfer.files.length; i += 1) {
            const file = e.dataTransfer.files[i];
            const path = window.electronAPI.getPathForFile(file);
            if (path && typeof path === 'string') {
                filePaths.push(path);
            }
        }

        if (filePaths.length === 0) {
            showToast({ type: 'error', message: '유효한 파일 경로를 찾을 수 없습니다.', duration: 4000 });
            return;
        }

        onDropFiles?.(filePaths);
    };

    // ==== 페이징 로직 ====
    const limit = 50;
    const totalPages = Math.ceil(totalCount / limit);
    const pageGroupSize = 5;
    const currentGroup = Math.ceil(currentPage / pageGroupSize);
    const startPage = (currentGroup - 1) * pageGroupSize + 1;
    const endPage = Math.min(startPage + pageGroupSize - 1, totalPages);
    const pages = Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, index) => startPage + index);

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="file-list__pagination">
                <button
                    className="file-list__page-btn file-list__page-btn--icon"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    title="처음 페이지"
                >
                    «
                </button>
                <button
                    className="file-list__page-btn file-list__page-btn--icon"
                    onClick={() => onPageChange(Math.max(1, startPage - pageGroupSize))}
                    disabled={currentGroup === 1}
                    title="이전 5페이지"
                >
                    ‹
                </button>

                <div className="file-list__page-numbers">
                    {pages.map((page) => (
                        <button
                            key={page}
                            className={`file-list__page-btn ${page === currentPage ? 'file-list__page-btn--active' : ''}`}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                <button
                    className="file-list__page-btn file-list__page-btn--icon"
                    onClick={() => onPageChange(Math.min(totalPages, startPage + pageGroupSize))}
                    disabled={currentGroup === Math.ceil(totalPages / pageGroupSize)}
                    title="다음 5페이지"
                >
                    ›
                </button>
                <button
                    className="file-list__page-btn file-list__page-btn--icon"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    title="마지막 페이지"
                >
                    »
                </button>
            </div>
        );
    };

    return (
        <div
            className={`file-list ${isDragging ? 'file-list--dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* 헤더 */}
            <div className="file-list__header">
                <div className="file-list__header-left">
                    <h3 className="file-list__title">
                        파일 목록
                        <span className="file-list__count">{files.length}</span>
                    </h3>
                </div>
                <div className="file-list__header-right">
                    <div className="file-list__sort-wrapper">
                        <select
                            className="file-list__sort-select"
                            value={`${sortOption.column}-${sortOption.order}`}
                            onChange={(e) => {
                                const [column, order] = e.target.value.split('-') as [SortOption['column'], SortOption['order']];
                                onSortChange({ column, order });
                            }}
                        >
                            <option value="filename-asc">파일명 (A-Z)</option>
                            <option value="filename-desc">파일명 (Z-A)</option>
                            <option value="updatedAt-desc">수정일 (최신순)</option>
                            <option value="updatedAt-asc">수정일 (오래된순)</option>
                            <option value="createdAt-desc">생성일 (최신순)</option>
                            <option value="createdAt-asc">생성일 (오래된순)</option>
                            <option value="extension-asc">확장자 (A-Z)</option>
                            <option value="extension-desc">확장자 (Z-A)</option>
                            <option value="size-desc">크기 (큰순)</option>
                            <option value="size-asc">크기 (작은순)</option>
                        </select>
                    </div>

                    {/* 다중 선택 시 태그 편집/삭제 액션을 노출한다. */}
                    {selectedFileIds.size > 0 && (
                        <>
                            <button className="file-list__bulk-edit-btn" onClick={onEditSelectedTags} disabled={isSyncing}>
                                태그 편집 ({selectedFileIds.size})
                            </button>
                            <button className="file-list__move-selected-btn" onClick={onMoveSelected} disabled={isSyncing}>
                                선택 이동 ({selectedFileIds.size})
                            </button>
                            <button className="file-list__copy-selected-btn" onClick={onCopySelected} disabled={isSyncing}>
                                선택 복사 ({selectedFileIds.size})
                            </button>
                            <button className="file-list__delete-selected-btn" onClick={onDeleteSelected} disabled={isSyncing}>
                                선택 삭제 ({selectedFileIds.size})
                            </button>
                        </>
                    )}

                    <button className="button button--primary file-list__add-button" onClick={onAddFiles} disabled={isSyncing}>
                        파일 추가
                    </button>

                    {isDragging && (
                        <div className="file-list__drag-overlay">
                            <span className="file-list__drag-icon">📁</span>
                            <span className="file-list__drag-text">이곳에 파일을 놓으세요</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 파일 목록 */}
            {files.length === 0 ? (
                <div className="file-list__empty">
                    <p className="file-list__empty-text">아직 파일이 없습니다.</p>
                    <button className="file-list__empty-btn" onClick={onAddFiles}>
                        + 첫 파일 추가하기
                    </button>
                </div>
            ) : (
                <div
                    className={`file-list__table ${resizingCol ? 'file-list__table--resizing' : ''}`}
                    style={{
                        '--col-tags': `${colWidths.tags}px`,
                        '--col-size': `${colWidths.size}px`,
                    } as React.CSSProperties}
                >
                    {/* 테이블 헤더 */}
                    <div className="file-list__table-header">
                        <div className="file-list__th file-list__th--checkbox">
                            <input
                                type="checkbox"
                                checked={files.length > 0 && selectedFileIds.size === files.length}
                                onChange={onToggleAllSelect}
                                className="file-list__checkbox"
                            />
                        </div>
                        <div className="file-list__th file-list__th--name">
                            파일명
                            <div
                                className={`file-list__resizer ${resizingCol === 'name' ? 'is-resizing' : ''}`}
                                onMouseDown={(e) => handleResizeStart('name', e)}
                                onDoubleClick={(e) => handleResizeDoubleClick('name', e)}
                            />
                        </div>
                        <div className="file-list__th file-list__th--tags">
                            태그
                            <div
                                className={`file-list__resizer ${resizingCol === 'tags' ? 'is-resizing' : ''}`}
                                onMouseDown={(e) => handleResizeStart('tags', e)}
                                onDoubleClick={(e) => handleResizeDoubleClick('tags', e)}
                            />
                        </div>
                        <div className="file-list__th file-list__th--size">크기</div>
                        <div className="file-list__th file-list__th--actions" />
                    </div>

                    {/* 파일 행 */}
                    <div className="file-list__body">
                        {files.map((file) => (
                            <FileRow
                                key={file.id}
                                file={file}
                                isSelected={selectedFileIds.has(file.id)}
                                onToggleSelect={onToggleSelect}
                                onRenameFile={onRenameFile}
                                onDeleteFile={onDeleteFile}
                                onMoveFile={onMoveFile}
                                onCopyFile={onCopyFile}
                                onEditFileTags={onEditFileTags}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Pagination UI */}
            {renderPagination()}
        </div>
    );
}

