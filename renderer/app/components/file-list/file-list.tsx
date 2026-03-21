'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import './file-list.css';
import type { FileWithTags, SortOption } from '../../types';
import TagBadge from '../shared/tag-badge';
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

    const handleShowInExplorer = async () => {
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
                {formatBytes(file.size ?? 0)}
            </div>

            {/* 액션 버튼 */}
            <div className={`file-row__actions-cell ${isHovered ? 'file-row__actions-cell--visible' : ''}`}>
                <button className="file-row__action-btn" onClick={handleOpenFile} title="열기">
                    📂
                </button>
                <button className="file-row__action-btn" onClick={handleShowInExplorer} title="파일 탐색기에서 보기">
                    🗂️
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
    searchKeyword,
    onSearchChange,
}: FileListProps) {
    const { showToast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [colWidths, setColWidths] = useState({ name: 300, tags: 200, size: 80 });
    const [resizingCol, setResizingCol] = useState<'name' | 'tags' | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);

    /** 첫 렌더 시 name 컬럼을 테이블 잔여 공간에 맞춘다. */
    useEffect(() => {
        if (initializedRef.current || !tableRef.current) return;
        initializedRef.current = true;
        const tableWidth = tableRef.current.clientWidth;
        // 체크박스(32) + tags(200) + size(80) + 액션(160) + 좌우패딩(32)
        const fixedWidth = 32 + 200 + 80 + 160 + 32;
        const availableName = tableWidth - fixedWidth;
        if (availableName > 150) {
            setColWidths((prev) => ({ ...prev, name: availableName }));
        }
    }, [files.length]);

    const isResizingRef = useRef<{
        column: 'name' | 'tags';
        startX: number;
        startWidths: { name: number; tags: number; size: number };
    } | null>(null);

    /** 마우스 이동량을 기준으로 컬럼 너비를 동적으로 계산한다.
     *  Windows 탐색기 방식: 구분선 좌측 컬럼만 변경, 우측 컬럼은 절대 변하지 않는다. */
    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizingRef.current) return;

        const { column, startX, startWidths } = isResizingRef.current;
        const deltaX = e.clientX - startX;

        setColWidths(() => {
            if (column === 'name') {
                // name|tags 구분선: name 너비만 변경, tags/size는 불변
                const newNameWidth = Math.max(150, startWidths.name + deltaX);
                return { name: newNameWidth, tags: startWidths.tags, size: startWidths.size };
            }

            // tags|size 구분선: tags 너비만 변경, name/size는 불변
            const newTagsWidth = Math.max(80, startWidths.tags + deltaX);
            return { name: startWidths.name, tags: newTagsWidth, size: startWidths.size };
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

        isResizingRef.current = {
            column,
            startX: e.clientX,
            startWidths: { name: colWidths.name, tags: colWidths.tags, size: colWidths.size },
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

    /** 더블 클릭 시 구분선 좌측 컬럼의 가장 긴 내용에 맞게 자동 조정한다.
     *  Windows 탐색기 방식: 해당 구분선 좌측 컬럼만 변경, 다른 컬럼은 영향 없음. */
    const handleResizeDoubleClick = (column: 'name' | 'tags', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (column === 'name') {
            // name|tags 구분선 더블클릭: name 너비만 내용에 맞게 조정
            // ellipsis 상태에서 scrollWidth가 부정확하므로 숨겨진 임시 요소로 측정
            let maxContentWidth = 150;
            const measure = document.createElement('span');
            measure.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:14px;';
            document.body.appendChild(measure);

            const filenameEls = document.querySelectorAll('.file-row__filename') as NodeListOf<HTMLElement>;
            filenameEls.forEach((el) => {
                const computed = getComputedStyle(el);
                measure.style.fontFamily = computed.fontFamily;
                measure.style.fontWeight = computed.fontWeight;
                measure.style.letterSpacing = computed.letterSpacing;
                measure.textContent = el.textContent;
                // 아이콘(20) + gap(8) + 텍스트 + 셀 패딩(16)
                const contentWidth = 20 + 8 + measure.offsetWidth + 16;
                maxContentWidth = Math.max(maxContentWidth, contentWidth);
            });

            document.body.removeChild(measure);

            setColWidths((prev) => ({
                ...prev,
                name: Math.max(150, maxContentWidth),
            }));
            return;
        }

        // tags|size 구분선 더블클릭: tags 너비만 내용에 맞게 조정
        // overflow: hidden 상태이므로 임시 해제 후 측정
        let maxContentWidth = 80;
        const tagsCells = document.querySelectorAll('.file-row__tags-cell') as NodeListOf<HTMLElement>;
        tagsCells.forEach((el) => {
            const prevOverflow = el.style.overflow;
            const prevFlexWrap = el.style.flexWrap;
            el.style.overflow = 'visible';
            el.style.flexWrap = 'nowrap';
            const contentWidth = el.scrollWidth + 16;
            maxContentWidth = Math.max(maxContentWidth, contentWidth);
            el.style.overflow = prevOverflow;
            el.style.flexWrap = prevFlexWrap;
        });

        setColWidths((prev) => ({
            ...prev,
            tags: Math.max(80, maxContentWidth),
        }));
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

