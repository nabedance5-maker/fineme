/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    typedRoutes: false
  },
  async redirects() {
    return [
      { source: '/pages/login.html', destination: '/login', permanent: true },
      { source: '/pages/user/login.html', destination: '/login', permanent: true },
      { source: '/pages/auth/callback.html', destination: '/auth/callback', permanent: true },
      { source: '/pages/privacy.html', destination: '/privacy', permanent: true },
      { source: '/pages/terms.html', destination: '/terms', permanent: true },
      { source: '/pages/terms-provider.html', destination: '/terms-provider', permanent: true },
      { source: '/pages/tokusho.html', destination: '/tokusho', permanent: true },
      { source: '/pages/about.html', destination: '/about', permanent: true },
      { source: '/pages/about-fineme.html', destination: '/about-fineme', permanent: true },
      { source: '/pages/glowup-guide.html', destination: '/guide', permanent: true },
      { source: '/pages/notifications.html', destination: '/notifications', permanent: true },
    ];
  },
  async rewrites() {
    return [
      // ルート `/` を _root.html に向ける（/index.html URLを消して重複コンテンツ対策）
      { source: '/', destination: '/_root.html' },
    ];
  },
  async headers() {
    return [
      // 静的HTMLページ: ブラウザキャッシュを無効化（デプロイ後も即反映）
      {
        source: '/(.*).html',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
        ],
      },
      // ルートページも同様
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
        ],
      },
      // JS/CSSなどの静的アセット: バージョンクエリで管理するので長期キャッシュOK
      {
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // API routes: CORS（静的HTMLページからの fetch を許可）
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization,x-internal-key' },
        ],
      },
      // 全ページ: セキュリティヘッダー
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=()' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self';"
          },
        ],
      },
    ];
  },
};

export default nextConfig;
