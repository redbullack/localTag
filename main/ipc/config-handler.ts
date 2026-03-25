import { ipcMain, app } from 'electron';
import { getSettings, getSetting, setSetting, type AppSettings } from '../lib/store';

const isDev = process.env.NODE_ENV === 'development';

/**
 * 앱 설정 관련 IPC 핸들러를 등록합니다.
 *
 * IPC 채널 목록:
 * - config:get-settings | payload: 없음              | return: AppSettings
 * - config:get          | payload: { key }            | return: AppSettings[key]
 * - config:set          | payload: { key, value }     | return: null
 */
export const registerConfigHandlers = (): void => {
    ipcMain.handle('config:get-settings', () => {
        try {
            return { success: true, data: getSettings() };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('config:get', (_event, params: { key: keyof AppSettings }) => {
        try {
            return { success: true, data: getSetting(params.key) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('config:set', (_event, params: { key: keyof AppSettings; value: any }) => {
        try {
            setSetting(params.key, params.value);

            if (params.key === 'autoStart' && !isDev) {
                app.setLoginItemSettings({
                    openAtLogin: params.value as boolean,
                });
            }

            return { success: true, data: null };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
};
