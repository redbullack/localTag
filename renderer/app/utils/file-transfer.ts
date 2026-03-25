/**
 * 파일 추가/이동/복사 작업에 필요한 유틸 함수들
 *
 * page.tsx의 파일 처리 로직 중복을 제거하기 위해 분리한 모듈입니다.
 */

const FILE_GROUP_THRESHOLD = 3;

/** "파일명: 이유" 형식의 errors 배열을 이유별로 그룹핑한다. */
function groupErrorsByReason(errors: string[]): Array<{ reason: string; filenames: string[] }> {
    const reasonMap = new Map<string, string[]>();
    for (const entry of errors) {
        const colonIndex = entry.indexOf(': ');
        if (colonIndex === -1) {
            const key = '알 수 없는 오류';
            reasonMap.set(key, [...(reasonMap.get(key) ?? []), entry]);
            continue;
        }
        const filename = entry.slice(0, colonIndex);
        const reason = entry.slice(colonIndex + 2);
        reasonMap.set(reason, [...(reasonMap.get(reason) ?? []), filename]);
    }
    return Array.from(reasonMap.entries()).map(([reason, filenames]) => ({ reason, filenames }));
}

/** 그룹핑된 에러를 사람이 읽기 쉬운 문자열로 변환한다. 3개 이상이면 개수로 요약. */
function formatErrorGroups(groups: Array<{ reason: string; filenames: string[] }>): string {
    return groups
        .map(({ reason, filenames }) => {
            if (filenames.length >= FILE_GROUP_THRESHOLD) {
                return `${filenames.length}개 파일 — ${reason}`;
            }
            return `${filenames.join(', ')} — ${reason}`;
        })
        .join('\n');
}

export interface ShowToastFn {
    (options: { type: 'success' | 'error'; message: string; duration?: number }): void;
}

export interface FileForTransfer {
    id: number;
    filename: string;
}

export interface TransferResponse {
    success: boolean;
    data?: {
        movedCount?: number;
        copiedCount?: number;
        errors: string[];
    };
    error?: string;
    duplicates?: string[];
}

/**
 * 파일 추가 작업 결과를 토스트로 표시합니다.
 *
 * 성공/실패 및 중복 파일 에러를 자동으로 처리합니다.
 *
 * @param response - IPC 응답 객체
 * @param filePaths - 추가하려던 파일 경로 배열
 * @param showToast - 토스트 표시 함수
 * @returns 성공 여부
 */
export function handleAddFilesResponse(
    response: any,
    filePaths: string[],
    showToast: ShowToastFn
): boolean {
    if (!response.success) {
        if (response.duplicates && response.duplicates.length > 0) {
            const duplicateMessage = response.duplicates.length >= FILE_GROUP_THRESHOLD
                ? `${response.duplicates.length}개 파일이 이미 존재합니다.`
                : `다음 파일명이 이미 존재합니다: ${response.duplicates.join(', ')}`;
            showToast({
                type: 'error',
                message: duplicateMessage,
                duration: response.duplicates.length >= FILE_GROUP_THRESHOLD ? 7000 : 5000,
            });
        } else if (response.error) {
            showToast({ type: 'error', message: response.error, duration: 4000 });
        }
        return false;
    }

    showToast({
        type: 'success',
        message: `${response.data?.length ?? filePaths.length}개의 파일이 추가되었습니다.`,
        duration: 3000,
    });
    return true;
}

/**
 * 파일 이동/복사 작업 결과를 토스트로 표시합니다.
 *
 * 부분 성공, 실패 등의 경우를 자동으로 처리합니다.
 *
 * @param response - IPC 응답 객체
 * @param mode - 'move' 또는 'copy'
 * @param showToast - 토스트 표시 함수
 * @returns 성공 여부 (하나 이상의 파일이 처리됨)
 */
export function handleFileTransferResponse(
    response: TransferResponse,
    mode: 'move' | 'copy',
    showToast: ShowToastFn
): boolean {
    if (!response.success) {
        const actionName = mode === 'move' ? '이동' : '복사';
        showToast({
            type: 'error',
            message: response.error || `파일 ${actionName}에 실패했습니다.`,
            duration: 4000,
        });
        return false;
    }

    if (!response.data) {
        return false;
    }

    const { movedCount = 0, copiedCount = 0, errors } = response.data;
    const successCount = mode === 'move' ? movedCount : copiedCount;

    // 부분 실패
    if (errors.length > 0) {
        const actionName = mode === 'move' ? '이동' : '복사';
        const groups = groupErrorsByReason(errors);
        const formattedMessage = formatErrorGroups(groups);
        showToast({
            type: 'error',
            message: `일부 파일 ${actionName} 실패 (${errors.length}개):\n${formattedMessage}`,
            duration: errors.length >= FILE_GROUP_THRESHOLD ? 7000 : 5000,
        });
    }

    // 성공
    if (successCount > 0) {
        const actionName = mode === 'move' ? '이동되었습니다' : '복사되었습니다';
        showToast({
            type: 'success',
            message: `${successCount}개의 파일이 ${actionName}.`,
            duration: 3000,
        });
        return true;
    }

    return false;
}

/**
 * 파일 이동 작업을 실행합니다.
 *
 * @param files - 이동할 파일 목록
 * @param ipcCall - IPC 호출 함수
 * @param showToast - 토스트 표시 함수
 * @param onSuccess - 성공 시 콜백
 */
export async function executeFileMoveWithToast(
    files: FileForTransfer[],
    ipcCall: (files: FileForTransfer[]) => Promise<TransferResponse>,
    showToast: ShowToastFn,
    onSuccess?: () => void
): Promise<void> {
    const response = await ipcCall(files);
    const success = handleFileTransferResponse(response, 'move', showToast);
    if (success) {
        onSuccess?.();
    }
}

/**
 * 파일 복사 작업을 실행합니다.
 *
 * @param files - 복사할 파일 목록
 * @param ipcCall - IPC 호출 함수
 * @param showToast - 토스트 표시 함수
 * @param onSuccess - 성공 시 콜백
 */
export async function executeFileCopyWithToast(
    files: FileForTransfer[],
    ipcCall: (files: FileForTransfer[]) => Promise<TransferResponse>,
    showToast: ShowToastFn,
    onSuccess?: () => void
): Promise<void> {
    const response = await ipcCall(files);
    const success = handleFileTransferResponse(response, 'copy', showToast);
    if (success) {
        onSuccess?.();
    }
}
