import { ipcMain, dialog } from 'electron';
import { getAutoCollectSettings, setAutoCollectSettings, type AutoCollectSettings } from '../lib/store';
import { downloadWatcher } from '../lib/download-watcher';

/**
 * 자동 수집 관련 IPC 핸들러를 등록합니다.
 *
 * IPC 채널 목록:
 * - collect:get-settings      | payload: 없음                         | return: AutoCollectSettings
 * - collect:update-settings   | payload: Partial<AutoCollectSettings>  | return: AutoCollectSettings
 * - collect:toggle            | payload: { enabled }                   | return: { enabled }
 * - collect:select-watch-folder | payload: 없음                       | return: { folderPath }
 * - collect:get-status        | payload: 없음                         | return: { watching, watchPaths }
 */
export const registerCollectHandlers = (): void => {
    ipcMain.handle('collect:get-settings', () => {
        try {
            return { success: true, data: getAutoCollectSettings() };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('collect:update-settings', async (_event, params: Partial<AutoCollectSettings>) => {
        try {
            const updated = setAutoCollectSettings(params);
            await downloadWatcher.restart();
            return { success: true, data: updated };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('collect:toggle', async (_event, params: { enabled: boolean }) => {
        try {
            setAutoCollectSettings({ enabled: params.enabled });
            if (params.enabled) {
                await downloadWatcher.restart();
            } else {
                downloadWatcher.stop();
            }
            return { success: true, data: { enabled: params.enabled } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('collect:select-watch-folder', async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: '감시할 폴더를 선택하세요',
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: true, data: { folderPath: null } };
            }

            return { success: true, data: { folderPath: result.filePaths[0] } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('collect:get-status', () => {
        try {
            return { success: true, data: downloadWatcher.getStatus() };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
};
