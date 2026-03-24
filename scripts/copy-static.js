/**
 * copy-static.js
 * Vercel ビルド前に実行: 静的HTML/CSS/JS/JSON を public/ にコピーして
 * Next.js の CDN 配信対象にする。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.resolve(ROOT, 'public');

let copied = 0;
let errors = 0;

function safeCopy(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    copied++;
  } catch (e) {
    console.error(`[copy-static] FAILED: ${src} → ${dest}: ${e.message}`);
    errors++;
  }
}

// assets, components, data, scripts, feature, diagnosis は丸ごとコピー
const FULL_COPY = ['assets', 'components', 'data', 'styles', 'scripts', 'feature', 'diagnosis', 'business'];
for (const dir of FULL_COPY) {
  const src = path.resolve(ROOT, dir);
  if (!fs.existsSync(src)) continue;
  const dest = path.resolve(PUBLIC, dir);
  try {
    fs.cpSync(src, dest, { recursive: true, force: true });
    console.log(`Copied ${dir}/ → public/${dir}/`);
  } catch (e) {
    console.error(`[copy-static] cpSync failed for ${dir}: ${e.message}`);
  }
}

// pages/ は .html のみコピー（_app.tsx, api/ などの Next.js ソースは除外）
const EXCLUDE_DIRS = new Set(['api', 'node_modules']);
const EXCLUDE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

function copyHtml(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  try {
    fs.mkdirSync(destDir, { recursive: true });
  } catch (e) {
    console.error(`[copy-static] mkdirSync failed: ${destDir}: ${e.message}`);
    return;
  }

  let entries;
  try {
    entries = fs.readdirSync(srcDir);
  } catch (e) {
    console.error(`[copy-static] readdirSync failed: ${srcDir}: ${e.message}`);
    return;
  }

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    try {
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry)) copyHtml(srcPath, destPath);
      } else {
        const ext = entry.slice(entry.lastIndexOf('.'));
        if (!EXCLUDE_EXTS.has(ext)) {
          safeCopy(srcPath, destPath);
        }
      }
    } catch (e) {
      console.error(`[copy-static] stat failed: ${srcPath}: ${e.message}`);
      errors++;
    }
  }
}

copyHtml(path.resolve(ROOT, 'pages'), path.resolve(PUBLIC, 'pages'));
console.log('Copied pages/**/*.html → public/pages/**/*.html');

// ルート直下の静的 HTML
// index.html は _root.html として配置（/index.html というURLを存在させない＝重複コンテンツ対策）
const ROOT_HTMLS = ['404.html', 'result.html', 'robots.txt', 'sitemap.xml', 'favicon.ico'];
for (const file of ROOT_HTMLS) {
  const src = path.resolve(ROOT, file);
  const dest = path.resolve(PUBLIC, file);
  if (fs.existsSync(src)) {
    safeCopy(src, dest);
    console.log(`Copied ${file} → public/${file}`);
  }
}
// index.html → public/_root.html（/index.html URLを消してリダイレクト不要にする）
const indexSrc = path.resolve(ROOT, 'index.html');
const indexDest = path.resolve(PUBLIC, '_root.html');
if (fs.existsSync(indexSrc)) {
  safeCopy(indexSrc, indexDest);
  console.log('Copied index.html → public/_root.html');
}

console.log(`Static copy complete. ${copied} files copied, ${errors} errors.`);
if (errors > 0) {
  console.error(`[copy-static] ${errors} file(s) failed to copy. Check logs above.`);
}
