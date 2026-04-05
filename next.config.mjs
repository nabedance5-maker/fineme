import { withSentryConfig } from '@sentry/nextjs';

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
      { source: '/pages/about-fineme.html', destination: '/about', permanent: true },
      { source: '/pages/glowup-guide.html', destination: '/guide', permanent: true },
      { source: '/pages/notifications.html', destination: '/notifications', permanent: true },
      { source: '/pages/mypage/index.html', destination: '/mypage', permanent: true },
      { source: '/pages/mypage/diagnosis.html', destination: '/mypage/diagnosis', permanent: true },
      { source: '/pages/mypage/profile.html', destination: '/mypage/profile', permanent: true },
      { source: '/pages/mypage/favorites.html', destination: '/mypage/favorites', permanent: true },
      { source: '/pages/mypage/history.html', destination: '/mypage/history', permanent: true },
      { source: '/pages/mypage/reservations.html', destination: '/my-reservations', permanent: true },
      { source: '/pages/user/story-submit.html', destination: '/story-submit', permanent: true },
      // 検索・汎用ページ
      { source: '/pages/search.html', destination: '/search', permanent: true },
      { source: '/pages/detail.html', destination: '/detail', permanent: true },
      { source: '/pages/feature.html', destination: '/feature', permanent: true },
      { source: '/pages/staff.html', destination: '/staff', permanent: true },
      { source: '/pages/provider-register.html', destination: '/provider-register', permanent: true },
      // 診断
      { source: '/pages/diagnosis.html', destination: '/diagnosis', permanent: true },
      { source: '/pages/diagnosis-result.html', destination: '/diagnosis/result', permanent: true },
      { source: '/pages/diagnosis-stage2.html', destination: '/diagnosis/stage2', permanent: true },
      // 管理画面
      { source: '/pages/admin/index.html', destination: '/admin', permanent: true },
      { source: '/pages/admin/analytics.html', destination: '/admin/analytics', permanent: true },
      { source: '/pages/admin/features.html', destination: '/admin/features', permanent: true },
      { source: '/pages/admin/inquiries.html', destination: '/admin/inquiries', permanent: true },
      { source: '/pages/admin/options.html', destination: '/admin/options', permanent: true },
      { source: '/pages/admin/payments.html', destination: '/admin/payments', permanent: true },
      { source: '/pages/admin/providers.html', destination: '/admin/providers', permanent: true },
      { source: '/pages/admin/stories.html', destination: '/admin/stories', permanent: true },
      // 掲載者ダッシュボード
      { source: '/pages/provider/index.html', destination: '/provider/dashboard', permanent: true },
      { source: '/pages/provider/billing.html', destination: '/provider/billing', permanent: true },
      { source: '/pages/provider/compatibility.html', destination: '/provider/compatibility', permanent: true },
      { source: '/pages/provider/inquiry.html', destination: '/provider/inquiry', permanent: true },
      { source: '/pages/provider/join.html', destination: '/provider/join', permanent: true },
      { source: '/pages/provider/onboarding.html', destination: '/provider/onboarding', permanent: true },
      { source: '/pages/provider/philosophy.html', destination: '/provider/philosophy', permanent: true },
      { source: '/pages/provider/photo_settings.html', destination: '/provider/photo-settings', permanent: true },
      { source: '/pages/provider/profile.html', destination: '/provider/profile', permanent: true },
      { source: '/pages/provider/profile/index.html', destination: '/provider/profile', permanent: true },
      { source: '/pages/provider/referral.html', destination: '/provider/referral', permanent: true },
      { source: '/pages/provider/requests.html', destination: '/provider/requests', permanent: true },
      { source: '/pages/provider/reservations.html', destination: '/provider/reservations', permanent: true },
      { source: '/pages/provider/schedule.html', destination: '/provider/schedule', permanent: true },
      { source: '/pages/provider/service_form.html', destination: '/provider/service-form', permanent: true },
      { source: '/pages/provider/staff.html', destination: '/provider/staff', permanent: true },
      { source: '/pages/store.html', destination: '/search', permanent: true },
      { source: '/pages/user/schedule.html', destination: '/booking/schedule', permanent: true },
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

export default withSentryConfig(nextConfig, {
  org: 'fineme',
  project: 'fineme',
  silent: true,
  sourcemaps: { disable: true },
  disableLogger: true,
});
