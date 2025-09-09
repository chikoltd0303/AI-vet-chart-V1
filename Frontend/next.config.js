// next.config.js

// next.config.js

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

module.exports = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    // DEV/Preview で相対パス '/api/*' を使う場合のフォールバック
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
    ];
  },
};

// 変更理由: ローカル固定の転送先を環境変数化し、本番ではRenderのURLに委譲可能にするため。
