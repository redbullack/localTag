import { ipcMain, app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

const isDev = process.env.NODE_ENV === 'development';

/**
 * 자동 업데이트 관련 IPC 핸들러를 등록합니다.
 *
 * IPC 채널 목록:
 * - update:check       | payload: 없음 | return: { available, version, releaseNotes }
 * - update:download    | payload: 없음 | return: void (진행률은 update:download-progress 이벤트)
 * - update:install     | payload: 없음 | return: void (앱 종료 후 설치)
 * - update:get-version | payload: 없음 | return: string (현재 앱 버전)
 *
 * Main → Renderer 이벤트:
 * - update:available          | UpdateInfo 전달
 * - update:download-progress  | ProgressInfo 전달
 * - update:downloaded         | UpdateInfo 전달
 * - update:error              | 에러 메시지 전달
 */
export const registerUpdateHandlers = (): void => {
    // 사용자 수락 후 수동 다운로드
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Main → Renderer 이벤트 전달
    const sendToRenderer = (channel: string, payload?: unknown) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (!win) return;
        win.webContents.send(channel, payload);
    };

    autoUpdater.on('update-available', (info) => {
        sendToRenderer('update:available', {
            version: info.version,
            releaseNotes: info.releaseNotes,
        });
    });

    autoUpdater.on('download-progress', (progress) => {
        sendToRenderer('update:download-progress', {
            percent: progress.percent,
            bytesPerSecond: progress.bytesPerSecond,
            transferred: progress.transferred,
            total: progress.total,
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        sendToRenderer('update:downloaded', {
            version: info.version,
        });
    });

    autoUpdater.on('error', (error) => {
        sendToRenderer('update:error', error.message);
    });

    // IPC 핸들러 등록
    ipcMain.handle('update:check', async () => {
        if (isDev) {
            return { success: true, data: { available: false } };
        }

        try {
            const result = await autoUpdater.checkForUpdates();
            if (!result) {
                return { success: true, data: { available: false } };
            }

            const available = result.updateInfo.version !== app.getVersion();
            return {
                success: true,
                data: {
                    available,
                    version: result.updateInfo.version,
                    releaseNotes: result.updateInfo.releaseNotes,
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update:download', async () => {
        if (isDev) {
            return { success: false, error: '개발 모드에서는 업데이트를 다운로드할 수 없습니다.' };
        }

        try {
            await autoUpdater.downloadUpdate();
            return { success: true, data: null };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update:install', () => {
        autoUpdater.quitAndInstall(false, true);
    });

    ipcMain.handle('update:get-version', () => {
        return { success: true, data: app.getVersion() };
    });
};
