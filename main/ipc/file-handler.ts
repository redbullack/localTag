import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getVaultPath } from '../lib/store';
import {
    addFile,
    bulkSetFileTags,
    deleteFileRecordOnly,
    getAllFiles,
    getFilesByTagIds,
    renameFile,
    deleteFile,
    updateFileTags,
    checkDuplicateFilenames,
    getTotalFileCount,
    getUntaggedFileCount,
    getUntaggedFiles,
    syncVault,
    SortOption,
} from '../lib/file-repository';
import { copyFileWithProgress } from '../lib/file-copy-stream';

// 동기화 중복 실행 방지 플래그
let isSyncing = false;

/** 진행률 전송용 BrowserWindow를 가져온다. 포커스가 없어도 동작하도록 fallback 처리. */
const getMainWindow = (): BrowserWindow | null =>
    BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;

/** Main → Renderer로 파일 작업 진행률을 전송한다. */
const sendProgress = (progress: {
    operationType: 'add' | 'delete' | 'move' | 'copy' | 'sync';
    currentFile?: string;
    currentIndex: number;
    totalCount: number;
    bytesTransferred?: number;
    totalBytes?: number;
}) => {
    getMainWindow()?.webContents.send('file:operation-progress', progress);
};

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

            const totalCount = filePathsToProcess.length;
            const addedFiles = [];

            for (let i = 0; i < totalCount; i++) {
                const sourcePath = filePathsToProcess[i];
                sendProgress({
                    operationType: 'add',
                    currentFile: path.basename(sourcePath),
                    currentIndex: i + 1,
                    totalCount,
                });

                const file = await addFile({
                    sourcePath,
                    tagIds: params?.tagIds,
                    onProgress: (bytesTransferred, totalBytes) => {
                        sendProgress({
                            operationType: 'add',
                            currentFile: path.basename(sourcePath),
                            currentIndex: i + 1,
                            totalCount,
                            bytesTransferred,
                            totalBytes,
                        });
                    },
                });
                addedFiles.push(file);
            }

            return { success: true, data: addedFiles };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:get-all', (_event, params?: { page?: number; limit?: number; sort?: SortOption; searchKeyword?: string }) => {
        try {
            const page = params?.page || 1;
            const limit = params?.limit || 50;
            const sort = params?.sort;
            const searchKeyword = params?.searchKeyword;
            const result = getAllFiles(page, limit, sort, searchKeyword);
            return { success: true, ...result }; // { success: true, data, totalCount }
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:get-by-tags', (_event, params: { tagIds: number[]; page?: number; limit?: number; sort?: SortOption; includeUntagged?: boolean; searchKeyword?: string }) => {
        try {
            const page = params.page || 1;
            const limit = params.limit || 50;
            const sort = params.sort;
            const includeUntagged = params.includeUntagged ?? false;
            const searchKeyword = params.searchKeyword;
            const result = getFilesByTagIds(params.tagIds, page, limit, sort, includeUntagged, searchKeyword);
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

    ipcMain.handle('file:get-untagged-count', () => {
        try {
            const result = getUntaggedFileCount();
            return { success: true, data: result.count };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:get-untagged', (_event, params?: { page?: number; limit?: number; sort?: SortOption; searchKeyword?: string }) => {
        try {
            const page = params?.page || 1;
            const limit = params?.limit || 50;
            const sort = params?.sort;
            const searchKeyword = params?.searchKeyword;
            const result = getUntaggedFiles(page, limit, sort, searchKeyword);
            return { success: true, ...result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:sync', async () => {
        if (isSyncing) {
            return { success: false, error: '현재 동기화가 진행 중입니다.' };
        }

        isSyncing = true;
        sendProgress({ operationType: 'sync', currentIndex: 0, totalCount: 0 });
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
                    updatedCount: result.updatedCount,
                    detectedFolderCount: result.detectedFolderCount
                }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        } finally {
            isSyncing = false;
        }
    });

    ipcMain.handle('file:delete-batch', async (_event, params: { ids: number[] }) => {
        try {
            const totalCount = params.ids.length;
            let deletedCount = 0;

            for (let i = 0; i < totalCount; i++) {
                sendProgress({
                    operationType: 'delete',
                    currentIndex: i + 1,
                    totalCount,
                });
                deleteFile(params.ids[i]);
                deletedCount++;
            }

            return { success: true, data: { deletedCount } };
        } catch (error: any) {
            return { success: false, error: error.message };
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

    ipcMain.handle('file:show-in-explorer', (_event, params: { filename: string }) => {
        try {
            const vaultPath = getVaultPath();
            if (!vaultPath) {
                return { success: false, error: 'Vault 경로가 설정되지 않았습니다.' };
            }

            const fullPath = path.join(vaultPath, params.filename);
            shell.showItemInFolder(fullPath);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:move-to-folder', async (_event, params: { files: { id: number; filename: string }[] }) => {
        try {
            const vaultPath = getVaultPath();
            if (!vaultPath) {
                return { success: false, error: 'Vault 경로가 설정되지 않았습니다.' };
            }

            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: '파일을 이동할 폴더 선택',
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: true, data: { movedCount: 0, errors: [] } };
            }

            const targetDir = result.filePaths[0];
            const errors: string[] = [];
            let movedCount = 0;
            const totalCount = params.files.length;

            for (let i = 0; i < totalCount; i++) {
                const file = params.files[i];
                const sourcePath = path.join(vaultPath, file.filename);
                const targetPath = path.join(targetDir, file.filename);

                sendProgress({
                    operationType: 'move',
                    currentFile: file.filename,
                    currentIndex: i + 1,
                    totalCount,
                });

                try {
                    if (fs.existsSync(targetPath)) {
                        errors.push(`${file.filename}: 대상 폴더에 동일한 파일이 이미 존재합니다.`);
                        continue;
                    }

                    if (!fs.existsSync(sourcePath)) {
                        errors.push(`${file.filename}: 원본 파일을 찾을 수 없습니다.`);
                        continue;
                    }

                    // 파일 이동 (크로스 디바이스 fallback: 스트림 복사)
                    try {
                        fs.renameSync(sourcePath, targetPath);
                    } catch (moveError: any) {
                        if (moveError.code === 'EXDEV') {
                            await copyFileWithProgress(sourcePath, targetPath, (bytesTransferred, totalBytes) => {
                                sendProgress({
                                    operationType: 'move',
                                    currentFile: file.filename,
                                    currentIndex: i + 1,
                                    totalCount,
                                    bytesTransferred,
                                    totalBytes,
                                });
                            });
                            fs.unlinkSync(sourcePath);
                        } else {
                            throw moveError;
                        }
                    }

                    // DB 레코드 삭제 (파일은 이미 이동됨)
                    deleteFileRecordOnly(file.id);
                    movedCount++;
                } catch (fileError: any) {
                    errors.push(`${file.filename}: ${fileError.message}`);
                }
            }

            return { success: true, data: { movedCount, errors } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('file:copy-to-folder', async (_event, params: { files: { id: number; filename: string }[] }) => {
        try {
            const vaultPath = getVaultPath();
            if (!vaultPath) {
                return { success: false, error: 'Vault 경로가 설정되지 않았습니다.' };
            }

            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: '파일을 복사할 폴더 선택',
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: true, data: { copiedCount: 0, errors: [] } };
            }

            const targetDir = result.filePaths[0];
            const errors: string[] = [];
            let copiedCount = 0;
            const totalCount = params.files.length;

            for (let i = 0; i < totalCount; i++) {
                const file = params.files[i];
                const sourcePath = path.join(vaultPath, file.filename);
                const targetPath = path.join(targetDir, file.filename);

                sendProgress({
                    operationType: 'copy',
                    currentFile: file.filename,
                    currentIndex: i + 1,
                    totalCount,
                });

                try {
                    if (fs.existsSync(targetPath)) {
                        errors.push(`${file.filename}: 대상 폴더에 동일한 파일이 이미 존재합니다.`);
                        continue;
                    }

                    if (!fs.existsSync(sourcePath)) {
                        errors.push(`${file.filename}: 원본 파일을 찾을 수 없습니다.`);
                        continue;
                    }

                    await copyFileWithProgress(sourcePath, targetPath, (bytesTransferred, totalBytes) => {
                        sendProgress({
                            operationType: 'copy',
                            currentFile: file.filename,
                            currentIndex: i + 1,
                            totalCount,
                            bytesTransferred,
                            totalBytes,
                        });
                    });
                    copiedCount++;
                } catch (fileError: any) {
                    errors.push(`${file.filename}: ${fileError.message}`);
                }
            }

            return { success: true, data: { copiedCount, errors } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
};
