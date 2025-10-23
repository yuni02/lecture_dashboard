import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // 로컬 네트워크에서의 개발 허용 (모바일 테스트 등)
  allowedDevOrigins: [
    'http://192.168.1.10:3000',
    'http://192.168.1.10',
  ],
};

export default nextConfig;
