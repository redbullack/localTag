'use client';

import { useRef, useState } from 'react';
import './tag-sidebar.css';
import type { Tag, TagTreeNode } from '../../types';
import TagSearchDropdown from '../shared/tag-search-dropdown';
import { buildTagTree, type TagSortOrder } from '../../utils/tag-tree';
import { useSidebarResize } from '../../utils/use-sidebar-resize';
import { useToast } from '../shared/toast-provider';
import { UNTAGGED_TAG_ID, DEFAULT_TAG_COLOR } from '../../constants';

/**
 * TagSidebar - 좌측 사이드바에 태그 목록을 트리 형태로 표시하는 컴포넌트
 *
 * @param tags - 전체 태그 목록 (flat list)
 * @param onCreateTag - 새 태그 만들기 버튼 클릭 콜백
 * @param onEditTag - 태그 수정 버튼 클릭 콜백
 * @param onDeleteTag - 태그 삭제 버튼 클릭 콜백
 * @param onReorderTags - 드래그로 태그 순서 변경 콜백
 */

interface TagSidebarProps {
    tags: Tag[];
    selectedTagIds: number[];
    overallFileCount: number;
    untaggedFileCount: number;
    onCreateTag: () => void;
    onEditTag: (tag: Tag) => void;
    onDeleteTag: (tagId: number) => void;
    onCreateChildTag: (parentTag: Tag) => void;
    onSelectTag: (tagId: number) => void;
    onReorderTags: (parentId: number | null, orderedIds: number[]) => void;
    onToggleFavorite: (tagId: number) => void;
}

interface DragState {
    draggingId: number | null;
    draggingParentId: number | null;
    overTagId: number | null;
    position: 'above' | 'below' | null;
}

const INITIAL_DRAG_STATE: DragState = {
    draggingId: null,
    draggingParentId: null,
    overTagId: null,
    position: null,
};

