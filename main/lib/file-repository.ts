import { getDb } from './db';
import { getVaultPath } from './store';
import * as fs from 'fs';
import * as path from 'path';

/**
 * File 데이터 인터페이스
 * - id: 파일 고유 ID (자동 증가)
 * - filename: 파일명 (확장자 포함)
 * - relativePath: Vault 기준 상대 경로
 * - extension: 파일 확장자
 * - size: 파일 크기 (bytes)
 * - createdAt: 생성일시
 * - updatedAt: 수정일시
 */
export interface FileRecord {
    id: number;
    filename: string;
    relativePath: string;
    extension: string | null;
    size: number | null;
    createdAt: string;
    updatedAt: string;
}

export type SortColumn = 'filename' | 'extension' | 'size' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
    column: SortColumn;
    order: SortOrder;
}

/** 파일 + 연결된 태그 목록 */
export interface FileWithTags extends FileRecord {
    tags: { id: number; name: string; color: string | null }[];
}

interface AddFileParams {
    sourcePath: string;
    tagIds?: number[];
}

// ─── 유틸리티 ────────────────────────────────────────

/** 특정 임시 파일/숨김 파일을 완전히 무시하는 필터 함수 */
const isIgnoredFile = (filename: string): boolean => {
    const lower = filename.toLowerCase();
    return (
        filename.startsWith('.') ||
        filename.startsWith('~$') ||
        lower === 'thumbs.db' ||
        lower === 'desktop.ini'
    );
};

/** Vault 절대 경로를 안전하게 가져옵니다. */
const getVaultPathOrThrow = (): string => {
    const vaultPath = getVaultPath();
    if (!vaultPath) {
        throw new Error('Vault 경로가 설정되지 않았습니다.');
    }
    return vaultPath;
};

// ─── CRUD 함수 ───────────────────────────────────────

/**
 * 외부 파일을 Vault(MyTaggedFiles)로 복사하고 DB에 등록합니다.
 * @param params - { sourcePath, tagIds? }
 * @returns 생성된 FileWithTags 객체
 * @throws 동일 파일명이 이미 존재할 경우 에러
 */
export const addFile = (params: AddFileParams): FileWithTags => {
    const db = getDb();
    const vaultPath = getVaultPathOrThrow();
    const { sourcePath, tagIds = [] } = params;

    const filename = path.basename(sourcePath);
    const extension = path.extname(sourcePath).slice(1) || null;
    const destinationPath = path.join(vaultPath, filename);

    // 숨김/임시 파일 필터링
    if (isIgnoredFile(filename)) {
        throw new Error(`시스템 또는 임시 파일은 추가할 수 없습니다: ${filename}`);
    }

    // 중복 파일명 체크
    if (fs.existsSync(destinationPath)) {
        throw new Error(`동일한 파일명이 이미 존재합니다: ${filename}`);
    }

    // 소스 파일 존재 확인
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`원본 파일을 찾을 수 없습니다: ${sourcePath}`);
    }

    // Vault로 파일 이동 (실패 시 복사 후 원본 삭제 fallback)
    try {
        fs.renameSync(sourcePath, destinationPath);
    } catch (error: any) {
        if (error.code === 'EXDEV') {
            fs.copyFileSync(sourcePath, destinationPath);
            fs.unlinkSync(sourcePath);
        } else {
            throw new Error(`파일 이동 실패: ${error.message}`);
        }
    }

    const fileStats = fs.statSync(destinationPath);
    const relativePath = filename;

    // 트랜잭션: files INSERT + file_tags INSERT
    const insertFile = db.prepare(`
        INSERT INTO files (filename, relative_path, extension, size)
        VALUES (?, ?, ?, ?)
    `);

    const insertFileTag = db.prepare(`
        INSERT INTO file_tags (file_id, tag_id) VALUES (?, ?)
    `);

    const transaction = db.transaction(() => {
        const result = insertFile.run(relativePath, relativePath, extension, fileStats.size);
        const fileId = result.lastInsertRowid as number;

        for (const tagId of tagIds) {
            insertFileTag.run(fileId, tagId);
        }

        return fileId;
    });

    const fileId = transaction();

    return getFileWithTagsById(fileId);
};

