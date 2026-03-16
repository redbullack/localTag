const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** 바이트 수를 읽기 쉬운 문자열로 변환한다. (예: 1234567 → "1.2 MB") */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const exponent = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        UNITS.length - 1,
    );
    const value = bytes / Math.pow(1024, exponent);
    const formatted = exponent === 0 ? value.toString() : value.toFixed(1);

    return `${formatted} ${UNITS[exponent]}`;
}
