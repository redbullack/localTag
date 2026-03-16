import { BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'fs';
import { statfs } from 'fs/promises';
import * as path from 'path';
import { getVaultPath, setVaultPath } from '../lib/store';

const VAULT_FOLDER_NAME = 'MyTaggedFiles';

/** vault 폴더의 총 크기와 파일 수를 계산한다. */
function getDirectorySize(dirPath: string): { size: number; fileCount: number } {
    let totalSize = 0;
    let fileCount = 0;

    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile()) {
                const stat = fs.statSync(path.join(dirPath, entry.name));
                totalSize += stat.size;
                fileCount++;
            }
        }
    } catch {
        // 폴더가 존재하지 않거나 읽기 불가 시 0 반환
    }

    return { size: totalSize, fileCount };
}

export const registerVaultHandlers = () => {
    /** vault 폴더 및 드라이브 용량 정보를 반환한다. */
    ipcMain.handle('vault:get-storage-info', async () => {
        try {
            const vaultPath = getVaultPath();
            if (!vaultPath) {
                return { success: false, error: 'Vault 경로가 설정되지 않았습니다.' };
            }

            const { size: vaultSize, fileCount: vaultFileCount } = getDirectorySize(vaultPath);

            let driveTotal = 0;
            let driveFree = 0;
            let driveUsed = 0;

            try {
                const stats = await statfs(vaultPath);
                driveTotal = stats.bsize * stats.blocks;
                driveFree = stats.bsize * stats.bavail;
                driveUsed = driveTotal - driveFree;
            } catch {
                // 네트워크 드라이브 등에서 statfs 실패 가능
            }

            return {
                success: true,
                data: { vaultSize, vaultFileCount, driveTotal, driveFree, driveUsed },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    /** vault 폴더를 새 위치로 이동한다. (2단계 커밋: 전체 복사 → 원본 삭제) */
    ipcMain.handle('vault:relocate', async () => {
        try {
            const currentVaultPath = getVaultPath();
            if (!currentVaultPath) {
                return { success: false, error: 'Vault 경로가 설정되지 않았습니다.' };
            }

            // 1. 폴더 선택 다이얼로그
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: 'Vault를 이동할 새 위치를 선택하세요',
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, error: 'canceled' };
            }

            const selectedLocation = result.filePaths[0];
            const newVaultPath = path.join(selectedLocation, VAULT_FOLDER_NAME);

            // 2. 사전 검증
            if (path.resolve(currentVaultPath) === path.resolve(newVaultPath)) {
                return { success: false, error: '현재 위치와 동일한 경로입니다.' };
            }

            if (fs.existsSync(newVaultPath)) {
                return { success: false, error: '선택한 위치에 이미 MyTaggedFiles 폴더가 존재합니다.' };
            }

            // 쓰기 권한 확인
            try {
                fs.accessSync(selectedLocation, fs.constants.W_OK);
            } catch {
                return { success: false, error: '선택한 위치에 쓰기 권한이 없습니다.' };
            }

            // 이동할 파일 목록 수집
            const files: string[] = [];
            try {
                const entries = fs.readdirSync(currentVaultPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isFile()) {
                        files.push(entry.name);
                    }
                }
            } catch (error: any) {
                return { success: false, error: `기존 Vault 폴더를 읽을 수 없습니다: ${error.message}` };
            }

            // 용량 검증
            const { size: vaultSize } = getDirectorySize(currentVaultPath);
            try {
                const stats = await statfs(selectedLocation);
                const freeSpace = stats.bsize * stats.bavail;
                if (freeSpace < vaultSize) {
                    return {
                        success: false,
                        error: `대상 드라이브의 여유 공간이 부족합니다. (필요: ${vaultSize} bytes, 여유: ${freeSpace} bytes)`,
                    };
                }
            } catch {
                // statfs 실패 시 용량 검증 건너뜀
            }

            // 3. Phase A — 새 폴더 생성 + 파일 복사
            fs.mkdirSync(newVaultPath, { recursive: true });

            const win = BrowserWindow.getFocusedWindow();
            const copiedFiles: string[] = [];

            try {
                for (let i = 0; i < files.length; i++) {
                    const filename = files[i];
                    const sourcePath = path.join(currentVaultPath, filename);
                    const targetPath = path.join(newVaultPath, filename);

                    // 진행률 전송
                    win?.webContents.send('vault:relocate-progress', {
                        current: i + 1,
                        total: files.length,
                        currentFile: filename,
                    });

                    fs.copyFileSync(sourcePath, targetPath);
                    copiedFiles.push(filename);
                }
            } catch (error: any) {
                // 복사 실패 시 롤백: 이미 복사된 파일 삭제
                for (const filename of copiedFiles) {
                    try {
                        fs.unlinkSync(path.join(newVaultPath, filename));
                    } catch {
                        // 롤백 중 에러 무시
                    }
                }
                try {
                    fs.rmdirSync(newVaultPath);
                } catch {
                    // 폴더 삭제 실패 무시
                }
                return { success: false, error: `파일 복사 중 오류가 발생했습니다: ${error.message}` };
            }

            // 4. Phase B — 원본 삭제 + vaultPath 업데이트
            for (const filename of files) {
                try {
                    fs.unlinkSync(path.join(currentVaultPath, filename));
                } catch {
                    // 원본 삭제 실패는 무시 (데이터 손실 없음)
                }
            }

            try {
                fs.rmdirSync(currentVaultPath);
            } catch {
                // 폴더 삭제 실패 무시 (다른 파일이 남아있을 수 있음)
            }

            setVaultPath(newVaultPath);

            return {
                success: true,
                data: { newVaultPath, movedFileCount: copiedFiles.length },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
};
