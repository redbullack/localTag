import { getDb } from './db';

/**
 * Tag 데이터 인터페이스
 * - id: 태그 고유 ID (자동 증가)
 * - name: 태그 이름
 * - parentId: 부모 태그 ID (null이면 루트 태그)
 * - color: 태그 색상 (HEX 코드)
 */
export interface Tag {
    id: number;
    name: string;
    parentId: number | null;
    color: string | null;
    fileCount?: number;
}

interface CreateTagParams {
    name: string;
    color?: string | null;
    parentId?: number | null;
}

interface UpdateTagParams {
    id: number;
    name?: string;
    color?: string | null;
    parentId?: number | null;
}

/**
 * 새로운 태그를 생성합니다.
 * @param params - { name, color?, parentId? }
 * @returns 생성된 Tag 객체
 * @throws UNIQUE 제약 위반 시 에러 (같은 부모 아래 동일 이름)
 */
export const createTag = (params: CreateTagParams): Tag => {
    const db = getDb();
    const { name, color = null, parentId = null } = params;

    // 같은 parent_id 그룹 내 다음 sort_order 할당
    const maxRow = db.prepare(
        'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM tags WHERE parent_id IS ?'
    ).get(parentId) as { maxOrder: number };
    const sortOrder = maxRow.maxOrder + 1;

    const stmt = db.prepare(`
        INSERT INTO tags (name, color, parent_id, sort_order)
        VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(name, color, parentId, sortOrder);

    return {
        id: result.lastInsertRowid as number,
        name,
        parentId,
        color,
    };
};

/**
 * 모든 태그를 조회합니다. parent_id 기준으로 정렬하여 계층 구성에 유리합니다.
 * @returns Tag 배열
 */
export const getAllTags = (): Tag[] => {
    const db = getDb();

    // 1. 모든 태그 정보 조회
    const tags = db.prepare(`
        SELECT id, name, parent_id AS parentId, color
        FROM tags
        ORDER BY parent_id IS NOT NULL, parent_id, sort_order, name
    `).all() as Tag[];

    // 2. 모든 파일-태그 매핑 조회
    const fileTags = db.prepare('SELECT file_id, tag_id FROM file_tags').all() as { file_id: number; tag_id: number }[];

    // 3. 태그 ID별로 파일 ID 집합(Set) 초기화
    const tagFileIdsMap = new Map<number, Set<number>>();
    tags.forEach(tag => {
        tagFileIdsMap.set(tag.id, new Set());
    });

    // 4. 직접 연결된 파일 ID 병합
    fileTags.forEach(ft => {
        if (tagFileIdsMap.has(ft.tag_id)) {
            tagFileIdsMap.get(ft.tag_id)!.add(ft.file_id);
        }
    });

    // 5. 자식 태그 구조(Map) 생성
    const childrenMap = new Map<number, number[]>();
    tags.forEach(t => childrenMap.set(t.id, []));

    const rootTagIds: number[] = [];
    tags.forEach(t => {
        if (t.parentId && childrenMap.has(t.parentId)) {
            childrenMap.get(t.parentId)!.push(t.id);
        } else {
            rootTagIds.push(t.id);
        }
    });

    // 6. 재귀적으로 하위 태그의 파일 ID 집합을 현재 태그에 합침 (Set을 이용해 중복 제거)
    const mergeFileIds = (tagId: number): Set<number> => {
        const currentFileIds = tagFileIdsMap.get(tagId)!;
        const children = childrenMap.get(tagId) || [];

        for (const childId of children) {
            const childFileIds = mergeFileIds(childId); // 하위 태그의 모든 파일 집합 반환
            childFileIds.forEach(fileId => {
                currentFileIds.add(fileId);
            });
        }

        return currentFileIds;
    };

    // 루트 태그들부터 아래로 내려가며 처리(포스트오더 방식으로 합쳐짐)
    for (const rootId of rootTagIds) {
        mergeFileIds(rootId);
    }

    // 7. 결과 반환: 각 태그에 중복 제거된 하위 폴더 포함 파일 개수 삽입
    return tags.map(tag => ({
        ...tag,
        fileCount: tagFileIdsMap.get(tag.id)!.size
    }));
};

/**
 * 태그 정보를 수정합니다.
 * @param params - { id, name?, color?, parentId? }
 * @returns 수정된 Tag 객체
 * @throws 존재하지 않는 태그 ID일 경우 에러
 */
export const updateTag = (params: UpdateTagParams): Tag => {
    const db = getDb();
    const { id, name, color, parentId } = params;

    const currentTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as any;
    if (!currentTag) {
        throw new Error(`Tag with id ${id} not found.`);
    }

    const updatedName = name !== undefined ? name : currentTag.name;
    const updatedColor = color !== undefined ? color : currentTag.color;
    const updatedParentId = parentId !== undefined ? parentId : currentTag.parent_id;

    db.prepare(`
        UPDATE tags
        SET name = ?, color = ?, parent_id = ?
        WHERE id = ?
    `).run(updatedName, updatedColor, updatedParentId, id);

    return {
        id,
        name: updatedName,
        parentId: updatedParentId,
        color: updatedColor,
    };
};

/**
 * 태그를 삭제합니다. ON DELETE CASCADE로 하위 태그 및 file_tags 매핑도 자동 삭제됩니다.
 * @param id - 삭제할 태그 ID
 * @returns { success: boolean }
 */
export const deleteTag = (id: number): { success: boolean } => {
    const db = getDb();

    // SQLite에서 CASCADE가 작동하려면 foreign_keys 프래그마를 활성화해야 합니다.
    db.pragma('foreign_keys = ON');

    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);

    return { success: result.changes > 0 };
};

/**
 * 같은 부모 아래 태그들의 정렬 순서를 변경합니다.
 * @param params - { parentId: 부모 태그 ID (null이면 루트), orderedIds: 새 순서대로 정렬된 태그 ID 배열 }
 */
export const reorderTags = (params: { parentId: number | null; orderedIds: number[] }): void => {
    const db = getDb();
    const { parentId, orderedIds } = params;

    const updateStmt = db.prepare(
        'UPDATE tags SET sort_order = ? WHERE id = ? AND parent_id IS ?'
    );

    const transaction = db.transaction(() => {
        orderedIds.forEach((tagId, index) => {
            updateStmt.run(index, tagId, parentId);
        });
    });

    transaction();
};
