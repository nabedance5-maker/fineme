// URL スラッグ生成ユーティリティ
// - AI が生成した slug にキリル文字など非ASCIIが混入する事故を根絶する（例: "dakenuке" → 404）
// - URLに日付は入れない（でお指示・恒久ルール）。衝突時のみ連番を付ける。

// 非ASCII除去 + kebab-case 正規化。ASCII英数字とハイフンのみ残す。
export function slugify(input, fallback = 'article') {
  const s = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // ASCII英数字以外（キリル・日本語・記号・空白）を全てハイフンに
    .replace(/-+/g, '-')          // 連続ハイフンを1つに
    .replace(/^-+|-+$/g, '');     // 前後のハイフン除去
  return s || fallback;
}

// existingSlugs（Set か配列）と衝突する場合のみ -2, -3 ... を付与する。日付は付けない。
export function uniqueSlug(base, existingSlugs) {
  const taken = existingSlugs instanceof Set ? existingSlugs : new Set(existingSlugs || []);
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`; // 理論上到達しないフォールバック
}
