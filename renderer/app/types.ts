/**
 * 프론트엔드 공통 타입 정의
 * Backend의 tag-repository.ts와 동일한 Tag 구조를 공유합니다.
 */

export interface Tag {
    id: number;
    name: string;
    parentId: number | null;
    color: string | null;
    fileCount?: number;
}

/** 계층형 태그 트리 노드 */
export interface TagTreeNode extends Tag {
    children: TagTreeNode[];
}

/** 파일 레코드 */
export interface FileRecord {
    id: number;
    filename: string;
    relativePath: string;
    extension: string | null;
    size: number | null;
    createdAt: string;
    updatedAt: string;
}

/** 파일 + 연결된 태그 목록 */
export interface FileWithTags extends FileRecord {
    tags: Tag[];
}

/** 정렬 기준 컬러 */
export type SortColumn = 'filename' | 'extension' | 'size' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
    column: SortColumn;
    order: SortOrder;
}
