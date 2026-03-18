import { useCallback, useRef, useState } from 'react';

/**
 * Windows 파일 복사 대화상자와 같은 지연 표시 전략을 구현하는 훅.
 *
 * - 작업 시작 후 delayMs(기본 500ms) 이내에 완료되면 로딩 UI를 표시하지 않음
 * - delayMs 이후에도 작업이 진행 중이면 로딩 UI를 표시
 * - 한번 표시된 UI는 최소 minDisplayMs(기본 300ms) 유지하여 깜빡임 방지
 */
export function useDelayedLoading(delayMs = 500, minDisplayMs = 300) {
    const [isVisible, setIsVisible] = useState(false);
    const isActiveRef = useRef(false);
    const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shownAtRef = useRef<number>(0);

    const startLoading = useCallback(() => {
        isActiveRef.current = true;

        delayTimerRef.current = setTimeout(() => {
            if (isActiveRef.current) {
                shownAtRef.current = Date.now();
                setIsVisible(true);
            }
        }, delayMs);
    }, [delayMs]);

    const stopLoading = useCallback(() => {
        isActiveRef.current = false;

        // 아직 표시 전이면 타이머만 취소
        if (delayTimerRef.current) {
            clearTimeout(delayTimerRef.current);
            delayTimerRef.current = null;
        }

        // 이미 표시 중이면 최소 표시 시간 보장
        if (shownAtRef.current > 0) {
            const elapsed = Date.now() - shownAtRef.current;
            const remaining = minDisplayMs - elapsed;

            if (remaining > 0) {
                setTimeout(() => {
                    shownAtRef.current = 0;
                    setIsVisible(false);
                }, remaining);
            } else {
                shownAtRef.current = 0;
                setIsVisible(false);
            }
        } else {
            setIsVisible(false);
        }
    }, [minDisplayMs]);

    return { isVisible, startLoading, stopLoading };
}
