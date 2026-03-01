import { contextBridge, ipcRenderer } from 'electron';

/**
 * Electron Main ↔ Renderer 간 안전한 통신을 위한 Context Bridge
 *
 * IPC 채널 목록:
 * - Vault: get-vault-path, select-vault-path
 * - Tag:   tag:create, tag:get-all, tag:update, tag:delete
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
});
