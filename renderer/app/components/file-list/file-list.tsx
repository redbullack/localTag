'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import './file-list.css';
import type { FileWithTags, SortOption } from '../../types';
import TagBadge from '../shared/tag-badge';
import ContextMenu, { type ContextMenuItem } from '../shared/context-menu';
import { useToast } from '../shared/toast-provider';
import Pagination from '../shared/pagination';
import { formatBytes } from '../../utils/format-bytes';
import { getFileIcon } from '../../utils/get-file-icon';

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
    searchKeyword: string;
    onSearchChange: (keyword: string) => void;
}


/** 개별 파일 행 컴포넌트 */
function FileRow({
    file,
    isSelected,
    isRenaming,
    onToggleSelect,
    onRenameFile,
    onRenameCancel,
    onContextMenu,
    onOpenFile,
}: {
    file: FileWithTags;
    isSelected: boolean;
    isRenaming: boolean;
    onToggleSelect: (fileId: number) => void;
    onRenameFile: (fileId: number, newFilename: string) => void;
    onRenameCancel: () => void;
    onContextMenu: (e: React.MouseEvent, file: FileWithTags) => void;
    onOpenFile: (file: FileWithTags) => void;
}) {
    const [renameValue, setRenameValue] = useState(file.filename);

    /** isRenaming이 true로 바뀌면 현재 파일명으로 초기화한다. */
    useEffect(() => {
        if (isRenaming) setRenameValue(file.filename);
    }, [isRenaming, file.filename]);

    /** 인라인 이름 편집을 확정하거나 취소한다. */
    const handleRenameSubmit = () => {
        const trimmedName = renameValue.trim();
        if (!trimmedName || trimmedName === file.filename) {
            onRenameCancel();
            return;
        }

        onRenameFile(file.id, trimmedName);
        onRenameCancel();
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        }

        if (e.key === 'Escape') {
            onRenameCancel();
        }
    };

    return (
        <div
            className={`file-row ${isSelected ? 'file-row--selected' : ''}`}
            onDoubleClick={() => onOpenFile(file)}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(e, file);
            }}
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
                {formatBytes(file.size ?? 0)}
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
    searchKeyword,
    onSearchChange,
}: FileListProps) {
    const { showToast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [colWidths, setColWidths] = useState({ name: 300, tags: 200, size: 100 });
    const [resizingCol, setResizingCol] = useState<'name' | 'tags' | 'size' | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    // ── 우클릭 컨텍스트 메뉴 ──
    const [contextMenu, setContextMenu] = useState<{
        position: { x: number; y: number };
        file: FileWithTags;
    } | null>(null);

    // ── 인라인 이름 변경 (FileRow에서 분리) ──
    const [renamingFileId, setRenamingFileId] = useState<number | null>(null);

    const isResizingRef = useRef<{
        column: 'name' | 'tags' | 'size';
        startX: number;
        startWidths: { name: number; tags: number; size: number };
    } | null>(null);

    /** 마운트 시 컨테이너 너비에 맞춰 name 초기 너비를 산출한다. */
    useEffect(() => {
        if (tableRef.current) {
            const containerWidth = tableRef.current.clientWidth;
            // checkbox(32) + gap(8*3) + padding(32)
            const fixedWidth = 32 + 24 + 32;
            const nameWidth = Math.max(200, containerWidth - fixedWidth - 200 - 100);
            setColWidths({ name: nameWidth, tags: 200, size: 100 });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const COL_MIN_WIDTHS = { name: 150, tags: 80, size: 60 };

    /** 마우스 이동량을 기준으로 드래그 중인 컬럼의 너비만 변경한다. */
    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizingRef.current) return;

        const { column, startX, startWidths } = isResizingRef.current;
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(COL_MIN_WIDTHS[column], startWidths[column] + deltaX);

        setColWidths((prev) => ({ ...prev, [column]: newWidth }));
    }, []);

    const handleResizeEnd = useCallback(() => {
        isResizingRef.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setResizingCol(null);
    }, [handleResizeMove]);

    /** 컬럼 리사이즈 시작 시 현재 너비를 저장한다. */
    const handleResizeStart = (column: 'name' | 'tags' | 'size', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        isResizingRef.current = {
            column,
            startX: e.clientX,
            startWidths: { ...colWidths },
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

    /** 더블 클릭 시 해당 컬럼 콘텐츠에 맞게 자동 피팅한다. */
    const handleResizeDoubleClick = (column: 'name' | 'tags' | 'size', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (column === 'name') {
            let maxWidth = COL_MIN_WIDTHS.name;
            document.querySelectorAll('.file-row__filename').forEach((el) => {
                maxWidth = Math.max(maxWidth, el.scrollWidth + 60);
            });
            setColWidths((prev) => ({ ...prev, name: maxWidth }));
            return;
        }

        if (column === 'tags') {
            const TAG_COL_MAX_WIDTH = tableRef.current
                ? Math.round(tableRef.current.clientWidth * 0.4)
                : 400;
            let maxWidth = COL_MIN_WIDTHS.tags;
            document.querySelectorAll('.file-row__tags-cell').forEach((el) => {
                const badgeWidths = Array.from(el.querySelectorAll('.tag-badge')).reduce(
                    (sum, badge) => sum + badge.scrollWidth + 4,
                    0,
                );
                maxWidth = Math.max(maxWidth, badgeWidths + 16);
            });
            maxWidth = Math.min(maxWidth, TAG_COL_MAX_WIDTH);
            setColWidths((prev) => ({ ...prev, tags: maxWidth }));
            return;
        }

        if (column === 'size') {
            let maxWidth = COL_MIN_WIDTHS.size;
            const range = document.createRange();
            document.querySelectorAll('.file-row__size-cell').forEach((el) => {
                range.selectNodeContents(el);
                const textWidth = range.getBoundingClientRect().width;
                maxWidth = Math.max(maxWidth, Math.ceil(textWidth) + 16);
            });
            setColWidths((prev) => ({ ...prev, size: maxWidth }));
        }
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

    // ── 파일 열기 / 탐색기 핸들러 ──

    const handleOpenFile = async (file: FileWithTags) => {
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

    const handleShowInExplorer = async (file: FileWithTags) => {
        try {
            const result = await window.electronAPI.showFileInExplorer({ filename: file.filename });
            if (!result.success) {
                showToast({ type: 'error', message: `탐색기 열기 실패: ${result.error}`, duration: 4000 });
            }
        } catch (error) {
            console.error('Failed to show file in explorer:', error);
            showToast({ type: 'error', message: '파일 탐색기를 여는 데 실패했습니다.', duration: 4000 });
        }
    };

    // ── 우클릭 컨텍스트 메뉴 ──

    const handleFileContextMenu = (e: React.MouseEvent, file: FileWithTags) => {
        setContextMenu({ position: { x: e.clientX, y: e.clientY }, file });
    };

    const buildFileContextMenuItems = (): ContextMenuItem[] => {
        if (!contextMenu) return [];
        const { file } = contextMenu;

        return [
            {
                label: '열기',
                icon: <span>📂</span>,
                onClick: () => handleOpenFile(file),
            },
            {
                label: '파일 탐색기에서 보기',
                icon: <span>🗂️</span>,
                onClick: () => handleShowInExplorer(file),
            },
            {
                label: '태그 수정',
                icon: <span>🏷️</span>,
                onClick: () => onEditFileTags(file),
            },
            {
                label: '이름 변경',
                icon: <span>✎</span>,
                onClick: () => setRenamingFileId(file.id),
            },
            {
                label: '이동',
                icon: <span>📤</span>,
                onClick: () => onMoveFile(file),
            },
            {
                label: '복사',
                icon: <span>📋</span>,
                onClick: () => onCopyFile(file),
            },
            {
                label: '삭제',
                icon: <span>🗑️</span>,
                onClick: () => onDeleteFile(file.id),
                danger: true,
            },
        ];
    };

    // ==== 페이징 로직 ====
    const limit = 50;

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
                <div className="file-list__header-center">
                    <input
                        type="search"
                        className="file-list__search-input"
                        value={searchKeyword}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="파일명 검색..."
                        disabled={isSyncing}
                    />
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
                    <p className="file-list__empty-text">
                        {searchKeyword ? '검색 결과가 없습니다.' : '아직 파일이 없습니다.'}
                    </p>
                    {!searchKeyword && (
                        <button className="file-list__empty-btn" onClick={onAddFiles}>
                            + 첫 파일 추가하기
                        </button>
                    )}
                </div>
            ) : (
                <div
                    ref={tableRef}
                    className={`file-list__table ${resizingCol ? 'file-list__table--resizing' : ''}`}
                    style={{
                        '--col-name': `${colWidths.name}px`,
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
                        <div className="file-list__th file-list__th--size">
                            크기
                            <div
                                className={`file-list__resizer ${resizingCol === 'size' ? 'is-resizing' : ''}`}
                                onMouseDown={(e) => handleResizeStart('size', e)}
                                onDoubleClick={(e) => handleResizeDoubleClick('size', e)}
                            />
                        </div>
                    </div>

                    {/* 파일 행 */}
                    <div className="file-list__body">
                        {files.map((file) => (
                            <FileRow
                                key={file.id}
                                file={file}
                                isSelected={selectedFileIds.has(file.id)}
                                isRenaming={renamingFileId === file.id}
                                onToggleSelect={onToggleSelect}
                                onRenameFile={onRenameFile}
                                onRenameCancel={() => setRenamingFileId(null)}
                                onContextMenu={handleFileContextMenu}
                                onOpenFile={handleOpenFile}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 우클릭 컨텍스트 메뉴 */}
            {contextMenu && (
                <ContextMenu
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    items={buildFileContextMenuItems()}
                />
            )}

            {/* Pagination UI */}
            <Pagination
                currentPage={currentPage}
                totalCount={totalCount}
                limit={limit}
                onPageChange={onPageChange}
                className="file-list__pagination"
            />
        </div>
    );
}

