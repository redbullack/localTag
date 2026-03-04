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

export interface IElectronAPI {
    // Vault
    getVaultPath: () => Promise<string | null>;
    selectVaultPath: () => Promise<string | null>;

    // Tag CRUD
    createTag: (params: { name: string; color?: string; parentId?: number }) => Promise<IpcResponse<Tag>>;
    getAllTags: () => Promise<IpcResponse<Tag[]>>;
    updateTag: (params: { id: number; name?: string; color?: string; parentId?: number | null }) => Promise<IpcResponse<Tag>>;
    deleteTag: (params: { id: number }) => Promise<IpcResponse<{ success: boolean }>>;

    // File CRUD
    addFiles: (params?: { tagIds?: number[] }) => Promise<IpcResponse<FileWithTags[]>>;
    getAllFiles: (params?: { page?: number; limit?: number; sort?: { column: string; order: string } }) => Promise<IpcResponse<FileWithTags[]>>;
    getFilesByTags: (params: { tagIds: number[]; page?: number; limit?: number; sort?: { column: string; order: string } }) => Promise<IpcResponse<FileWithTags[]>>;
    renameFile: (params: { id: number; newFilename: string }) => Promise<IpcResponse<FileWithTags>>;
    deleteFile: (params: { id: number }) => Promise<IpcResponse<{ success: boolean }>>;
    updateFileTags: (params: { fileId: number; tagIds: number[] }) => Promise<IpcResponse<FileWithTags>>;
    checkDuplicateFilenames: (params: { filenames: string[] }) => Promise<IpcResponse<{ duplicates: string[] }>>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
