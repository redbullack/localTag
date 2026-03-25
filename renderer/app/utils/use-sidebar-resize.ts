import { useState, useRef, useEffect } from 'react';

interface UseSidebarResizeOptions {
    minWidth: number;
    maxWidth: number;
    defaultWidth: number;
}

/**
 * 사이드바의 드래그 기반 리사이즈 기능을 제공하는 커스텀 훅
 * 사용자가 사이드바 우측 끝을 드래그하면 --sidebar-width CSS 변수를 업데이트한다.
 */
export function useSidebarResize({ minWidth, maxWidth, defaultWidth }: UseSidebarResizeOptions) {
    // 드래그 진행 중 상태
    const [isDragging, setIsDragging] = useState(false);
    // 드래그 시작 시점의 마우스 X 좌표 (매번 업데이트되지 않도록 ref 사용)
    const startXRef = useRef(0);
    // 드래그 시작 시점의 사이드바 너비 (delta 계산 기준점)
    const startWidthRef = useRef(defaultWidth);

    /**
     * 마우스 down 이벤트: 드래그 시작
     * - 현재 마우스 X 좌표와 사이드바 너비를 ref에 저장
     * - 현재 CSS 변수 값을 파싱하여 정확한 시작 너비 설정
     */
    const handleMouseDown = (e: React.MouseEvent) => {
        startXRef.current = e.clientX;
        // CSS 변수에서 현재 사이드바 너비를 읽음 (파싱 실패 시 기본값 사용)
        const currentWidth = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width') || String(defaultWidth),
            10
        );
        startWidthRef.current = isNaN(currentWidth) ? defaultWidth : currentWidth;
        setIsDragging(true);
    };

    /**
     * 드래그 진행 중 이벤트 리스너 관리
     * isDragging이 true일 때만 document 레벨에서 mousemove/mouseup을 추적
     * 이를 통해 사이드바 밖으로 마우스가 빠져나가도 드래그가 계속 동작한다.
     */
    useEffect(() => {
        if (!isDragging) return;

        // 드래그 중 텍스트 선택 방지 (UX 향상)
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        /**
         * 마우스 move 이벤트: 실시간 사이드바 너비 업데이트
         * - 마우스 이동 거리(delta)를 계산
         * - 시작 너비 + delta를 min/max 범위로 제한
         * - CSS 변수 업데이트로 사이드바 너비 반영
         */
        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - startXRef.current;
            const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
            document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        };

        /**
         * 마우스 up 이벤트: 드래그 종료
         * isDragging을 false로 설정하면 useEffect cleanup이 동작하여 리스너 제거
         */
        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        /**
         * cleanup: 드래그 종료 시 설정값 복원 및 리스너 제거
         * isDragging이 false가 되면 이 cleanup이 실행되어
         * 스타일 복원과 이벤트 리스너 제거가 자동 수행된다.
         */
        return () => {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, minWidth, maxWidth]);

    return { isDragging, handleMouseDown };
}
