/**
 * 프론트엔드 공통 타입 정의
 * Backend의 tag-repository.ts와 동일한 Tag 구조를 공유합니다.
 */

export interface Tag {
    id: number;
    name: string;
    parentId: number | null;
    color: string | null;
}

/** 계층형 태그 트리 노드 */
export interface TagTreeNode extends Tag {
    children: TagTreeNode[];
}
