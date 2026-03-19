import { useEffect, useState } from 'react';

/**
 * 입력 값의 변경을 지정된 시간(ms)만큼 지연시켜 반환합니다.
 * @param value - 지연시킬 값
 * @param delay - 지연 시간 (밀리초)
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
