import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { version } = require('../package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        NEXT_PUBLIC_APP_VERSION: version,
    },
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
