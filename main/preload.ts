import { contextBridge, ipcRenderer, webUtils } from 'electron';

// Main 프로세스에서 additionalArguments로 전달한 초기 테마 값을 읽음
// sandbox 모드에서는 fs/path 등 Node.js 모듈 접근 불가하므로 process.argv 활용
function readInitialSettings(): { theme: string } {
    const themeArg = process.argv.find(arg => arg.startsWith('--initial-theme='));
    const theme = themeArg ? themeArg.split('=')[1] : 'system';
    return { theme };
}

const initialSettings = readInitialSettings();

/**
 * Electron Main ↔ Renderer 간 안전한 통신을 위한 Context Bridge
 *
 * IPC 채널 목록:
 * - Vault:  get-vault-path, select-vault-path, vault:get-storage-info, vault:relocate
 * - Tag:    tag:create, tag:get-all, tag:update, tag:delete, tag:reorder
 * - File:   file:add, file:get-all, file:get-by-tags, file:rename, file:delete, file:update-tags, file:bulk-set-tags, file:check-duplicate
 * - Config: config:get-settings, config:get, config:set
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // Vault 관련
    getVaultPath: () => ipcRenderer.invoke('get-vault-path'),
    selectVaultPath: () => ipcRenderer.invoke('select-vault-path'),
    getStorageInfo: () => ipcRenderer.invoke('vault:get-storage-info'),
    relocateVault: () => ipcRenderer.invoke('vault:relocate'),
    onVaultRelocateProgress: (callback: (progress: { current: number; total: number; currentFile: string }) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, progress: { current: number; total: number; currentFile: string }) => callback(progress);
        ipcRenderer.on('vault:relocate-progress', handler);
        return () => { ipcRenderer.removeListener('vault:relocate-progress', handler); };
    },
    onFileOperationProgress: (callback: (progress: { operationType: string; currentFile?: string; currentIndex: number; totalCount: number; bytesTransferred?: number; totalBytes?: number }) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, progress: { operationType: string; currentFile?: string; currentIndex: number; totalCount: number; bytesTransferred?: number; totalBytes?: number }) => callback(progress);
        ipcRenderer.on('file:operation-progress', handler);
        return () => { ipcRenderer.removeListener('file:operation-progress', handler); };
    },

    // Tag CRUD
    createTag: (params: { name: string; color?: string; parentId?: number }) =>
        ipcRenderer.invoke('tag:create', params),
    getAllTags: () =>
        ipcRenderer.invoke('tag:get-all'),
    updateTag: (params: { id: number; name?: string; color?: string; parentId?: number | null }) =>
        ipcRenderer.invoke('tag:update', params),
    deleteTag: (params: { id: number }) =>
        ipcRenderer.invoke('tag:delete', params),
    reorderTags: (params: { parentId: number | null; orderedIds: number[] }) =>
        ipcRenderer.invoke('tag:reorder', params),

    // File CRUD
    selectFiles: () =>
        ipcRenderer.invoke('file:select'),
    addFiles: (params?: { tagIds?: number[]; filePaths?: string[] }) =>
        ipcRenderer.invoke('file:add', params),
    getAllFiles: (params?: { page?: number; limit?: number; sort?: { column: string; order: string }; searchKeyword?: string }) =>
        ipcRenderer.invoke('file:get-all', params),
    getFilesByTags: (params: { tagIds: number[]; page?: number; limit?: number; sort?: { column: string; order: string }; includeUntagged?: boolean; searchKeyword?: string }) =>
        ipcRenderer.invoke('file:get-by-tags', params),
    renameFile: (params: { id: number; newFilename: string }) =>
        ipcRenderer.invoke('file:rename', params),
    deleteFile: (params: { id: number }) =>
        ipcRenderer.invoke('file:delete', params),
    deleteFilesBatch: (params: { ids: number[] }) =>
        ipcRenderer.invoke('file:delete-batch', params),
    updateFileTags: (params: { fileId: number; tagIds: number[] }) =>
        ipcRenderer.invoke('file:update-tags', params),
    bulkSetFileTags: (params: { fileIds: number[]; tagIds: number[] }) =>
        ipcRenderer.invoke('file:bulk-set-tags', params),
    checkDuplicateFilenames: (params: { filenames: string[] }) =>
        ipcRenderer.invoke('file:check-duplicate', params),
    getTotalFileCount: () =>
        ipcRenderer.invoke('file:get-total-count'),
    getUntaggedFileCount: () =>
        ipcRenderer.invoke('file:get-untagged-count'),
    getUntaggedFiles: (params?: { page?: number; limit?: number; sort?: { column: string; order: string }; searchKeyword?: string }) =>
        ipcRenderer.invoke('file:get-untagged', params),
    syncFiles: () =>
        ipcRenderer.invoke('file:sync'),
    openFile: (params: { filename: string }) =>
        ipcRenderer.invoke('file:open', params),
    showFileInExplorer: (params: { filename: string }) =>
        ipcRenderer.invoke('file:show-in-explorer', params),
    moveFilesToFolder: (params: { files: { id: number; filename: string }[] }) =>
        ipcRenderer.invoke('file:move-to-folder', params),
    copyFilesToFolder: (params: { files: { id: number; filename: string }[] }) =>
        ipcRenderer.invoke('file:copy-to-folder', params),
    getPathForFile: (file: File) => webUtils.getPathForFile(file),

    // Config
    getSettings: () => ipcRenderer.invoke('config:get-settings'),
    getConfig: (params: { key: string }) => ipcRenderer.invoke('config:get', params),
    setConfig: (params: { key: string; value: any }) => ipcRenderer.invoke('config:set', params),
});

// 동기적 초기 설정값 — layout.tsx 인라인 스크립트에서 FOUC 방지용으로 참조
contextBridge.exposeInMainWorld('__initialSettings', initialSettings);
