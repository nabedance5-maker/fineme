export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/mypage/', '/provider/dashboard', '/auth/'],
      },
    ],
    sitemap: 'https://www.fineme.me/sitemap.xml',
  };
}
