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
var import_electron2 = require("electron");
var path2 = __toESM(require("path"));

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

// main/main.ts
var isDev = process.env.NODE_ENV === "development";
function createWindow() {
  const win = new import_electron2.BrowserWindow({
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
import_electron2.app.whenReady().then(() => {
  const currentVaultPath = getVaultPath();
  if (currentVaultPath) {
    initDb();
  }
  import_electron2.ipcMain.handle("get-vault-path", () => {
    return getVaultPath();
  });
  import_electron2.ipcMain.handle("select-vault-path", async () => {
    const result = await import_electron2.dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Vault Folder"
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      setVaultPath(selectedPath);
      initDb();
      return selectedPath;
    }
    return null;
  });
  createWindow();
  import_electron2.app.on("activate", () => {
    if (import_electron2.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron2.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron2.app.quit();
  }
});
