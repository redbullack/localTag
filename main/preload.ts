import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // IPC methods will go here
    hello: () => ipcRenderer.invoke('hello'),
});
