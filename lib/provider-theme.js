// 店舗公開ページのデザイン設定（でお要望 2026-10-01）。
// 店舗が選べるのは「テーマ色・地の明るさ・見出しの書体/大きさ/太字/斜体/文字色・本文の大きさ/文字色」。
// 保存は providers.page_theme（jsonb）。未設定の店舗は DEFAULT_THEME（Finemeが決めたデフォルト）で表示する。
// 公開ページ（app/provider/[slug]/page.js）・保存API（app/api/provider/page-theme）・
// ダッシュボードの設定UIが、すべてこのファイルの定義を共有する。

// テーマ色はプリセットのみ。地の明るさごとに、白文字／黒文字のボタンでも読める濃さに調整してある。
export const ACCENT_PRESETS = {
  brass:      { label: '真鍮', light: '#7f6227', dark: '#c8a45a' },
  indigo:     { label: '藍',   light: '#2b3f8f', dark: '#9aaceb' },
  forest:     { label: '深緑', light: '#2f5d50', dark: '#86bba9' },
  rose:       { label: '紅',   light: '#9a3d58', dark: '#e2a0b5' },
  terracotta: { label: '煉瓦', light: '#a2502f', dark: '#e3a07f' },
  ink:        { label: '墨',   light: '#1c1b19', dark: '#ece8df' },
};

export const GROUNDS = {
  light: { label: 'ライト', bg: '#f6f4ef', surface: '#ffffff', surface2: '#efece5', text: '#1c1b19', onAccent: '#ffffff' },
  dark:  { label: 'ダーク', bg: '#0d1117', surface: '#151b24', surface2: '#1b222d', text: '#ece8df', onAccent: '#0d1117' },
};

export const FONTS = {
  mincho: { label: '明朝', stack: "'Shippori Mincho', 'Noto Serif JP', Georgia, serif" },
  gothic: { label: 'ゴシック', stack: "'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif" },
};

export const SIZES = {
  s: { label: '小', body: 0.92, heading: 0.88 },
  m: { label: '標準', body: 1, heading: 1 },
  l: { label: '大', body: 1.1, heading: 1.16 },
};

export const DEFAULT_THEME = {
  accent: 'brass',
  ground: 'light',
  headingFont: 'mincho',
  headingSize: 'm',
  headingBold: true,
  headingItalic: false,
  headingColor: 'auto',   // 'auto'（本文と同じ）| 'accent'（テーマ色）| '#rrggbb'
  bodySize: 'm',
  bodyColor: 'auto',      // 'auto'（地に合わせた既定色）| '#rrggbb'
};

const HEX = /^#[0-9a-f]{6}$/i;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// 自由入力の文字色は、地（背景・カード面）の両方に対してこの比を下回ると保存させない（WCAG AA相当）
export const MIN_CONTRAST = 4.5;

export function colorProblem(hex, ground) {
  if (!HEX.test(hex)) return '色の形式が正しくありません';
  const g = GROUNDS[ground] || GROUNDS.light;
  const worst = Math.min(contrastRatio(hex, g.bg), contrastRatio(hex, g.surface));
  return worst < MIN_CONTRAST ? `背景との差が小さく読みにくい色です（コントラスト比 ${worst.toFixed(1)}、${MIN_CONTRAST}以上が必要）` : null;
}

// 保存前・表示前の正規化。不正値・コントラスト不足の自由色は既定値に戻す。
export function normalizeTheme(raw) {
  const t = { ...DEFAULT_THEME };
  const r = raw && typeof raw === 'object' ? raw : {};
  if (ACCENT_PRESETS[r.accent]) t.accent = r.accent;
  if (GROUNDS[r.ground]) t.ground = r.ground;
  if (FONTS[r.headingFont]) t.headingFont = r.headingFont;
  if (SIZES[r.headingSize]) t.headingSize = r.headingSize;
  if (SIZES[r.bodySize]) t.bodySize = r.bodySize;
  if (typeof r.headingBold === 'boolean') t.headingBold = r.headingBold;
  if (typeof r.headingItalic === 'boolean') t.headingItalic = r.headingItalic;
  if (r.headingColor === 'auto' || r.headingColor === 'accent') t.headingColor = r.headingColor;
  else if (typeof r.headingColor === 'string' && !colorProblem(r.headingColor, t.ground)) t.headingColor = r.headingColor.toLowerCase();
  if (r.bodyColor === 'auto') t.bodyColor = 'auto';
  else if (typeof r.bodyColor === 'string' && !colorProblem(r.bodyColor, t.ground)) t.bodyColor = r.bodyColor.toLowerCase();
  return t;
}

// 公開ページのラッパーに渡すCSS変数。ページ内の色・文字サイズはすべてこの変数経由で決まる。
export function themeToCssVars(raw) {
  const t = normalizeTheme(raw);
  const g = GROUNDS[t.ground];
  const accent = ACCENT_PRESETS[t.accent][t.ground];
  const text = t.bodyColor === 'auto' ? g.text : t.bodyColor;
  const heading = t.headingColor === 'auto' ? text : t.headingColor === 'accent' ? accent : t.headingColor;
  return {
    '--pv-bg': g.bg,
    '--pv-surface': g.surface,
    '--pv-surface-2': g.surface2,
    '--pv-text': text,
    '--pv-heading': heading,
    '--pv-accent': accent,
    '--pv-on-accent': g.onAccent,
    '--pv-hfont': FONTS[t.headingFont].stack,
    '--pv-hweight': t.headingBold ? 700 : 500,
    '--pv-hstyle': t.headingItalic ? 'italic' : 'normal',
    '--pv-fs': SIZES[t.bodySize].body,
    '--pv-hs': SIZES[t.headingSize].heading,
  };
}
