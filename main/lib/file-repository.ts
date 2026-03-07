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

    let orderBy = 'updated_at DESC';
    if (sort) {
        const columnMap: Record<string, string> = {
            filename: 'filename',
            extension: 'extension',
            size: 'size',
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        };
        const col = columnMap[sort.column] || 'updated_at';
        const dir = sort.order === 'asc' ? 'ASC' : 'DESC';
        orderBy = `${col} ${dir}`;
    }

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
export const getFilesByTagIds = (tagIds: number[], page: number = 1, limit: number = 50, sort?: SortOption): { data: FileWithTags[], totalCount: number } => {
    if (!tagIds || tagIds.length === 0) return { data: [], totalCount: 0 };

    const db = getDb();
    const placeholders = tagIds.map(() => '?').join(',');

    // 전체 개수 조회 쿼리 (재귀 공통 테이블 식 적용)
    const countQuery = `
        WITH RECURSIVE tag_tree AS (
            SELECT id FROM tags WHERE id IN (${placeholders})
            UNION ALL
            SELECT t.id FROM tags t
            INNER JOIN tag_tree tt ON t.parent_id = tt.id
        )
        SELECT COUNT(DISTINCT f.id) as count
        FROM files f
        JOIN file_tags ft ON f.id = ft.file_id
        WHERE ft.tag_id IN (SELECT id FROM tag_tree)
    `;
    const countRow = db.prepare(countQuery).get(...tagIds) as { count: number };
    const totalCount = countRow.count;

    const offset = (page - 1) * limit;

    let orderBy = 'f.updated_at DESC';
    if (sort) {
        const columnMap: Record<string, string> = {
            filename: 'f.filename',
            extension: 'f.extension',
            size: 'f.size',
            createdAt: 'f.created_at',
            updatedAt: 'f.updated_at'
        };
        const col = columnMap[sort.column] || 'f.updated_at';
        const dir = sort.order === 'asc' ? 'ASC' : 'DESC';
        orderBy = `${col} ${dir}`;
    }

    const fileRows = db.prepare(`
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

// ─── 내부 헬퍼 ───────────────────────────────────────

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
