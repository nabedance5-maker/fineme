// @ts-nocheck
// Simple sitemap generator for static pages at build time or manual run
// It reads a list of known HTML files and emits an XML string that you can save as sitemap.xml

export function generateSitemap({ baseUrl, paths }){
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const urls = paths.map(p => `  <url>\n    <loc>${esc(new URL(p, baseUrl).href)}</loc>\n    <changefreq>${p.includes('/search') ? 'daily' : 'weekly'}</changefreq>\n    <priority>${p==='/'? '0.8' : (p.includes('/search')? '0.8' : '0.6')}</priority>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
