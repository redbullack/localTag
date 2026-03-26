import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow } from 'electron';
import { addFile, isIgnoredFile } from './file-repository';
import { fileOperationLock } from './file-operation-lock';
import { getAutoCollectSettings, getVaultPath } from './store';
import { getDb } from './db';

/** 다운로드 중인 브라우저 임시 파일 확장자 */
const TEMP_DOWNLOAD_EXTENSIONS = new Set([
    '.crdownload', // Chrome, Edge
    '.part',       // Firefox
    '.partial',    // IE / Edge Legacy
    '.download',   // Safari (macOS)
    '.tmp',        // 일반 임시 파일
]);

interface PendingFile {
    filePath: string;
    lastSize: number;
    checkCount: number;
    timer: NodeJS.Timeout;
}

/**
 * 다운로드 폴더를 감시하여 새 파일을 Vault에 자동 수집하는 싱글톤 클래스.
 * fs.watch 기반 이벤트 감시 + 60초 폴링 fallback 병행.
 */
class DownloadWatcher {
    private watchers = new Map<string, fs.FSWatcher>();
    private pollTimer: NodeJS.Timeout | null = null;
    private pendingFiles = new Map<string, PendingFile>();
    private collectedFiles = new Set<string>();
    private processing = false;
    private collectQueue: string[] = [];

    private tagIds: number[] = [];
    private stabilityDelayMs = 3000;
    private watchPaths: string[] = [];

    /** 감시를 시작한다. 기존 파일도 모두 수집한다. */
    async start(): Promise<void> {
        const settings = getAutoCollectSettings();
        if (!settings.enabled) return;

        const vaultPath = getVaultPath();
        if (!vaultPath) {
            console.warn('[DownloadWatcher] Vault 경로가 설정되지 않아 시작할 수 없습니다.');
            return;
        }

        this.tagIds = settings.defaultTagIds;
        this.stabilityDelayMs = settings.stabilityDelayMs;
        this.watchPaths = settings.watchPaths;

        for (const watchPath of this.watchPaths) {
            if (!fs.existsSync(watchPath)) {
                console.warn(`[DownloadWatcher] 감시 폴더가 존재하지 않습니다: ${watchPath}`);
                continue;
            }
            this.startWatching(watchPath);
        }

        // 폴링 fallback (60초)
        this.pollTimer = setInterval(() => this.pollCheck(), 60_000);

        // 기존 파일 초기 스캔
        await this.initialScan();
    }

    /** 모든 감시를 중지한다. */
    stop(): void {
        this.watchers.forEach((watcher, watchPath) => {
            watcher.close();
            console.log(`[DownloadWatcher] 감시 중지: ${watchPath}`);
        });
        this.watchers.clear();

        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }

