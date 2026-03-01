import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // IPC methods will go here
    hello: () => ipcRenderer.invoke('hello'),
    getVaultPath: () => ipcRenderer.invoke('get-vault-path'),
    selectVaultPath: () => ipcRenderer.invoke('select-vault-path'),
});
