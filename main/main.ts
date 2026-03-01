import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { getVaultPath, setVaultPath } from './lib/store';
import { initDb } from './lib/db';

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (isDev) {
        win.loadURL('http://localhost:3123');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../renderer/out/index.html'));
    }
}

app.whenReady().then(() => {
    const currentVaultPath = getVaultPath();
    if (currentVaultPath) {
        initDb();
    }

    ipcMain.handle('get-vault-path', () => {
        return getVaultPath();
    });

    ipcMain.handle('select-vault-path', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Vault Folder',
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const selectedPath = result.filePaths[0];
            setVaultPath(selectedPath);
            initDb();
            return selectedPath;
        }
        return null;
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
