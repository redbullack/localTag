/** IPC 응답 공통 래퍼 */
export interface IpcResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/** Tag 데이터 인터페이스 */
export interface Tag {
    id: number;
    name: string;
    parentId: number | null;
    color: string | null;
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
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
