import { ipcMain } from 'electron';
import {
    createTag,
    getAllTags,
    updateTag,
    deleteTag,
    reorderTags,
} from '../lib/tag-repository';

/**
 * 태그 관련 IPC 핸들러를 등록합니다.
 *
 * IPC 채널 목록:
 * - tag:create   | payload: { name, color?, parentId? }  | return: Tag
 * - tag:get-all  | payload: 없음                          | return: Tag[]
 * - tag:update   | payload: { id, name?, color?, parentId? } | return: Tag
 * - tag:delete   | payload: { id }                        | return: { success }
 * - tag:reorder  | payload: { parentId, orderedIds }      | return: { success }
 */
export const registerTagHandlers = (): void => {
    ipcMain.handle('tag:create', (_event, params: { name: string; color?: string; parentId?: number }) => {
        try {
            return { success: true, data: createTag(params) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('tag:get-all', () => {
        try {
            return { success: true, data: getAllTags() };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('tag:update', (_event, params: { id: number; name?: string; color?: string; parentId?: number | null; isFavorite?: boolean }) => {
        try {
            return { success: true, data: updateTag(params) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('tag:delete', (_event, params: { id: number }) => {
        try {
            return { success: true, data: deleteTag(params.id) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('tag:reorder', (_event, params: { parentId: number | null; orderedIds: number[] }) => {
        try {
            reorderTags(params);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
};
