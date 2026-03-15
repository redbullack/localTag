import type { Tag, TagTreeNode } from '../types';

export type TagSortOrder = 'none' | 'asc' | 'desc';

/**
 * 트리 노드 배열을 이름순으로 재귀 정렬합니다.
 * 자식 노드는 부모를 따라다니며, 같은 레벨의 형제끼리만 정렬됩니다.
 */
const sortTreeNodes = (nodes: TagTreeNode[], order: TagSortOrder): TagTreeNode[] => {
    if (order === 'none') return nodes;

    const sorted = [...nodes].sort((a, b) => {
        const cmp = a.name.localeCompare(b.name, 'ko');
        return order === 'asc' ? cmp : -cmp;
    });

    return sorted.map((node) => ({
        ...node,
        children: sortTreeNodes(node.children, order),
    }));
};

/**
 * 평면적인 태그 리스트를 계층형 트리(TagTreeNode)로 변환합니다.
 */
export const buildTagTree = (tags: Tag[], sortOrder: TagSortOrder = 'none'): TagTreeNode[] => {
    const tagMap = new Map<number, TagTreeNode>();
    const rootNodes: TagTreeNode[] = [];

    tags.forEach((tag) => {
        tagMap.set(tag.id, { ...tag, children: [] });
    });

    tags.forEach((tag) => {
        const treeNode = tagMap.get(tag.id)!;
        if (tag.parentId !== null && tagMap.has(tag.parentId)) {
            tagMap.get(tag.parentId)!.children.push(treeNode);
        } else {
            rootNodes.push(treeNode);
        }
    });

    return sortTreeNodes(rootNodes, sortOrder);
};

/**
 * 계층형 트리를 렌더링에 적합한 depth를 포함한 평면 리스트로 다시 변환합니다.
 */
/**
 * 낙관적 업데이트용: 같은 parentId 그룹의 태그 순서를 orderedIds 순서로 재배치합니다.
 */
export const reorderTagListLocally = (
    tags: Tag[],
    parentId: number | null,
    orderedIds: number[]
): Tag[] => {
    const siblingMap = new Map<number, Tag>();
    for (const tag of tags) {
        if (tag.parentId === parentId) {
            siblingMap.set(tag.id, tag);
        }
    }

    const reorderedSiblings = orderedIds
        .map((id) => siblingMap.get(id))
        .filter((t): t is Tag => t !== undefined);

    const result: Tag[] = [];
    let siblingIndex = 0;
    for (const tag of tags) {
        if (tag.parentId === parentId) {
            result.push(reorderedSiblings[siblingIndex++]);
        } else {
            result.push(tag);
        }
    }
    return result;
};

export const flattenTree = (
    nodes: TagTreeNode[],
    depth: number = 0
): { tag: Tag; depth: number }[] => {
    const result: { tag: Tag; depth: number }[] = [];

    for (const node of nodes) {
        result.push({ tag: node, depth });
        if (node.children.length > 0) {
            result.push(...flattenTree(node.children, depth + 1));
        }
    }

    return result;
};