/**
 * 모든 파일을 태그 정보와 함께 조회합니다. (N+1 방지: JOIN 활용)
 * @param page - 페이지 번호
 * @param limit - 페이지당 개수
 * @param sort - 정렬 옵션
 * @returns { data: FileWithTags[], totalCount: number }
 */
export const getAllFiles = (page: number = 1, limit: number = 50, sort?: SortOption): { data: FileWithTags[], totalCount: number } => {
    const db = getDb();

    // 전체 개수 조회
    const countRow = db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number };
    const totalCount = countRow.count;

    const offset = (page - 1) * limit;
    const orderBy = buildOrderByClause(sort);

    const fileRows = db.prepare(`
        SELECT id, filename, relative_path AS relativePath, extension, size,
               created_at AS createdAt, updated_at AS updatedAt
        FROM files
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
    `).all(limit, offset) as FileRecord[];

    if (fileRows.length === 0) return { data: [], totalCount };

    // 전체 file_tags + tags 를 한번에 가져와서 메모리에서 매핑 (N+1 방지)
    const tagMappings = db.prepare(`
        SELECT ft.file_id AS fileId, t.id, t.name, t.color
        FROM file_tags ft
        JOIN tags t ON ft.tag_id = t.id
        ORDER BY ft.file_id, t.name
    `).all() as { fileId: number; id: number; name: string; color: string | null }[];

    const tagsByFileId = new Map<number, { id: number; name: string; color: string | null }[]>();

    for (const row of tagMappings) {
        if (!tagsByFileId.has(row.fileId)) {
            tagsByFileId.set(row.fileId, []);
        }
        tagsByFileId.get(row.fileId)!.push({
            id: row.id,
            name: row.name,
            color: row.color,
        });
    }

    const data = fileRows.map((file) => ({
        ...file,
        tags: tagsByFileId.get(file.id) || [],
    }));

    return { data, totalCount };
};

/**
 * 여러 태그 중 하나라도 연결된 파일만 조회합니다 (OR 조건, CTE 재귀 포함)
 * @param tagIds - 필터링할 태그 ID 배열
 * @param page - 페이지 번호
 * @param limit - 페이지당 개수
 * @param sort - 정렬 옵션
 * @returns { data: FileWithTags[], totalCount: number }
 */
