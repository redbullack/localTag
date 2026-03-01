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
};
