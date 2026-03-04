'use client';

import { useState } from 'react';
import './file-list.css';
import type { FileWithTags, Tag } from '../../types';

interface FileListProps {
    files: FileWithTags[];
    currentPage: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onAddFiles: () => void;
    onRenameFile: (fileId: number, newFilename: string) => void;
    onDeleteFile: (fileId: number) => void;
    onEditFileTags: (file: FileWithTags) => void;
}

/** 파일 크기를 읽기 쉬운 문자열로 변환 */
const formatFileSize = (bytes: number | null): string => {
    if (bytes === null || bytes === 0) return '—';

    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

/** 확장자에 따른 아이콘 이모지 반환 */
const getFileIcon = (extension: string | null): string => {
    if (!extension) return '📄';

    const iconMap: Record<string, string> = {
        pdf: '📕', doc: '📘', docx: '📘', txt: '📝',
        xls: '📗', xlsx: '📗', csv: '📗',
        ppt: '📙', pptx: '📙',
        jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
        mp3: '🎵', wav: '🎵', flac: '🎵',
        mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬',
        zip: '📦', rar: '📦', '7z': '📦',
        js: '💛', ts: '💙', py: '🐍', java: '☕',
        html: '🌐', css: '🎨', json: '📋',
    };

    return iconMap[extension.toLowerCase()] || '📄';
};

/** 개별 파일 행 컴포넌트 */
function FileRow({
    file,
    onRenameFile,
    onDeleteFile,
    onEditFileTags,
}: {
    file: FileWithTags;
    onRenameFile: (fileId: number, newFilename: string) => void;
    onDeleteFile: (fileId: number) => void;
    onEditFileTags: (file: FileWithTags) => void;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(file.filename);

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

    return (
        <div
            className="file-row"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
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
                        <span
                            key={tag.id}
                            className="tag-badge"
                            style={{ '--tag-color': tag.color || '#5865f2' } as React.CSSProperties}
                        >
                            <span className="tag-badge__dot" />
                            <span className="tag-badge__name">{tag.name}</span>
                        </span>
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
                <button
                    className="file-row__action-btn"
                    onClick={() => onEditFileTags(file)}
                    title="태그 수정"
                >
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
    currentPage,
    totalCount,
    onPageChange,
    onAddFiles,
    onRenameFile,
    onDeleteFile,
    onEditFileTags,
}: FileListProps) {
    // ==== 페이징 로직 ====
    const limit = 50;
    const totalPages = Math.ceil(totalCount / limit);
    const pageGroupSize = 5;
    const currentGroup = Math.ceil(currentPage / pageGroupSize);
    const startPage = (currentGroup - 1) * pageGroupSize + 1;
    const endPage = Math.min(startPage + pageGroupSize - 1, totalPages);

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

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
                    {pages.map((p) => (
                        <button
                            key={p}
                            className={`file-list__page-btn ${p === currentPage ? 'file-list__page-btn--active' : ''}`}
                            onClick={() => onPageChange(p)}
                        >
                            {p}
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
        <div className="file-list">
            {/* 헤더 */}
            <div className="file-list__header">
                <h3 className="file-list__title">
                    파일 목록
                    <span className="file-list__count">{files.length}</span>
                </h3>
                <button
                    className="file-list__add-btn"
                    onClick={onAddFiles}
                >
                    + 파일 추가
                </button>
            </div>

            {/* 파일 목록 */}
            {files.length === 0 ? (
                <div className="file-list__empty">
                    <p className="file-list__empty-text">아직 파일이 없습니다.</p>
                    <button
                        className="file-list__empty-btn"
                        onClick={onAddFiles}
                    >
                        + 첫 파일 추가하기
                    </button>
                </div>
            ) : (
                <div className="file-list__table">
                    {/* 테이블 헤더 */}
                    <div className="file-list__table-header">
                        <div className="file-list__th file-list__th--name">파일명</div>
                        <div className="file-list__th file-list__th--tags">태그</div>
                        <div className="file-list__th file-list__th--size">크기</div>
                        <div className="file-list__th file-list__th--actions" />
                    </div>

                    {/* 파일 행 */}
                    <div className="file-list__body">
                        {files.map((file) => (
                            <FileRow
                                key={file.id}
                                file={file}
                                onRenameFile={onRenameFile}
                                onDeleteFile={onDeleteFile}
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
