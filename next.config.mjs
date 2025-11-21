/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false
  },
  // Add security headers globally. Adjust CSP after testing (report-only first in production).
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: "geolocation=(), microphone=()" },
          // Content-Security-Policy: start reasonably strict; iterate in report-only mode if you have many inline scripts/styles.
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self';" }
        ]
      }
    ];
  }
};

export default nextConfig;
