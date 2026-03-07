/**
 * copy-static.js
 * Vercel ビルド前に実行: 静的HTML/CSS/JS/JSON を public/ にコピーして
 * Next.js の CDN 配信対象にする。
 *
 * ディレクトリ構造を保持するため相対パスは壊れない:
 *   pages/admin/providers.html  →  public/pages/admin/providers.html
 *   assets/styles/style.css     →  public/assets/styles/style.css
 */
const { cpSync, mkdirSync, existsSync, readdirSync, statSync } = require('fs');
const { resolve, join } = require('path');

const ROOT = resolve(__dirname, '..');
const PUBLIC = resolve(ROOT, 'public');

// assets, components, data, scripts, feature, diagnosis は丸ごとコピー
const FULL_COPY = ['assets', 'components', 'data', 'styles', 'scripts', 'feature', 'diagnosis'];
for (const dir of FULL_COPY) {
  const src = resolve(ROOT, dir);
  if (!existsSync(src)) continue;
  const dest = resolve(PUBLIC, dir);
  cpSync(src, dest, { recursive: true, force: true });
  console.log(`Copied ${dir}/ → public/${dir}/`);
}

// pages/ は .html のみコピー（_app.tsx, api/ などの Next.js ソースは除外）
const EXCLUDE_DIRS = new Set(['api', 'node_modules']);
const EXCLUDE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

function copyHtml(srcDir, destDir) {
  if (!existsSync(srcDir)) return;
  mkdirSync(destDir, { recursive: true });

  for (const entry of readdirSync(srcDir)) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry)) copyHtml(srcPath, destPath);
    } else {
      const ext = entry.slice(entry.lastIndexOf('.'));
      if (!EXCLUDE_EXTS.has(ext)) {
        cpSync(srcPath, destPath, { force: true });
      }
    }
  }
}

copyHtml(resolve(ROOT, 'pages'), resolve(PUBLIC, 'pages'));
console.log('Copied pages/**/*.html → public/pages/**/*.html');

// ルート直下の静的 HTML (index.html, 404.html など)
const ROOT_HTMLS = ['index.html', '404.html', 'result.html',
                    'robots.txt', 'sitemap.xml', 'favicon.ico'];
for (const file of ROOT_HTMLS) {
  const src = resolve(ROOT, file);
  if (existsSync(src)) {
    cpSync(src, resolve(PUBLIC, file), { force: true });
    console.log(`Copied ${file} → public/${file}`);
  }
}

console.log('Static copy complete.');