export const getFilesByTagIds = (tagIds: number[], page: number = 1, limit: number = 50, sort?: SortOption, includeUntagged: boolean = false): { data: FileWithTags[], totalCount: number } => {
    if (!tagIds || tagIds.length === 0) {
        // 태그 ID가 없고 untagged만 요청된 경우
        if (includeUntagged) return getUntaggedFiles(page, limit, sort);
        return { data: [], totalCount: 0 };
    }

    const db = getDb();
    const placeholders = tagIds.map(() => '?').join(',');

    const untaggedCountClause = includeUntagged
        ? `+ (SELECT COUNT(*) FROM files f2 WHERE NOT EXISTS (SELECT 1 FROM file_tags ft2 WHERE ft2.file_id = f2.id))`
        : '';

    // 전체 개수 조회 쿼리 (재귀 공통 테이블 식 적용)
    const countQuery = `
        WITH RECURSIVE tag_tree AS (
            SELECT id FROM tags WHERE id IN (${placeholders})
            UNION ALL
            SELECT t.id FROM tags t
            INNER JOIN tag_tree tt ON t.parent_id = tt.id
        )
        SELECT (
            SELECT COUNT(DISTINCT f.id)
            FROM files f
            JOIN file_tags ft ON f.id = ft.file_id
            WHERE ft.tag_id IN (SELECT id FROM tag_tree)
        ) ${untaggedCountClause} as count
    `;
    const countRow = db.prepare(countQuery).get(...tagIds) as { count: number };
    const totalCount = countRow.count;

    const offset = (page - 1) * limit;
    const orderBy = buildOrderByClause(sort, 'f');

    let fileRows: FileRecord[];

    if (includeUntagged) {
        // UNION을 사용하므로 서브쿼리로 래핑 후 alias된 컬럼명으로 정렬
        const aliasOrderBy = orderBy
            .replace('f.updated_at', 'updatedAt')
            .replace('f.created_at', 'createdAt')
            .replace('f.filename', 'filename')
            .replace('f.extension', 'extension')
            .replace('f.size', 'size');

        fileRows = db.prepare(`
            WITH RECURSIVE tag_tree AS (
                SELECT id FROM tags WHERE id IN (${placeholders})
                UNION ALL
                SELECT t.id FROM tags t
                INNER JOIN tag_tree tt ON t.parent_id = tt.id
            )
            SELECT * FROM (
                SELECT DISTINCT f.id, f.filename, f.relative_path AS relativePath,
                       f.extension, f.size, f.created_at AS createdAt, f.updated_at AS updatedAt
                FROM files f
                JOIN file_tags ft ON f.id = ft.file_id
                WHERE ft.tag_id IN (SELECT id FROM tag_tree)
                UNION
                SELECT f.id, f.filename, f.relative_path AS relativePath,
                       f.extension, f.size, f.created_at AS createdAt, f.updated_at AS updatedAt
                FROM files f
                WHERE NOT EXISTS (SELECT 1 FROM file_tags ft2 WHERE ft2.file_id = f.id)
            )
            ORDER BY ${aliasOrderBy}
            LIMIT ? OFFSET ?
        `).all(...tagIds, limit, offset) as FileRecord[];
    } else {
        // 기존 쿼리 그대로 사용 (서브쿼리 래핑 없음)
        fileRows = db.prepare(`
            WITH RECURSIVE tag_tree AS (
                SELECT id FROM tags WHERE id IN (${placeholders})
                UNION ALL
                SELECT t.id FROM tags t
                INNER JOIN tag_tree tt ON t.parent_id = tt.id
            )
            SELECT DISTINCT f.id, f.filename, f.relative_path AS relativePath,
                   f.extension, f.size, f.created_at AS createdAt, f.updated_at AS updatedAt
            FROM files f
            JOIN file_tags ft ON f.id = ft.file_id
            WHERE ft.tag_id IN (SELECT id FROM tag_tree)
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `).all(...tagIds, limit, offset) as FileRecord[];
    }

    if (fileRows.length === 0) return { data: [], totalCount };

    // 필터된 파일들의 전체 태그 매핑을 가져옴
    const fileIds = fileRows.map((f) => f.id);
    const fileIdPlaceholders = fileIds.map(() => '?').join(',');

    const tagMappings = db.prepare(`
        SELECT ft.file_id AS fileId, t.id, t.name, t.color
        FROM file_tags ft
        JOIN tags t ON ft.tag_id = t.id
        WHERE ft.file_id IN (${fileIdPlaceholders})
        ORDER BY ft.file_id, t.name
    `).all(...fileIds) as { fileId: number; id: number; name: string; color: string | null }[];

    const tagsByFileId = new Map<number, { id: number; name: string; color: string | null }[]>();

    for (const row of tagMappings) {
        if (!tagsByFileId.has(row.fileId)) {
            tagsByFileId.set(row.fileId, []);
        }
        tagsByFileId.get(row.fileId)!.push({
            id: row.id,
            name: row.name,
            color: row.color,
        });
    }

    const data = fileRows.map((file) => ({
        ...file,
        tags: tagsByFileId.get(file.id) || [],
    }));

    return { data, totalCount };
};

/**
 * 전체 로컬 파일의 개수만 조회합니다. (페이징이나 데이터 없이 개수만 필요할 때 사용)
 * @returns { count: number }
 */
export const getTotalFileCount = (): { count: number } => {
    const db = getDb();

    // 전체 개수 조회
    const countRow = db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number };
    const totalCount = countRow.count;

    return { count: totalCount };
};

/**
 * 태그가 하나도 연결되지 않은 파일 목록을 조회합니다.
 * @param page - 페이지 번호
 * @param limit - 페이지당 개수
 * @param sort - 정렬 옵션
 * @returns { data: FileWithTags[], totalCount: number }
 */
export const getUntaggedFiles = (page: number = 1, limit: number = 50, sort?: SortOption): { data: FileWithTags[], totalCount: number } => {
    const db = getDb();

    const countRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM files f
        WHERE NOT EXISTS (
            SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id
        )
    `).get() as { count: number };
    const totalCount = countRow.count;

    const offset = (page - 1) * limit;
    const orderBy = buildOrderByClause(sort);

    const fileRows = db.prepare(`
        SELECT id, filename, relative_path AS relativePath, extension, size,
               created_at AS createdAt, updated_at AS updatedAt
        FROM files f
        WHERE NOT EXISTS (
            SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id
        )
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
    `).all(limit, offset) as FileRecord[];

    const data = fileRows.map((file) => ({ ...file, tags: [] }));

    return { data, totalCount };
};

/**
 * 태그가 하나도 연결되지 않은 파일의 개수만 조회합니다.
 * @returns { count: number }
 */
export const getUntaggedFileCount = (): { count: number } => {
    const db = getDb();

    const countRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM files f
        WHERE NOT EXISTS (
            SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id
        )
    `).get() as { count: number };

    return { count: countRow.count };
};

