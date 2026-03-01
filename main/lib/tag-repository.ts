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

    const stmt = db.prepare(`
        INSERT INTO tags (name, color, parent_id)
        VALUES (?, ?, ?)
    `);

    const result = stmt.run(name, color, parentId);

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

    const stmt = db.prepare(`
        SELECT id, name, parent_id AS parentId, color
        FROM tags
        ORDER BY parent_id IS NOT NULL, parent_id, name
    `);

    return stmt.all() as Tag[];
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