        this.pendingFiles.forEach((pending) => {
            clearTimeout(pending.timer);
        });
        this.pendingFiles.clear();
        this.collectedFiles.clear();
        this.collectQueue = [];
    }

    /** 설정 변경 시 재시작한다. */
    async restart(): Promise<void> {
        this.stop();
        await this.start();
    }

    /** 현재 감시 상태를 반환한다. */
    getStatus(): { watching: boolean; watchPaths: string[] } {
        return {
            watching: this.watchers.size > 0,
            watchPaths: Array.from(this.watchers.keys()),
        };
    }

    // ─── 내부 메서드 ────────────────────────────────────

    private startWatching(dirPath: string): void {
        try {
            const watcher = fs.watch(dirPath, (eventType, filename) => {
                if (!filename) return;
                if (eventType === 'rename') {
                    this.onFileDetected(dirPath, filename);
                }
            });

            watcher.on('error', (error) => {
                console.error(`[DownloadWatcher] 감시 에러 (${dirPath}):`, error.message);
                this.watchers.delete(dirPath);
                watcher.close();
                this.sendToRenderer({
                    filename: dirPath,
                    tagNames: [],
                    error: `감시 폴더 오류: ${error.message}`,
                });
            });

            this.watchers.set(dirPath, watcher);
            console.log(`[DownloadWatcher] 감시 시작: ${dirPath}`);
        } catch (error: any) {
            console.error(`[DownloadWatcher] 감시 시작 실패 (${dirPath}):`, error.message);
        }
    }

    /** 파일 감지 시 호출. 필터링 후 안정성 검사 큐에 추가. */
    private onFileDetected(dirPath: string, filename: string): void {
        const filePath = path.join(dirPath, filename);

        // 이미 처리 중이거나 수집 완료된 파일
        if (this.collectedFiles.has(filePath) || this.pendingFiles.has(filePath)) return;

        // 필터: 시스템 파일
        if (isIgnoredFile(filename)) return;

        // 필터: 다운로드 임시 파일
        const ext = path.extname(filename).toLowerCase();
        if (TEMP_DOWNLOAD_EXTENSIONS.has(ext)) return;

        // 필터: 폴더인지 확인
        try {
            const stats = fs.statSync(filePath);
            if (!stats.isFile()) return;
        } catch {
            // 파일이 아직 존재하지 않거나 삭제됨 → 무시
            return;
        }

        this.scheduleStabilityCheck(filePath);
    }

    /** 파일 안정성 검사를 스케줄링한다. */
    private scheduleStabilityCheck(filePath: string): void {
        let lastSize = 0;
        try {
            lastSize = fs.statSync(filePath).size;
        } catch {
            return;
        }

        const timer = setTimeout(() => this.checkFileStability(filePath), this.stabilityDelayMs);

        this.pendingFiles.set(filePath, {
            filePath,
            lastSize,
            checkCount: 0,
            timer,
        });
    }

    /** 파일 크기 변화 + 잠금 해제를 확인하여 다운로드 완료 여부를 판단한다. */
    private async checkFileStability(filePath: string): Promise<void> {
        const pending = this.pendingFiles.get(filePath);
        if (!pending) return;

        // 파일 삭제됨
        if (!fs.existsSync(filePath)) {
            this.pendingFiles.delete(filePath);
            return;
        }

        pending.checkCount++;

        try {
            const currentSize = fs.statSync(filePath).size;

            // 크기가 변했으면 아직 다운로드 중
            if (currentSize !== pending.lastSize || currentSize === 0) {
                pending.lastSize = currentSize;
                if (pending.checkCount < 10) {
                    pending.timer = setTimeout(
                        () => this.checkFileStability(filePath),
                        this.stabilityDelayMs,
                    );
                    return;
                }
                // 최대 재시도 초과 → 포기
                console.warn(`[DownloadWatcher] 안정성 확인 시간 초과: ${filePath}`);
                this.pendingFiles.delete(filePath);
                return;
            }

            // 파일 잠금 해제 확인
            if (!this.isFileUnlocked(filePath)) {
                if (pending.checkCount < 10) {
                    pending.timer = setTimeout(
                        () => this.checkFileStability(filePath),
                        this.stabilityDelayMs,
                    );
                    return;
                }
                console.warn(`[DownloadWatcher] 파일 잠금 해제 대기 초과: ${filePath}`);
                this.pendingFiles.delete(filePath);
                return;
            }

            // 안정 확인 → 수집 큐에 추가
            this.pendingFiles.delete(filePath);
            this.enqueueCollect(filePath);
        } catch (error: any) {
            console.error(`[DownloadWatcher] 안정성 검사 실패 (${filePath}):`, error.message);
            this.pendingFiles.delete(filePath);
        }
    }

    /** 파일이 다른 프로세스에 의해 잠겨있지 않은지 확인한다. */
    private isFileUnlocked(filePath: string): boolean {
        let fd: number | null = null;
        try {
            fd = fs.openSync(filePath, 'r+');
            return true;
        } catch {
            return false;
        } finally {
            if (fd !== null) {
                try { fs.closeSync(fd); } catch { /* 무시 */ }
            }
        }
    }

    /** 수집 큐에 추가하고 순차 처리한다. */
    private enqueueCollect(filePath: string): void {
        this.collectQueue.push(filePath);
        if (!this.processing) {
            this.processQueue();
        }
    }

    /** 큐에서 하나씩 꺼내서 수집한다. */
    private async processQueue(): Promise<void> {
        this.processing = true;

        while (this.collectQueue.length > 0) {
            const filePath = this.collectQueue.shift()!;
            await this.collectFile(filePath);
        }

        this.processing = false;
    }

    /** 파일을 Vault에 수집한다. 기존 addFile()을 재사용. */
    private async collectFile(filePath: string): Promise<void> {
        const vaultPath = getVaultPath();
        if (!vaultPath) return;

        const filename = path.basename(filePath);

        // Vault에 동일 파일명 존재 여부 확인
        const destinationPath = path.join(vaultPath, filename);
        if (fs.existsSync(destinationPath)) {
            this.collectedFiles.add(filePath);
            this.sendToRenderer({ filename, tagNames: [], skipped: true });
            return;
        }

        const release = await fileOperationLock.acquire();
        try {
            await addFile({ sourcePath: filePath, tagIds: this.tagIds });
            this.collectedFiles.add(filePath);

            // 태그 이름 조회
            const tagNames = this.resolveTagNames(this.tagIds);
            this.sendToRenderer({ filename, tagNames });
            console.log(`[DownloadWatcher] 수집 완료: ${filename}`);
        } catch (error: any) {
            console.error(`[DownloadWatcher] 수집 실패 (${filename}):`, error.message);
            this.sendToRenderer({ filename, tagNames: [], error: error.message });
        } finally {
            release();
        }
    }

    /** 태그 ID 배열에서 태그 이름을 조회한다. */
    private resolveTagNames(tagIds: number[]): string[] {
        if (tagIds.length === 0) return [];
        try {
            const db = getDb();
            const placeholders = tagIds.map(() => '?').join(',');
            const rows = db.prepare(`SELECT name FROM tags WHERE id IN (${placeholders})`).all(...tagIds) as { name: string }[];
            return rows.map(r => r.name);
        } catch {
            return [];
        }
    }

    /** 시작 시 감시 폴더의 기존 파일을 모두 수집한다. */
    private async initialScan(): Promise<void> {
        const vaultPath = getVaultPath();
        if (!vaultPath) return;

        for (const watchPath of this.watchPaths) {
            if (!fs.existsSync(watchPath)) continue;

            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(watchPath, { withFileTypes: true });
            } catch {
                continue;
            }

            const filesToCollect: string[] = [];

            for (const entry of entries) {
                if (!entry.isFile()) continue;
                if (isIgnoredFile(entry.name)) continue;

                const ext = path.extname(entry.name).toLowerCase();
                if (TEMP_DOWNLOAD_EXTENSIONS.has(ext)) continue;

                const filePath = path.join(watchPath, entry.name);
                const destPath = path.join(vaultPath, entry.name);

                // Vault에 이미 존재하면 스킵
                if (fs.existsSync(destPath)) {
                    this.collectedFiles.add(filePath);
                    continue;
                }

                filesToCollect.push(filePath);
            }

            if (filesToCollect.length === 0) continue;

            // 진행률 알림
            const win = BrowserWindow.getAllWindows()[0];
            for (let i = 0; i < filesToCollect.length; i++) {
                const filePath = filesToCollect[i];
                const filename = path.basename(filePath);

                if (win && !win.isDestroyed()) {
                    win.webContents.send('file:operation-progress', {
                        operationType: 'add',
                        currentFile: filename,
                        currentIndex: i + 1,
                        totalCount: filesToCollect.length,
                    });
                }

                await this.collectFile(filePath);
            }

            console.log(`[DownloadWatcher] 초기 스캔 완료 (${watchPath}): ${filesToCollect.length}개 파일 처리`);
        }
    }

    /** 60초 폴링 fallback: fs.watch 누락 보완. */
    private pollCheck(): void {
        for (const watchPath of this.watchPaths) {
            if (!fs.existsSync(watchPath)) continue;

            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(watchPath, { withFileTypes: true });
            } catch {
                continue;
            }

            for (const entry of entries) {
                if (!entry.isFile()) continue;
                const filePath = path.join(watchPath, entry.name);

                if (this.collectedFiles.has(filePath) || this.pendingFiles.has(filePath)) continue;

                this.onFileDetected(watchPath, entry.name);
            }
        }
    }

    /** Renderer에 수집 이벤트를 전송한다. */
    private sendToRenderer(event: { filename: string; tagNames: string[]; skipped?: boolean; error?: string }): void {
        const win = BrowserWindow.getAllWindows()[0];
        if (win && !win.isDestroyed()) {
            win.webContents.send('collect:file-collected', event);
        }
    }
}

/** 싱글톤 인스턴스 */
export const downloadWatcher = new DownloadWatcher();
