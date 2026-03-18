import * as fs from 'fs';

/** 바이트 단위 진행률 콜백 */
export type CopyProgressCallback = (bytesTransferred: number, totalBytes: number) => void;

/** 소형 파일 기준 (10MB 미만은 동기 복사) */
const STREAM_THRESHOLD = 10 * 1024 * 1024;

/** onProgress 콜백 throttle 간격 (ms) */
const THROTTLE_INTERVAL = 100;

/**
 * 스트림 기반 파일 복사. 바이트 단위 진행률을 콜백으로 전달합니다.
 * 소형 파일(10MB 미만)은 fs.copyFileSync로 즉시 처리합니다.
 */
export async function copyFileWithProgress(
    sourcePath: string,
    targetPath: string,
    onProgress?: CopyProgressCallback,
): Promise<void> {
    const stat = fs.statSync(sourcePath);
    const totalBytes = stat.size;

    // 소형 파일: 동기 복사로 오버헤드 방지
    if (totalBytes < STREAM_THRESHOLD || !onProgress) {
        fs.copyFileSync(sourcePath, targetPath);
        onProgress?.(totalBytes, totalBytes);
        return;
    }

    return new Promise<void>((resolve, reject) => {
        const readStream = fs.createReadStream(sourcePath);
        const writeStream = fs.createWriteStream(targetPath);

        let bytesTransferred = 0;
        let lastEmitTime = 0;

        readStream.on('data', (chunk: Buffer) => {
            bytesTransferred += chunk.length;

            const now = Date.now();
            if (now - lastEmitTime >= THROTTLE_INTERVAL) {
                lastEmitTime = now;
                onProgress(bytesTransferred, totalBytes);
            }
        });

        writeStream.on('finish', () => {
            // 마지막 진행률 전송 (100%)
            onProgress(totalBytes, totalBytes);
            resolve();
        });

        readStream.on('error', (err) => {
            writeStream.destroy();
            // 실패 시 불완전 파일 정리
            try { fs.unlinkSync(targetPath); } catch { /* 무시 */ }
            reject(err);
        });

        writeStream.on('error', (err) => {
            readStream.destroy();
            try { fs.unlinkSync(targetPath); } catch { /* 무시 */ }
            reject(err);
        });

        readStream.pipe(writeStream);
    });
}
