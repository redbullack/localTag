'use client';

import { useState } from 'react';
import './tag-sidebar.css';
import type { Tag, TagTreeNode } from '../../types';
import TagSearchDropdown from '../shared/tag-search-dropdown';
import { buildTagTree, type TagSortOrder } from '../../utils/tag-tree';
import { useSidebarResize } from '../../utils/use-sidebar-resize';

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
    collapsedIds,
    onEditTag,
    onDeleteTag,
    onCreateChildTag,
    onSelectTag,
    onToggleExpand,
}: {
    node: TagTreeNode;
    depth: number;
    selectedTagIds: number[];
    collapsedIds: Set<number>;
    onEditTag: (tag: Tag) => void;
    onDeleteTag: (tagId: number) => void;
    onCreateChildTag: (parentTag: Tag) => void;
    onSelectTag: (tagId: number) => void;
    onToggleExpand: (nodeId: number) => void;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const hasChildren = node.children.length > 0;
    // collapsedIds에 없으면 기본값으로 펼쳐진 상태로 취급한다
    const isExpanded = !collapsedIds.has(node.id);
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
                    onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
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
                            collapsedIds={collapsedIds}
                            onEditTag={onEditTag}
                            onDeleteTag={onDeleteTag}
                            onCreateChildTag={onCreateChildTag}
                            onSelectTag={onSelectTag}
                            onToggleExpand={onToggleExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function getAllIds(nodes: TagTreeNode[]): Set<number> {
    const ids = new Set<number>();
    const visit = (list: TagTreeNode[]) => {
        for (const n of list) {
            ids.add(n.id);
            visit(n.children);
        }
    };
    visit(nodes);
    return ids;
}

const SORT_CYCLE: TagSortOrder[] = ['none', 'asc', 'desc'];
const SORT_LABELS: Record<TagSortOrder, string> = {
    none: '기본 순서',
    asc: '이름 오름차순',
    desc: '이름 내림차순',
};

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
    const [sortOrder, setSortOrder] = useState<TagSortOrder>('none');
    const tagTree = buildTagTree(tags, sortOrder);

    // 명시적으로 접은 id만 추적한다. Set에 없는 id는 기본값으로 펼쳐진 상태로 취급한다.
    const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

    const handleToggleExpand = (nodeId: number) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
            return next;
        });
    };

    // 모두 접기: 모든 id를 collapsedIds에 추가
    const handleCollapseAll = () => setCollapsedIds(getAllIds(tagTree));
    // 모두 펼치기: collapsedIds를 비워 기본값(펼침)으로 복원
    const handleExpandAll = () => setCollapsedIds(new Set());

    const cycleSortOrder = () => {
        const nextIndex = (SORT_CYCLE.indexOf(sortOrder) + 1) % SORT_CYCLE.length;
        setSortOrder(SORT_CYCLE[nextIndex]);
    };

    const { isDragging, handleMouseDown } = useSidebarResize({ minWidth: 180, maxWidth: 400, defaultWidth: 260 });

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
                <div className="tag-sidebar__header-actions">
                    <button
                        className="tag-sidebar__collapse-btn"
                        onClick={collapsedIds.size > 0 ? handleExpandAll : handleCollapseAll}
                        aria-label={collapsedIds.size > 0 ? '모두 펼치기' : '모두 접기'}
                        title={collapsedIds.size > 0 ? '모두 펼치기' : '모두 접기'}
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            {collapsedIds.size > 0
                                ? <path d="M2 5L7 10L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                : <path d="M2 9L7 4L12 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            }
                        </svg>
                    </button>
                    <button
                        className={`tag-sidebar__sort-btn ${sortOrder !== 'none' ? 'tag-sidebar__sort-btn--active' : ''}`}
                        onClick={cycleSortOrder}
                        aria-label={`정렬: ${SORT_LABELS[sortOrder]}`}
                        title={`정렬: ${SORT_LABELS[sortOrder]}`}
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 4H12M4 7H10M6 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            {sortOrder === 'desc' && (
                                <path d="M11 9L13 11L11 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-90 12 11)" />
                            )}
                            {sortOrder === 'asc' && (
                                <path d="M11 13L13 11L11 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-90 12 11)" />
                            )}
                        </svg>
                    </button>
                    <button
                        className="tag-sidebar__add-btn"
                        onClick={onCreateTag}
                        aria-label="새 태그 만들기"
                        title="새 태그 만들기"
                    >
                        +
                    </button>
                </div>
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
                            collapsedIds={collapsedIds}
                            onEditTag={onEditTag}
                            onDeleteTag={onDeleteTag}
                            onCreateChildTag={onCreateChildTag}
                            onSelectTag={onSelectTag}
                            onToggleExpand={handleToggleExpand}
                        />
                    ))
                )}
            </div>

            {/* 드래그 리사이즈 핸들 */}
            <div
                className={`sidebar-resize-handle ${isDragging ? 'sidebar-resize-handle--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                aria-hidden="true"
            />
        </aside>
    );
}
