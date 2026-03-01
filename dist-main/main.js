"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// main/main.ts
var import_electron3 = require("electron");
var path2 = __toESM(require("path"));
var fs = __toESM(require("fs"));

// main/lib/store.ts
var import_electron_store = __toESM(require("electron-store"));
var store = new import_electron_store.default({
  defaults: {
    vaultPath: null
  }
});
var getVaultPath = () => {
  return store.get("vaultPath");
};
var setVaultPath = (vaultPath) => {
  store.set("vaultPath", vaultPath);
};

// main/lib/db.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var path = __toESM(require("path"));
var import_electron = require("electron");
var db = null;
var initDb = () => {
  if (db) return;
  const userDataPath = import_electron.app.getPath("userData");
  const dbPath = path.join(userDataPath, "localtag.db");
  db = new import_better_sqlite3.default(dbPath);
  db.pragma("journal_mode = WAL");
  createSchema();
};
var getDb = () => {
  if (!db) {
    throw new Error("Database has not been initialized. Please set vault path first.");
  }
  return db;
};
var createSchema = () => {
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

// main/ipc/tag-handler.ts
var import_electron2 = require("electron");

// main/lib/tag-repository.ts
var createTag = (params) => {
  const db2 = getDb();
  const { name, color = null, parentId = null } = params;
  const stmt = db2.prepare(`
        INSERT INTO tags (name, color, parent_id)
        VALUES (?, ?, ?)
    `);
  const result = stmt.run(name, color, parentId);
  return {
    id: result.lastInsertRowid,
    name,
    parentId,
    color
  };
};
var getAllTags = () => {
  const db2 = getDb();
  const stmt = db2.prepare(`
        SELECT id, name, parent_id AS parentId, color
        FROM tags
        ORDER BY parent_id IS NOT NULL, parent_id, name
    `);
  return stmt.all();
};
var updateTag = (params) => {
  const db2 = getDb();
  const { id, name, color, parentId } = params;
  const currentTag = db2.prepare("SELECT * FROM tags WHERE id = ?").get(id);
  if (!currentTag) {
    throw new Error(`Tag with id ${id} not found.`);
  }
  const updatedName = name !== void 0 ? name : currentTag.name;
  const updatedColor = color !== void 0 ? color : currentTag.color;
  const updatedParentId = parentId !== void 0 ? parentId : currentTag.parent_id;
  db2.prepare(`
        UPDATE tags
        SET name = ?, color = ?, parent_id = ?
        WHERE id = ?
    `).run(updatedName, updatedColor, updatedParentId, id);
  return {
    id,
    name: updatedName,
    parentId: updatedParentId,
    color: updatedColor
  };
};
var deleteTag = (id) => {
  const db2 = getDb();
  db2.pragma("foreign_keys = ON");
  const result = db2.prepare("DELETE FROM tags WHERE id = ?").run(id);
  return { success: result.changes > 0 };
};

// main/ipc/tag-handler.ts
var registerTagHandlers = () => {
  import_electron2.ipcMain.handle("tag:create", (_event, params) => {
    try {
      return { success: true, data: createTag(params) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron2.ipcMain.handle("tag:get-all", () => {
    try {
      return { success: true, data: getAllTags() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron2.ipcMain.handle("tag:update", (_event, params) => {
    try {
      return { success: true, data: updateTag(params) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron2.ipcMain.handle("tag:delete", (_event, params) => {
    try {
      return { success: true, data: deleteTag(params.id) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
};

// main/main.ts
var VAULT_FOLDER_NAME = "MyTaggedFiles";
var isDev = process.env.NODE_ENV === "development";
function createWindow() {
  const win = new import_electron3.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path2.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (isDev) {
    win.loadURL("http://localhost:3123");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path2.join(__dirname, "../renderer/out/index.html"));
  }
}
import_electron3.app.whenReady().then(() => {
  const currentVaultPath = getVaultPath();
  if (currentVaultPath) {
    initDb();
  }
  registerTagHandlers();
  import_electron3.ipcMain.handle("get-vault-path", () => {
    return getVaultPath();
  });
  import_electron3.ipcMain.handle("select-vault-path", async () => {
    const result = await import_electron3.dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Vault Location"
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedLocation = result.filePaths[0];
      const vaultPath = path2.join(selectedLocation, VAULT_FOLDER_NAME);
      fs.mkdirSync(vaultPath, { recursive: true });
      setVaultPath(vaultPath);
      initDb();
      return vaultPath;
    }
    return null;
  });
  createWindow();
  import_electron3.app.on("activate", () => {
    if (import_electron3.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron3.app.quit();
  }
});
