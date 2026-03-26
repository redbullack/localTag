/** IPC 응답 공통 래퍼 */
export interface IpcResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    duplicates?: string[];
    totalCount?: number;
}

/** Tag 데이터 인터페이스 */
export interface Tag {
    id: number;
    name: string;
    parentId: number | null;
    color: string | null;
    isFavorite?: boolean;
}

/** 파일 레코드 */
export interface FileRecord {
    id: number;
    filename: string;
    relativePath: string;
    extension: string | null;
    size: number | null;
    createdAt: string;
    updatedAt: string;
}

/** 파일 + 연결된 태그 목록 */
export interface FileWithTags extends FileRecord {
    tags: Tag[];
}

/** 저장 용량 정보 */
export interface StorageInfo {
    vaultSize: number;
    vaultFileCount: number;
    driveTotal: number;
    driveFree: number;
    driveUsed: number;
}

/** Vault 이동 진행률 */
export interface RelocateProgress {
    current: number;
    total: number;
    currentFile: string;
}

/** 파일 작업 진행률 */
export interface FileOperationProgress {
    operationType: 'add' | 'delete' | 'move' | 'copy' | 'sync';
    currentFile?: string;
    currentIndex: number;
    totalCount: number;
    bytesTransferred?: number;
    totalBytes?: number;
}

export interface IElectronAPI {
    // Vault
    getVaultPath: () => Promise<string | null>;
    selectVaultPath: () => Promise<string | null>;
    getStorageInfo: () => Promise<IpcResponse<StorageInfo>>;
    relocateVault: () => Promise<IpcResponse<{ newVaultPath: string; movedFileCount: number }>>;
    onVaultRelocateProgress: (callback: (progress: RelocateProgress) => void) => () => void;
    onFileOperationProgress: (callback: (progress: FileOperationProgress) => void) => () => void;

    // Tag CRUD
    createTag: (params: { name: string; color?: string; parentId?: number }) => Promise<IpcResponse<Tag>>;
    getAllTags: () => Promise<IpcResponse<Tag[]>>;
    updateTag: (params: { id: number; name?: string; color?: string; parentId?: number | null; isFavorite?: boolean }) => Promise<IpcResponse<Tag>>;
    deleteTag: (params: { id: number }) => Promise<IpcResponse<{ success: boolean }>>;
    reorderTags: (params: { parentId: number | null; orderedIds: number[] }) => Promise<IpcResponse<void>>;

    // File CRUD
    selectFiles: () => Promise<IpcResponse<{ filePaths: string[] }>>;
    selectFolder: (params?: { title?: string }) => Promise<IpcResponse<{ folderPath: string | null }>>;
    addFiles: (params?: { tagIds?: number[]; filePaths?: string[] }) => Promise<IpcResponse<FileWithTags[]>>;
    getAllFiles: (params?: { page?: number; limit?: number; sort?: { column: string; order: string }; searchKeyword?: string }) => Promise<IpcResponse<FileWithTags[]>>;
    getFilesByTags: (params: { tagIds: number[]; page?: number; limit?: number; sort?: { column: string; order: string }; includeUntagged?: boolean; searchKeyword?: string }) => Promise<IpcResponse<FileWithTags[]>>;
    renameFile: (params: { id: number; newFilename: string }) => Promise<IpcResponse<FileWithTags>>;
    deleteFile: (params: { id: number }) => Promise<IpcResponse<{ success: boolean }>>;
    deleteFilesBatch: (params: { ids: number[] }) => Promise<IpcResponse<{ deletedCount: number }>>;
    updateFileTags: (params: { fileId: number; tagIds: number[] }) => Promise<IpcResponse<FileWithTags>>;
    bulkSetFileTags: (params: { fileIds: number[]; tagIds: number[] }) => Promise<IpcResponse<{ updatedCount: number }>>;
    checkDuplicateFilenames: (params: { filenames: string[] }) => Promise<IpcResponse<{ duplicates: string[] }>>;
    getTotalFileCount: () => Promise<IpcResponse<number>>;
    getUntaggedFileCount: () => Promise<IpcResponse<number>>;
    getUntaggedFiles: (params?: { page?: number; limit?: number; sort?: { column: string; order: string }; searchKeyword?: string }) => Promise<IpcResponse<FileWithTags[]>>;
    syncFiles: (params?: { silent?: boolean }) => Promise<IpcResponse<{ addedCount: number; deletedCount: number; updatedCount: number; detectedFolderCount: number }>>;
    isFileOperating: () => Promise<IpcResponse<boolean>>;
    openFile: (params: { filename: string }) => Promise<IpcResponse<void>>;
    showFileInExplorer: (params: { filename: string }) => Promise<IpcResponse<void>>;
    moveFilesToFolder: (params: { files: { id: number; filename: string }[]; targetDir?: string }) => Promise<IpcResponse<{ movedCount: number; errors: string[] }>>;
    copyFilesToFolder: (params: { files: { id: number; filename: string }[]; targetDir?: string }) => Promise<IpcResponse<{ copiedCount: number; errors: string[] }>>;
    getPathForFile: (file: File) => string;

    // Config
    getSettings: () => Promise<IpcResponse<AppSettings>>;
    getConfig: (params: { key: string }) => Promise<IpcResponse<any>>;
    setConfig: (params: { key: string; value: any }) => Promise<IpcResponse<null>>;

    // Auto-Collect
    getAutoCollectSettings: () => Promise<IpcResponse<AutoCollectSettings>>;
    updateAutoCollectSettings: (params: Partial<AutoCollectSettings>) => Promise<IpcResponse<AutoCollectSettings>>;
    toggleAutoCollect: (params: { enabled: boolean }) => Promise<IpcResponse<{ enabled: boolean }>>;
    selectWatchFolder: () => Promise<IpcResponse<{ folderPath: string | null }>>;
    getAutoCollectStatus: () => Promise<IpcResponse<{ watching: boolean; watchPaths: string[] }>>;
    onFileCollected: (callback: (event: FileCollectedEvent) => void) => () => void;

    // Update
    checkForUpdate: () => Promise<IpcResponse<UpdateCheckResult>>;
    downloadUpdate: () => Promise<IpcResponse<null>>;
    installUpdate: () => Promise<void>;
    getAppVersion: () => Promise<IpcResponse<string>>;
    onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string }) => void) => () => void;
    onUpdateDownloadProgress: (callback: (progress: UpdateDownloadProgress) => void) => () => void;
    onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
    onUpdateError: (callback: (message: string) => void) => () => void;
}

/** 업데이트 확인 결과 */
export interface UpdateCheckResult {
    available: boolean;
    version?: string;
    releaseNotes?: string;
}

/** 다운로드 진행률 */
export interface UpdateDownloadProgress {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
}

/** 앱 설정 타입 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 자동 수집 설정 */
export interface AutoCollectSettings {
    enabled: boolean;
    watchPaths: string[];
    defaultTagIds: number[];
    stabilityDelayMs: number;
}

/** 자동 수집 파일 알림 이벤트 */
export interface FileCollectedEvent {
    filename: string;
    tagNames: string[];
    skipped?: boolean;
    error?: string;
}

export interface AppSettings {
    theme: ThemeMode;
    autoStart: boolean;
    autoCollect: AutoCollectSettings;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
        __initialSettings: AppSettings;
    }
}
