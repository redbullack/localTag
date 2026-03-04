import { contextBridge, ipcRenderer } from 'electron';

/**
 * Electron Main ↔ Renderer 간 안전한 통신을 위한 Context Bridge
 *
 * IPC 채널 목록:
 * - Vault: get-vault-path, select-vault-path
 * - Tag:   tag:create, tag:get-all, tag:update, tag:delete
 * - File:  file:add, file:get-all, file:get-by-tags, file:rename, file:delete, file:update-tags, file:check-duplicate
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // Vault 관련
    getVaultPath: () => ipcRenderer.invoke('get-vault-path'),
    selectVaultPath: () => ipcRenderer.invoke('select-vault-path'),

    // Tag CRUD
    createTag: (params: { name: string; color?: string; parentId?: number }) =>
        ipcRenderer.invoke('tag:create', params),
    getAllTags: () =>
        ipcRenderer.invoke('tag:get-all'),
    updateTag: (params: { id: number; name?: string; color?: string; parentId?: number | null }) =>
        ipcRenderer.invoke('tag:update', params),
    deleteTag: (params: { id: number }) =>
        ipcRenderer.invoke('tag:delete', params),

    // File CRUD
    addFiles: (params?: { tagIds?: number[] }) =>
        ipcRenderer.invoke('file:add', params),
    getAllFiles: () =>
        ipcRenderer.invoke('file:get-all'),
    getFilesByTags: (params: { tagIds: number[] }) =>
        ipcRenderer.invoke('file:get-by-tags', params),
    renameFile: (params: { id: number; newFilename: string }) =>
        ipcRenderer.invoke('file:rename', params),
    deleteFile: (params: { id: number }) =>
        ipcRenderer.invoke('file:delete', params),
    updateFileTags: (params: { fileId: number; tagIds: number[] }) =>
        ipcRenderer.invoke('file:update-tags', params),
    checkDuplicateFilenames: (params: { filenames: string[] }) =>
        ipcRenderer.invoke('file:check-duplicate', params),
});