/** 개별 태그 트리 노드를 재귀적으로 렌더링합니다. */
function TagTreeItem({
    node,
    depth,
    selectedTagIds,
    collapsedIds,
    isDragEnabled,
    dragState,
    onEditTag,
    onDeleteTag,
    onCreateChildTag,
    onSelectTag,
    onToggleFavorite,
    onToggleExpand,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    onBlockedDragAttempt,
}: {
    node: TagTreeNode;
    depth: number;
    selectedTagIds: number[];
    collapsedIds: Set<number>;
    isDragEnabled: boolean;
    dragState: DragState;
    onEditTag: (tag: Tag) => void;
    onDeleteTag: (tagId: number) => void;
    onCreateChildTag: (parentTag: Tag) => void;
    onSelectTag: (tagId: number) => void;
    onToggleFavorite: (tagId: number) => void;
    onToggleExpand: (nodeId: number) => void;
    onDragStart: (tagId: number, parentId: number | null) => void;
    onDragOver: (e: React.DragEvent, tagId: number, parentId: number | null) => void;
    onDrop: (tagId: number, parentId: number | null) => void;
    onDragEnd: () => void;
    onBlockedDragAttempt: () => void;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const hasChildren = node.children.length > 0;
    const isExpanded = !collapsedIds.has(node.id);
    const isActive = selectedTagIds.includes(node.id);
    const isDragging = dragState.draggingId === node.id;
    const isDragOver = dragState.overTagId === node.id;

    const dragOverClass = isDragOver && dragState.position === 'above'
        ? 'tag-tree-item__row--drag-over-above'
        : isDragOver && dragState.position === 'below'
            ? 'tag-tree-item__row--drag-over-below'
            : '';

    return (
        <div className="tag-tree-item">
            <div
                className={`tag-tree-item__row ${isActive ? 'tag-tree-item__row--active' : ''} ${isDragging ? 'tag-tree-item__row--dragging' : ''} ${dragOverClass}`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={() => onSelectTag(node.id)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                draggable
                onDragStart={(e) => {
                    if (!isDragEnabled) {
                        e.preventDefault();
                        onBlockedDragAttempt();
                        return;
                    }
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(node.id));
                    onDragStart(node.id, node.parentId);
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!isDragEnabled) {
                        e.dataTransfer.dropEffect = 'none';
                        return;
                    }
                    e.dataTransfer.dropEffect = 'move';
                    onDragOver(e, node.id, node.parentId);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    if (!isDragEnabled) return;
                    onDrop(node.id, node.parentId);
                }}
                onDragEnd={onDragEnd}
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
                    style={{ backgroundColor: node.color || DEFAULT_TAG_COLOR }}
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
                            className={`tag-tree-item__action-btn ${node.isFavorite ? 'tag-tree-item__action-btn--favorite' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(node.id);
                            }}
                            aria-label={node.isFavorite ? `${node.name} 즐겨찾기 해제` : `${node.name} 즐겨찾기 추가`}
                            title={node.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path
                                    d="M6 1L7.5 4.1L11 4.5L8.5 7L9.2 10.5L6 8.8L2.8 10.5L3.5 7L1 4.5L4.5 4.1L6 1Z"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeLinejoin="round"
                                    fill={node.isFavorite ? 'currentColor' : 'none'}
                                />
                            </svg>
                        </button>
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
                            isDragEnabled={isDragEnabled}
                            dragState={dragState}
                            onEditTag={onEditTag}
                            onDeleteTag={onDeleteTag}
                            onCreateChildTag={onCreateChildTag}
                            onSelectTag={onSelectTag}
                            onToggleFavorite={onToggleFavorite}
                            onToggleExpand={onToggleExpand}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            onDragEnd={onDragEnd}
                            onBlockedDragAttempt={onBlockedDragAttempt}
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

/** 트리에서 특정 parentId의 직계 자식 ID 목록을 순서대로 반환합니다. */
function getSiblingIds(tree: TagTreeNode[], parentId: number | null): number[] {
    if (parentId === null) {
        return tree.map((n) => n.id);
    }

    const findChildren = (nodes: TagTreeNode[]): number[] | null => {
        for (const node of nodes) {
            if (node.id === parentId) {
                return node.children.map((c) => c.id);
            }
            const found = findChildren(node.children);
            if (found) return found;
        }
        return null;
    };

    return findChildren(tree) ?? [];
}

/** 즐겨찾기 섹션의 개별 태그 아이템을 렌더링합니다. */
function FavoriteTagItem({
    tag,
    isActive,
    onSelectTag,
    onToggleFavorite,
}: {
    tag: Tag;
    isActive: boolean;
    onSelectTag: (tagId: number) => void;
    onToggleFavorite: (tagId: number) => void;
}) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`tag-tree-item__row tag-sidebar__favorite-row ${isActive ? 'tag-tree-item__row--active' : ''}`}
            style={{ paddingLeft: '12px' }}
            onClick={() => onSelectTag(tag.id)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span className="tag-tree-item__toggle tag-tree-item__toggle--hidden" aria-hidden="true" />
            <span
                className="tag-tree-item__dot"
                style={{ backgroundColor: tag.color || DEFAULT_TAG_COLOR }}
            />
            <span className="tag-tree-item__name">
                {tag.name}
                <span className="tag-tree-item__count">({tag.fileCount || 0})</span>
            </span>
            {isHovered && (
                <div className="tag-tree-item__actions">
                    <button
                        className="tag-tree-item__action-btn tag-tree-item__action-btn--favorite"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(tag.id);
                        }}
                        aria-label={`${tag.name} 즐겨찾기 해제`}
                        title="즐겨찾기 해제"
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                                d="M6 1L7.5 4.1L11 4.5L8.5 7L9.2 10.5L6 8.8L2.8 10.5L3.5 7L1 4.5L4.5 4.1L6 1Z"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinejoin="round"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

const SORT_CYCLE: TagSortOrder[] = ['none', 'asc', 'desc', 'count-asc', 'count-desc'];
const SORT_LABELS: Record<TagSortOrder, string> = {
    none: '기본 순서',
    asc: '이름 오름차순',
    desc: '이름 내림차순',
    'count-asc': '파일 수 오름차순',
    'count-desc': '파일 수 내림차순',
};

export default function TagSidebar({
    tags,
    selectedTagIds,
    overallFileCount,
    untaggedFileCount,
    onCreateTag,
    onEditTag,
    onDeleteTag,
    onCreateChildTag,
    onSelectTag,
    onReorderTags,
    onToggleFavorite,
}: TagSidebarProps) {
    const { showToast } = useToast();
    const [sortOrder, setSortOrder] = useState<TagSortOrder>('none');
    const tagTree = buildTagTree(tags, sortOrder);
    const favoriteTags = tags.filter((t) => t.isFavorite);

    // 명시적으로 접은 id만 추적한다. Set에 없는 id는 기본값으로 펼쳐진 상태로 취급한다.
    const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
    const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
    // setDragState는 비동기이므로 drop/dragOver 핸들러에서 최신값을 읽기 위해 ref로 동기화
    const dragStateRef = useRef<DragState>(INITIAL_DRAG_STATE);
    const updateDragState = (next: DragState) => {
        dragStateRef.current = next;
        setDragState(next);
    };

    // 토스트 중복 방지용 ref
    const blockedToastShownRef = useRef(false);

    const isDragEnabled = sortOrder === 'none';

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

    // ── 드래그 앤 드롭 핸들러 ──

    const handleDragStart = (tagId: number, parentId: number | null) => {
        updateDragState({ draggingId: tagId, draggingParentId: parentId, overTagId: null, position: null });
    };

    const handleDragOver = (e: React.DragEvent, targetId: number, targetParentId: number | null) => {
        const current = dragStateRef.current;
        // 같은 부모 그룹 내에서만 허용
        if (targetParentId !== current.draggingParentId) return;
        if (targetId === current.draggingId) {
            updateDragState({ ...current, overTagId: null });
            return;
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'above' : 'below';

        updateDragState({ ...current, overTagId: targetId, position });
    };

    const handleDrop = (targetId: number, targetParentId: number | null) => {
        const current = dragStateRef.current;
        if (!current.draggingId || targetParentId !== current.draggingParentId) return;
        if (targetId === current.draggingId || !current.overTagId) {
            updateDragState(INITIAL_DRAG_STATE);
            return;
        }

        const parentId = targetParentId;
        const siblings = getSiblingIds(tagTree, parentId);

        const fromIndex = siblings.indexOf(current.draggingId);
        const toIndex = siblings.indexOf(targetId);
        if (fromIndex === -1 || toIndex === -1) return;

        const reordered = [...siblings];
        reordered.splice(fromIndex, 1);
        const insertAt = current.position === 'above'
            ? reordered.indexOf(targetId)
            : reordered.indexOf(targetId) + 1;
        reordered.splice(insertAt, 0, current.draggingId);

        onReorderTags(parentId, reordered);
        updateDragState(INITIAL_DRAG_STATE);
    };

    const handleDragEnd = () => {
        updateDragState(INITIAL_DRAG_STATE);
        blockedToastShownRef.current = false;
    };

    const handleBlockedDragAttempt = () => {
        if (blockedToastShownRef.current) return;
        blockedToastShownRef.current = true;
        showToast({
            type: 'info',
            message: '태그 기본 정렬 순서일 때에만 정렬 순서를 바꿀 수 있습니다.',
            duration: 3000,
        });
    };

    const { isDragging: isResizing, handleMouseDown } = useSidebarResize({ minWidth: 180, maxWidth: 400, defaultWidth: 260 });

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
                            {(sortOrder === 'count-asc' || sortOrder === 'count-desc') ? (
                                <>
                                    <text x="2" y="10" fontSize="9" fill="currentColor" fontWeight="bold">#</text>
                                    {sortOrder === 'count-desc' && (
                                        <path d="M11 9L13 11L11 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-90 12 11)" />
                                    )}
                                    {sortOrder === 'count-asc' && (
                                        <path d="M11 13L13 11L11 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-90 12 11)" />
                                    )}
                                </>
                            ) : (
                                <>
                                    <path d="M2 4H12M4 7H10M6 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    {sortOrder === 'desc' && (
                                        <path d="M11 9L13 11L11 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-90 12 11)" />
                                    )}
                                    {sortOrder === 'asc' && (
                                        <path d="M11 13L13 11L11 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-90 12 11)" />
                                    )}
                                </>
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

            {/* 즐겨찾기 섹션 */}
            {favoriteTags.length > 0 && (
                <div className="tag-sidebar__favorite-section">
                    <div className="tag-sidebar__favorite-header">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                                d="M6 1L7.5 4.1L11 4.5L8.5 7L9.2 10.5L6 8.8L2.8 10.5L3.5 7L1 4.5L4.5 4.1L6 1Z"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinejoin="round"
                                fill="currentColor"
                            />
                        </svg>
                        즐겨찾기
                    </div>
                    {favoriteTags.map((tag) => (
                        <FavoriteTagItem
                            key={tag.id}
                            tag={tag}
                            isActive={selectedTagIds.includes(tag.id)}
                            onSelectTag={onSelectTag}
                            onToggleFavorite={onToggleFavorite}
                        />
                    ))}
                    <div className="tag-sidebar__divider" />
                </div>
            )}

            {/* 태그 없음 항목 */}
            <div className="tag-sidebar__untagged-section">
                <div
                    className={`tag-tree-item__row tag-sidebar__untagged-row ${selectedTagIds.includes(UNTAGGED_TAG_ID) ? 'tag-tree-item__row--active' : ''}`}
                    style={{ paddingLeft: '12px' }}
                    onClick={() => onSelectTag(UNTAGGED_TAG_ID)}
                >
                    <span className="tag-tree-item__toggle tag-tree-item__toggle--hidden" aria-hidden="true" />
                    <span className="tag-tree-item__dot tag-sidebar__untagged-dot" />
                    <span className="tag-tree-item__name">
                        태그 없음
                        <span className="tag-tree-item__count">({untaggedFileCount})</span>
                    </span>
                </div>
                <div className="tag-sidebar__divider" />
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
                            isDragEnabled={isDragEnabled}
                            dragState={dragState}
                            onEditTag={onEditTag}
                            onDeleteTag={onDeleteTag}
                            onCreateChildTag={onCreateChildTag}
                            onSelectTag={onSelectTag}
                            onToggleFavorite={onToggleFavorite}
                            onToggleExpand={handleToggleExpand}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            onBlockedDragAttempt={handleBlockedDragAttempt}
                        />
                    ))
                )}
            </div>

            {/* 드래그 리사이즈 핸들 */}
            <div
                className={`sidebar-resize-handle ${isResizing ? 'sidebar-resize-handle--dragging' : ''}`}
                onMouseDown={handleMouseDown}
                aria-hidden="true"
            />
        </aside>
    );
}
