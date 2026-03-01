export interface IElectronAPI {
    hello: () => Promise<string>;
    getVaultPath: () => Promise<string | null>;
    selectVaultPath: () => Promise<string | null>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
