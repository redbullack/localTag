import type { Tag, TagTreeNode } from '../types';

/**
 * 평면적인 태그 리스트를 계층형 트리(TagTreeNode)로 변환합니다.
 */
export const buildTagTree = (tags: Tag[]): TagTreeNode[] => {
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

    return rootNodes;
};

/**
 * 계층형 트리를 렌더링에 적합한 depth를 포함한 평면 리스트로 다시 변환합니다.
 */
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
