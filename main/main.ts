import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getVaultPath, setVaultPath, getTheme, setTheme } from './lib/store';
import { initDb } from './lib/db';
import { registerTagHandlers } from './ipc/tag-handler';
import { registerFileHandlers } from './ipc/file-handler';
import { registerVaultHandlers } from './ipc/vault-handler';

const VAULT_FOLDER_NAME = 'MyTaggedFiles';
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

    registerTagHandlers();
    registerFileHandlers();
    registerVaultHandlers();

    ipcMain.handle('get-vault-path', () => {
        return getVaultPath();
    });

    ipcMain.handle('config:get-theme', () => {
        return getTheme();
    });

    ipcMain.handle('config:set-theme', (_event, theme: string) => {
        if (theme === 'light' || theme === 'dark' || theme === 'system') {
            setTheme(theme);
            return { success: true };
        }
        return { success: false, error: 'Invalid theme value' };
    });

    ipcMain.handle('select-vault-path', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Vault Location',
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const selectedLocation = result.filePaths[0];
            const vaultPath = path.join(selectedLocation, VAULT_FOLDER_NAME);

            fs.mkdirSync(vaultPath, { recursive: true });
            setVaultPath(vaultPath);
            initDb();
            return vaultPath;
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
