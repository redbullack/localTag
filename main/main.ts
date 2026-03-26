import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getVaultPath, setVaultPath, getSettings, getAutoCollectSettings } from './lib/store';
import { initDb } from './lib/db';
import { registerTagHandlers } from './ipc/tag-handler';
import { registerFileHandlers } from './ipc/file-handler';
import { registerVaultHandlers } from './ipc/vault-handler';
import { registerConfigHandlers } from './ipc/config-handler';
import { registerUpdateHandlers } from './ipc/update-handler';
import { registerCollectHandlers } from './ipc/collect-handler';
import { downloadWatcher } from './lib/download-watcher';

const VAULT_FOLDER_NAME = 'MyTaggedFiles';
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    // preload에서 FOUC 방지를 위해 테마 설정값을 동기적으로 전달
    const currentTheme = getSettings().theme || 'system';

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            additionalArguments: [`--initial-theme=${currentTheme}`],
        },
    });

    if (isDev) {
        win.loadURL('http://localhost:3456');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../renderer/out/index.html'));
    }
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
    const currentVaultPath = getVaultPath();
    if (currentVaultPath) {
        initDb();
    }

    // 프로덕션 빌드에서만 자동 시작 설정 적용
    if (!isDev) {
        const autoStart = getSettings().autoStart;
        app.setLoginItemSettings({ openAtLogin: autoStart });
    }

    registerTagHandlers();
    registerFileHandlers();
    registerVaultHandlers();
    registerConfigHandlers();
    registerUpdateHandlers();
    registerCollectHandlers();

    ipcMain.handle('get-vault-path', () => {
        return getVaultPath();
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

    // 자동 수집 watcher 초기화 (Vault + DB 준비 완료 후)
    if (currentVaultPath && getAutoCollectSettings().enabled) {
        downloadWatcher.start().catch((error) => {
            console.error('[Main] 자동 수집 watcher 시작 실패:', error);
        });
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('before-quit', () => {
    downloadWatcher.stop();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