/**
 * 파일 이름을 변경합니다. (DB + 파일시스템 동시 변경)
 * @param id - 파일 ID
 * @param newFilename - 새 파일명 (확장자 포함)
 * @returns 수정된 FileWithTags 객체
 */
export const renameFile = (id: number, newFilename: string): FileWithTags => {
    const db = getDb();
    const vaultPath = getVaultPathOrThrow();

    const currentFile = db.prepare(
        'SELECT filename, relative_path FROM files WHERE id = ?'
    ).get(id) as { filename: string; relative_path: string } | undefined;

    if (!currentFile) {
        throw new Error(`파일 ID ${id}를 찾을 수 없습니다.`);
    }

    const oldPath = path.join(vaultPath, currentFile.relative_path);
    const newPath = path.join(vaultPath, newFilename);

    // 새 파일명 중복 체크
    if (currentFile.filename !== newFilename && fs.existsSync(newPath)) {
        throw new Error(`동일한 파일명이 이미 존재합니다: ${newFilename}`);
    }

    const newExtension = path.extname(newFilename).slice(1) || null;

    // 파일시스템 이름 변경
    try {
        fs.renameSync(oldPath, newPath);
    } catch (error: any) {
        throw new Error(`파일 이름 변경 실패: ${error.message}`);
    }

    // DB 업데이트
    db.prepare(`
        UPDATE files
        SET filename = ?, relative_path = ?, extension = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(newFilename, newFilename, newExtension, id);

    return getFileWithTagsById(id);
};

/**
 * 파일을 삭제합니다. (DB + 파일시스템 동시 삭제)
 * ON DELETE CASCADE로 file_tags 매핑도 자동 삭제됩니다.
 * @param id - 삭제할 파일 ID
 * @returns { success: boolean }
 */
export const deleteFile = (id: number): { success: boolean } => {
    const db = getDb();
    const vaultPath = getVaultPathOrThrow();

    db.pragma('foreign_keys = ON');

    const fileRow = db.prepare(
        'SELECT relative_path FROM files WHERE id = ?'
    ).get(id) as { relative_path: string } | undefined;

    if (!fileRow) {
        throw new Error(`파일 ID ${id}를 찾을 수 없습니다.`);
    }

    const filePath = path.join(vaultPath, fileRow.relative_path);

    // 파일시스템에서 삭제 (파일이 없어도 DB는 정리)
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error: any) {
        throw new Error(`파일 삭제 실패: ${error.message}`);
    }

    const result = db.prepare('DELETE FROM files WHERE id = ?').run(id);

    return { success: result.changes > 0 };
};

/**
 * DB에서 파일 레코드만 삭제합니다 (파일시스템 작업 없음).
 * 파일을 외부 폴더로 이동한 뒤 DB 정리 목적으로 사용합니다.
 * ON DELETE CASCADE로 file_tags 매핑도 자동 삭제됩니다.
 * @param id - 삭제할 파일 ID
 * @returns { success: boolean }
 */
export const deleteFileRecordOnly = (id: number): { success: boolean } => {
    const db = getDb();

    db.pragma('foreign_keys = ON');

    const fileRow = db.prepare(
        'SELECT id FROM files WHERE id = ?'
    ).get(id) as { id: number } | undefined;

    if (!fileRow) {
        throw new Error(`파일 ID ${id}를 찾을 수 없습니다.`);
    }

    const result = db.prepare('DELETE FROM files WHERE id = ?').run(id);

    return { success: result.changes > 0 };
};

/**
 * 파일의 태그 매핑을 전체 교체합니다. (DELETE → INSERT 트랜잭션)
 * @param fileId - 파일 ID
 * @param tagIds - 새로 설정할 태그 ID 배열
 * @returns 갱신된 FileWithTags 객체
 */
export const updateFileTags = (fileId: number, tagIds: number[]): FileWithTags => {
    const db = getDb();

    const fileExists = db.prepare('SELECT id FROM files WHERE id = ?').get(fileId);
    if (!fileExists) {
        throw new Error(`파일 ID ${fileId}를 찾을 수 없습니다.`);
    }

    const deleteTags = db.prepare('DELETE FROM file_tags WHERE file_id = ?');
    const insertTag = db.prepare('INSERT INTO file_tags (file_id, tag_id) VALUES (?, ?)');

    const transaction = db.transaction(() => {
        deleteTags.run(fileId);
        for (const tagId of tagIds) {
            insertTag.run(fileId, tagId);
        }
    });

    transaction();

    // updated_at 갱신
    db.prepare('UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(fileId);

    return getFileWithTagsById(fileId);
};

/**
 * 여러 파일의 태그를 동일한 집합으로 일괄 교체합니다.
 * @param fileIds - 태그를 교체할 파일 ID 배열
 * @param tagIds - 새로 설정할 태그 ID 배열
 * @returns { updatedCount: number }
 */
export const bulkSetFileTags = (fileIds: number[], tagIds: number[]): { updatedCount: number } => {
    const db = getDb();
    const uniqueFileIds = Array.from(new Set(fileIds));
    const uniqueTagIds = Array.from(new Set(tagIds));

    if (uniqueFileIds.length === 0) {
        throw new Error('태그를 수정할 파일이 선택되지 않았습니다.');
    }

    const placeholders = uniqueFileIds.map(() => '?').join(',');
    const existingFiles = db.prepare(`
        SELECT id
        FROM files
        WHERE id IN (${placeholders})
    `).all(...uniqueFileIds) as { id: number }[];

    if (existingFiles.length !== uniqueFileIds.length) {
        throw new Error('선택한 파일 중 일부를 찾을 수 없습니다.');
    }

    const deleteTags = db.prepare('DELETE FROM file_tags WHERE file_id = ?');
    const insertTag = db.prepare('INSERT INTO file_tags (file_id, tag_id) VALUES (?, ?)');
    const touchFile = db.prepare('UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');

    const transaction = db.transaction(() => {
        for (const fileId of uniqueFileIds) {
            deleteTags.run(fileId);

            for (const tagId of uniqueTagIds) {
                insertTag.run(fileId, tagId);
            }

            touchFile.run(fileId);
        }
    });

    transaction();

    return { updatedCount: uniqueFileIds.length };
};

/**
 * 중복 파일명을 확인합니다.
 * @param filenames - 확인할 파일명 배열
 * @returns 이미 존재하는 파일명 배열
 */
export const checkDuplicateFilenames = (filenames: string[]): string[] => {
    const vaultPath = getVaultPathOrThrow();

    return filenames.filter((filename) => {
        const filePath = path.join(vaultPath, filename);
        return fs.existsSync(filePath);
    });
};

/**
 * Vault(디렉토리)와 DB 파일 목록을 비교하여 동기화합니다.
 * @returns { addedCount: number; deletedCount: number; updatedCount: number }
 */
export const syncVault = (): { addedCount: number; deletedCount: number; updatedCount: number; success: boolean, error?: string } => {
    try {
        const db = getDb();
        const vaultPath = getVaultPathOrThrow();

        if (!fs.existsSync(vaultPath)) {
            return { addedCount: 0, deletedCount: 0, updatedCount: 0, success: true };
        }

        // 1. 물리적 파일 목록 읽기
        const filesInDir = fs.readdirSync(vaultPath, { withFileTypes: true });

        // 2. 물리적 파일 정보를 Map으로 구성
        const physicalFiles = new Map<string, { size: number, extension: string | null }>();
        for (const dirent of filesInDir) {
            if (dirent.isFile() && !isIgnoredFile(dirent.name)) {
                const filePath = path.join(vaultPath, dirent.name);
                try {
                    const stats = fs.statSync(filePath);
                    const extension = path.extname(dirent.name).slice(1) || null;
                    physicalFiles.set(dirent.name, {
                        size: stats.size,
                        extension
                    });
                } catch (err) {
                    console.error(`Failed to stat file ${dirent.name}:`, err);
                }
            }
        }

        // 3. DB 파일 목록 읽기
        const dbFilesRows = db.prepare('SELECT id, filename, size FROM files').all() as { id: number, filename: string, size: number | null }[];
        const dbFiles = new Map<string, { id: number, size: number | null }>();
        for (const row of dbFilesRows) {
            dbFiles.set(row.filename, { id: row.id, size: row.size });
        }

        let addedCount = 0;
        let deletedCount = 0;
        let updatedCount = 0;

        // 4. 삭제 대상 파악 및 크기 변경 파악
        const toDeleteIds: number[] = [];
        const toUpdateSizes: { id: number, size: number }[] = [];

        for (const [filename, dbInfo] of Array.from(dbFiles.entries())) {
            if (!physicalFiles.has(filename)) {
                // 물리적 파일이 없으면 DB에서 삭제
                toDeleteIds.push(dbInfo.id);
                deletedCount++;
            } else {
                // 물리적 파일이 있으면 크기 비교
                const physicalSize = physicalFiles.get(filename)!.size;
                if (dbInfo.size !== physicalSize) {
                    toUpdateSizes.push({ id: dbInfo.id, size: physicalSize });
                    updatedCount++;
                }
            }
        }

        // 5. 추가 대상 파악
        const toInsert: { filename: string, extension: string | null, size: number }[] = [];
        for (const [filename, physicalInfo] of Array.from(physicalFiles.entries())) {
            if (!dbFiles.has(filename)) {
                toInsert.push({ filename, extension: physicalInfo.extension, size: physicalInfo.size });
                addedCount++;
            }
        }

        // 6. DB 트랜잭션 실행
        if (addedCount > 0 || deletedCount > 0 || updatedCount > 0) {
            db.pragma('foreign_keys = ON');

            const deleteStmt = db.prepare('DELETE FROM files WHERE id = ?');
            const updateSizeStmt = db.prepare('UPDATE files SET size = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            const insertStmt = db.prepare('INSERT INTO files (filename, relative_path, extension, size) VALUES (?, ?, ?, ?)');

            const transaction = db.transaction(() => {
                for (const id of toDeleteIds) {
                    deleteStmt.run(id);
                }
                for (const update of toUpdateSizes) {
                    updateSizeStmt.run(update.size, update.id);
                }
                for (const insert of toInsert) {
                    insertStmt.run(insert.filename, insert.filename, insert.extension, insert.size);
                }
            });

            transaction();
        }

        return { addedCount, deletedCount, updatedCount, success: true };
    } catch (error: any) {
        return { addedCount: 0, deletedCount: 0, updatedCount: 0, success: false, error: error.message };
    }
};

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────────────────

/** ID로 단일 파일 + 태그 정보를 조회합니다. */
const getFileWithTagsById = (fileId: number): FileWithTags => {
    const db = getDb();

    const fileRow = db.prepare(`
        SELECT id, filename, relative_path AS relativePath, extension, size,
               created_at AS createdAt, updated_at AS updatedAt
        FROM files WHERE id = ?
    `).get(fileId) as FileRecord;

    const tags = db.prepare(`
        SELECT t.id, t.name, t.color
        FROM file_tags ft
        JOIN tags t ON ft.tag_id = t.id
        WHERE ft.file_id = ?
        ORDER BY t.name
    `).all(fileId) as { id: number; name: string; color: string | null }[];

    return { ...fileRow, tags };
};

/**
 * SortOption을 SQL의 ORDER BY 절로 변환합니다.
 * @param sort - SortOption 객체 (없으면 기본값 'updated_at DESC')
 * @param columnPrefix - 테이블 alias 접두사 (e.g. 'f' for 'f.updated_at')
 * @returns ORDER BY 절 문자열 (e.g. 'updated_at DESC' or 'f.updated_at DESC')
 */
const buildOrderByClause = (sort?: SortOption, columnPrefix?: string): string => {
    const prefix = columnPrefix ? `${columnPrefix}.` : '';
    const columnMap: Record<string, string> = {
        filename: `${prefix}filename`,
        extension: `${prefix}extension`,
        size: `${prefix}size`,
        createdAt: `${prefix}created_at`,
        updatedAt: `${prefix}updated_at`
    };

    if (!sort) {
        return `${prefix}updated_at DESC`;
    }

    const col = columnMap[sort.column] || `${prefix}updated_at`;
    const dir = sort.order === 'asc' ? 'ASC' : 'DESC';
    return `${col} ${dir}`;
};