import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    turbopack: {
        root: resolve(__dirname, '..'),
    },
    // file:// 프로토콜에서 에셋을 올바르게 로드하기 위한 상대 경로 설정
    assetPrefix: './',
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
