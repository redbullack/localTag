"use strict";

// main/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Vault 관련
  getVaultPath: () => import_electron.ipcRenderer.invoke("get-vault-path"),
  selectVaultPath: () => import_electron.ipcRenderer.invoke("select-vault-path"),
  // Tag CRUD
  createTag: (params) => import_electron.ipcRenderer.invoke("tag:create", params),
  getAllTags: () => import_electron.ipcRenderer.invoke("tag:get-all"),
  updateTag: (params) => import_electron.ipcRenderer.invoke("tag:update", params),
  deleteTag: (params) => import_electron.ipcRenderer.invoke("tag:delete", params)
});
