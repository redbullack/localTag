import Database, { Database as DatabaseType } from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

let db: DatabaseType | null = null;

export const initDb = (): void => {
    if (db) return;

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'localtag.db');

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    createSchema();
};

export const getDb = (): DatabaseType => {
    if (!db) {
        throw new Error("Database has not been initialized. Please set vault path first.");
    }
    return db;
};

const createSchema = () => {
    if (!db) return;

    db.prepare(`
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            extension TEXT,
            size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(relative_path)
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            parent_id INTEGER,
            color TEXT,
            FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE CASCADE,
            UNIQUE(name, parent_id)
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS file_tags (
            file_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (file_id, tag_id),
            FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
    `).run();

    // 마이그레이션: tags 테이블에 sort_order 컬럼 추가
    const columns = db.prepare('PRAGMA table_info(tags)').all() as { name: string }[];
    const hasSortOrder = columns.some((col) => col.name === 'sort_order');
    if (!hasSortOrder) {
        db.prepare('ALTER TABLE tags ADD COLUMN sort_order INTEGER DEFAULT 0').run();
        // 기존 태그에 초기 sort_order 할당: 같은 parent_id 그룹 내에서 name 순으로 0, 1, 2...
        db.prepare(`
            UPDATE tags SET sort_order = (
                SELECT cnt FROM (
                    SELECT id, ROW_NUMBER() OVER (
                        PARTITION BY COALESCE(parent_id, -1)
                        ORDER BY name
                    ) - 1 AS cnt FROM tags
                ) AS sub WHERE sub.id = tags.id
            )
        `).run();
    }

    // 마이그레이션: tags 테이블에 is_favorite 컬럼 추가
    const hasFavorite = columns.some((col) => col.name === 'is_favorite');
    if (!hasFavorite) {
        db.prepare('ALTER TABLE tags ADD COLUMN is_favorite INTEGER DEFAULT 0').run();
    }
};
