'use client';

import { useState } from 'react';
import './tag-sidebar.css';
import type { Tag, TagTreeNode } from '../../types';
import TagSearchDropdown from '../shared/tag-search-dropdown';
import { buildTagTree } from '../../utils/tag-tree';

/**
 * TagSidebar - 좌측 사이드바에 태그 목록을 트리 형태로 표시하는 컴포넌트
 *
 * @param tags - 전체 태그 목록 (flat list)
 * @param onCreateTag - 새 태그 만들기 버튼 클릭 콜백
 * @param onEditTag - 태그 수정 버튼 클릭 콜백
 * @param onDeleteTag - 태그 삭제 버튼 클릭 콜백
 */

interface TagSidebarProps {
    tags: Tag[];
    selectedTagIds: number[];
    overallFileCount: number;
    onCreateTag: () => void;
    onEditTag: (tag: Tag) => void;
    onDeleteTag: (tagId: number) => void;
    onCreateChildTag: (parentTag: Tag) => void;
    onSelectTag: (tagId: number) => void;
}

/** 개별 태그 트리 노드를 재귀적으로 렌더링합니다. */
function TagTreeItem({
    node,
    depth,
    selectedTagIds,
    onEditTag,
    onDeleteTag,
    onCreateChildTag,
    onSelectTag,
}: {
    node: TagTreeNode;
    depth: number;
    selectedTagIds: number[];
    onEditTag: (tag: Tag) => void;
    onDeleteTag: (tagId: number) => void;
    onCreateChildTag: (parentTag: Tag) => void;
    onSelectTag: (tagId: number) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const hasChildren = node.children.length > 0;

    const isActive = selectedTagIds.includes(node.id);

    return (
        <div className="tag-tree-item">
            <div
                className={`tag-tree-item__row ${isActive ? 'tag-tree-item__row--active' : ''}`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={() => onSelectTag(node.id)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* 확장/축소 토글 */}
                <button
                    className={`tag-tree-item__toggle ${!hasChildren ? 'tag-tree-item__toggle--hidden' : ''}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-label={isExpanded ? '접기' : '펼치기'}
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className={`tag-tree-item__arrow ${isExpanded ? 'tag-tree-item__arrow--expanded' : ''}`}
                    >
                        <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>

                {/* 색상 도트 */}
                <span
                    className="tag-tree-item__dot"
                    style={{ backgroundColor: node.color || '#5865f2' }}
                />

                {/* 태그 이름 및 파일 개수 */}
                <span className="tag-tree-item__name">
                    {node.name}
                    <span className="tag-tree-item__count">({node.fileCount || 0})</span>
                </span>

                {/* 액션 버튼 (hover 시 표시) */}
                {isHovered && (
                    <div className="tag-tree-item__actions">
                        <button
                            className="tag-tree-item__action-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateChildTag(node);
                            }}
                            aria-label={`${node.name} 하위 태그 생성`}
                            title="하위 태그 생성"
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                        <button
                            className="tag-tree-item__action-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditTag(node);
                            }}
                            aria-label={`${node.name} 수정`}
                            title="수정"
                        >
                            ✎
                        </button>
                        <button
                            className="tag-tree-item__action-btn tag-tree-item__action-btn--danger"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTag(node.id);
                            }}
                            aria-label={`${node.name} 삭제`}
                            title="삭제"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* 하위 태그 (재귀 렌더링) */}
            {hasChildren && isExpanded && (
                <div className="tag-tree-item__children">
                    {node.children.map((child) => (
                        <TagTreeItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedTagIds={selectedTagIds}
                            onEditTag={onEditTag}
                            onDeleteTag={onDeleteTag}
                            onCreateChildTag={onCreateChildTag}
                            onSelectTag={onSelectTag}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function TagSidebar({
    tags,
    selectedTagIds,
    overallFileCount,
    onCreateTag,
    onEditTag,
    onDeleteTag,
    onCreateChildTag,
    onSelectTag,
}: TagSidebarProps) {
    const tagTree = buildTagTree(tags);

    return (
        <aside className="tag-sidebar">
            {/* 사이드바 헤더 */}
            <div className="tag-sidebar__header">
                <h2 className="tag-sidebar__title">
                    태그
                    <span className="tag-sidebar__count">
                        ({tags.length}) 파일 ({overallFileCount})
                    </span>
                </h2>
                <button
                    className="tag-sidebar__add-btn"
                    onClick={onCreateTag}
                    aria-label="새 태그 만들기"
                    title="새 태그 만들기"
                >
                    +
                </button>
            </div>

            <div className="tag-sidebar__search">
                <TagSearchDropdown
                    tags={tags}
                    selectedTagIds={new Set(selectedTagIds)}
                    onSelectTag={(id) => id !== null && onSelectTag(id)}
                    selectionMode="single"
                    searchPlaceholder="태그 검색..."
                />
            </div>

            {/* 태그 목록 */}
            <div className="tag-sidebar__list">
                {tagTree.length === 0 ? (
                    <div className="tag-sidebar__empty">
                        <p>아직 태그가 없습니다.</p>
                        <button
                            className="tag-sidebar__empty-btn"
                            onClick={onCreateTag}
                        >
                            + 첫 태그 만들기
                        </button>
                    </div>
                ) : (
                    tagTree.map((node) => (
                        <TagTreeItem
                            key={node.id}
                            node={node}
                            depth={0}
                            selectedTagIds={selectedTagIds}
                            onEditTag={onEditTag}
                            onDeleteTag={onDeleteTag}
                            onCreateChildTag={onCreateChildTag}
                            onSelectTag={onSelectTag}
                        />
                    ))
                )}
            </div>
        </aside>
    );
}
