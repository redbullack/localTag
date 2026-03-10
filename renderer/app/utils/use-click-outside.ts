'use client';

import { useEffect, type RefObject } from 'react';

/**
 * useClickOutside - 지정한 요소 바깥 클릭을 감지하는 커스텀 훅
 *
 * @param ref - 감지 대상 요소의 RefObject
 * @param onClickOutside - 바깥 클릭 시 실행할 콜백
 * @param isEnabled - 훅 활성화 여부 (기본값: true)
 */
export function useClickOutside(
    ref: RefObject<HTMLElement | null>,
    onClickOutside: () => void,
    isEnabled: boolean = true,
) {
    useEffect(() => {
        if (!isEnabled) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClickOutside();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [ref, onClickOutside, isEnabled]);
}
