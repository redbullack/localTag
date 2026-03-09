import { ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { getVaultPath } from '../lib/store';
import {
    addFile,
    bulkSetFileTags,
    getAllFiles,
    getFilesByTagIds,
    renameFile,
    deleteFile,
    updateFileTags,
    checkDuplicateFilenames,
    getTotalFileCount,
    syncVault,
    SortOption,
} from '../lib/file-repository';

// 동기화 중복 실행 방지 플래그
let isSyncing = false;

/**
 * 파일 관련 IPC 핸들러를 등록합니다.
 *
 * IPC 채널 목록:
 * - file:add             | payload: { tagIds? }                  | OS 파일 선택 다이얼로그 → FileWithTags[]
 * - file:get-all         | payload: { page?, limit? }          | return: { data: FileWithTags[], totalCount: number }
 * - file:get-by-tag      | payload: { tagIds, page?, limit? }  | return: { data: FileWithTags[], totalCount: number }
 * - file:rename          | payload: { id, newFilename }          | return: FileWithTags
 * - file:delete          | payload: { id }                       | return: { success }
 * - file:update-tags     | payload: { fileId, tagIds }           | return: FileWithTags
 * - file:bulk-set-tags   | payload: { fileIds, tagIds }          | return: { updatedCount }
 * - file:check-duplicate | payload: { filenames }                | return: { duplicates }
 * - file:get-total-count | payload: 없음                          | return: { data: number }
 * - file:sync            | payload: 없음                          | return: { success, data: { addedCount, deletedCount, updatedCount } }
 * - file:open            | payload: { filename }                  | return: { success, error? }
 */
export const registerFileHandlers = (): void => {

    ipcMain.handle('file:select', async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openFile', 'multiSelections'],
                title: '추가할 파일 선택',
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: true, data: { filePaths: [] } };
            }

            return { success: true, data: { filePaths: result.filePaths } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:add', async (_event, params: { tagIds?: number[]; filePaths?: string[] }) => {
        try {
            let filePathsToProcess: string[] = [];

            if (params?.filePaths && params.filePaths.length > 0) {
                filePathsToProcess = params.filePaths;
            } else {
                const result = await dialog.showOpenDialog({
                    properties: ['openFile', 'multiSelections'],
                    title: '추가할 파일 선택',
                });

                if (result.canceled || result.filePaths.length === 0) {
                    return { success: true, data: [] };
                }
                filePathsToProcess = result.filePaths;
            }

            // 중복 파일명 체크
            const filenames = filePathsToProcess.map(
                (filePath) => require('path').basename(filePath)
            );
            const duplicates = checkDuplicateFilenames(filenames);

            if (duplicates.length > 0) {
                return {
                    success: false,
                    error: `다음 파일명이 이미 존재합니다: ${duplicates.join(', ')}`,
                    duplicates,
                };
            }

            const addedFiles = filePathsToProcess.map((sourcePath) =>
                addFile({ sourcePath, tagIds: params?.tagIds })
            );

            return { success: true, data: addedFiles };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:get-all', (_event, params?: { page?: number; limit?: number; sort?: SortOption }) => {
        try {
            const page = params?.page || 1;
            const limit = params?.limit || 50;
            const sort = params?.sort;
            const result = getAllFiles(page, limit, sort);
            return { success: true, ...result }; // { success: true, data, totalCount }
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:get-by-tags', (_event, params: { tagIds: number[]; page?: number; limit?: number; sort?: SortOption }) => {
        try {
            const page = params.page || 1;
            const limit = params.limit || 50;
            const sort = params.sort;
            const result = getFilesByTagIds(params.tagIds, page, limit, sort);
            return { success: true, ...result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:rename', (_event, params: { id: number; newFilename: string }) => {
        try {
            return { success: true, data: renameFile(params.id, params.newFilename) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:delete', (_event, params: { id: number }) => {
        try {
            return { success: true, data: deleteFile(params.id) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:update-tags', (_event, params: { fileId: number; tagIds: number[] }) => {
        try {
            return { success: true, data: updateFileTags(params.fileId, params.tagIds) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:bulk-set-tags', (_event, params: { fileIds: number[]; tagIds: number[] }) => {
        try {
            return { success: true, data: bulkSetFileTags(params.fileIds, params.tagIds) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:check-duplicate', (_event, params: { filenames: string[] }) => {
        try {
            const duplicates = checkDuplicateFilenames(params.filenames);
            return { success: true, data: { duplicates } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:get-total-count', () => {
        try {
            const result = getTotalFileCount();
            return { success: true, data: result.count };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:sync', async () => {
        if (isSyncing) {
            return { success: false, error: '현재 동기화가 진행 중입니다.' };
        }

        isSyncing = true;
        try {
            const result = syncVault();
            if (!result.success) {
                return { success: false, error: result.error };
            }
            return {
                success: true,
                data: {
                    addedCount: result.addedCount,
                    deletedCount: result.deletedCount,
                    updatedCount: result.updatedCount
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        } finally {
            isSyncing = false;
        }
    });

    ipcMain.handle('file:open', async (_event, params: { filename: string }) => {
        try {
            const vaultPath = getVaultPath();
            if (!vaultPath) {
                return { success: false, error: 'Vault 경로가 설정되지 않았습니다.' };
            }

            const fullPath = path.join(vaultPath, params.filename);
            const errorMessage = await shell.openPath(fullPath);

            if (errorMessage) {
                return { success: false, error: `파일을 여는 데 실패했습니다: ${errorMessage}` };
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
};
