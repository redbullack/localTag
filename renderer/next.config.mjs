/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    // file:// 프로토콜에서 에셋을 올바르게 로드하기 위한 상대 경로 설정
    assetPrefix: './',
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
