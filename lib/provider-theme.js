// 店舗公開ページのデザイン設定（でお要望2026-10-01）を CSS カスタムプロパティへ変換する。
//
// 2026-10-01: 本ファイルは一度作成されたが、作業ディレクトリ共有によるセッション間の
// 競合でコミット前に失われた（編集用UI PageDesignSettings.js も同時に消失・削除済み。
// 復元の経緯は daily/2026-10-01.md 参照）。設定を保存する手段が無い状態なので、
// 現状は常にデフォルト値を返す（= 旧実装の固定値と見た目が変わらない）実装にしてある。
// `providers.page_theme` カラムが実在しない/値が無い場合でも必ず安全なデフォルトを返す。
//
// デフォルト値は app/provider/[slug]/page.js の該当コミット（47d3167）の差分から、
// 置き換え前の固定値をそのまま採用して復元した（グローバルトークンと一致：
// --color-bg-dark: #0d1117 / --color-fg: #e8e4dc / --font-serif-ja: 'Shippori Mincho', Georgia, serif）。
const DEFAULT_THEME = {
  bg: '#0d1117',       // ページ全体の背景
  text: '#e8e4dc',     // 本文の基準色（color-mixで不透明度を調整して使われる）
  surface: 'rgba(10,15,30,0.5)', // カード・パネルの背景
  surface2: 'rgba(255,255,255,0.06)', // フォーム入力欄の背景
  accent: '#111111',   // ボタン・強調要素の背景
  onAccent: '#ffffff', // accent の上に乗る文字色
  fs: 1,               // 本文文字サイズの倍率（calc(Npx * var(--pv-fs))で使用）
  hs: 1,               // 見出し文字サイズの倍率（calc(Npx * var(--pv-hs))で使用）
  heading: '#e8e4dc',  // 見出し色
  hfont: "'Shippori Mincho', Georgia, serif", // 見出しフォント
  hweight: '700',      // 見出しの太さ
  hstyle: 'normal',    // 見出しのスタイル（italic等）
};

export function themeToCssVars(theme) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  return {
    '--pv-bg': t.bg,
    '--pv-text': t.text,
    '--pv-surface': t.surface,
    '--pv-surface-2': t.surface2,
    '--pv-accent': t.accent,
    '--pv-on-accent': t.onAccent,
    '--pv-fs': t.fs,
    '--pv-hs': t.hs,
    '--pv-heading': t.heading,
    '--pv-hfont': t.hfont,
    '--pv-hweight': t.hweight,
    '--pv-hstyle': t.hstyle,
  };
}
