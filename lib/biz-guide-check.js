// 店舗運営ガイド・営業パートナーガイドの記事の検査（他社名・言い過ぎ・形）。
// scripts/insert-biz-guides.mjs（Claude Code が書いた記事の投入）と、運営管理画面の編集（/api/admin/biz-guides）で共有する。
// 依存なし（node の .mjs からも import できるように '@/' を使わない）。

export const BANNED_NAMES = ['ホットペッパー', 'HOT PEPPER', 'ミニモ', 'minimo', 'hacomono', 'リザービア', 'STORES', 'Square', 'Airリザーブ', 'Airレジ', 'じゃらん', '楽天ビューティ', 'クービック', 'RESERVA', 'SALON BOARD', 'サロンボード'];

export const BANNED_PATTERNS = [
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, '絵文字'],
  [/弁護士|税理士に|専門家に(相談|確認)/, '専門家への確認を勧める表現'],
  [/お客さん|(?<![お顧集接来乗])客(?=[がをにのはもと、。])/, '「お客様」以外の呼び方'],
  [/必ず(稼|儲|売上が)|確実に(稼|儲)|絶対に(稼|儲)/, '成果の保証'],
  [/月会費[^。]{0,6}(自動)?消化/, '「月会費の消化」'],
  [/一般的な相場|業界(の)?平均|相場と(合|一致)/, '根拠のない相場・業界平均'],
  [/LINE(だけ|のみ)で[^。]{0,10}(支払|決済)/, '「LINEだけで支払い・決済」'],
  [/投資(回収|対効果)[^。]{0,12}(すぐ|見込め|確実)/, '投資回収の約束'],
];

export function bodyLength(a) {
  return [a.lead, ...(a.sections || []).flatMap((s) => [...(s.p || []), ...(s.list || [])]), ...(a.faq || []).map((f) => f[1])].join('').length;
}

// 戻り値 { errs: 直さないと保存できない形の問題, warns: 書き方の注意（運営が確認すれば保存できる）, len }
export function checkGuide(a) {
  const errs = [];
  const warns = [];
  if (!/^[a-z0-9-]{3,80}$/.test(a.slug || '')) errs.push('URL（slug）は半角英小文字・数字・ハイフンで3〜80字');
  if (!['shop', 'partner'].includes(a.audience)) errs.push('対象（店舗／営業パートナー）');
  if (!a.title || a.title.length < 15 || a.title.length > 60) errs.push(`タイトルは15〜60字（今${a.title?.length || 0}字）`);
  if (!Array.isArray(a.sections) || a.sections.length < 1 || a.sections.some((s) => !s.h)) errs.push('見出しが空の段落がある');
  if (!Array.isArray(a.faq) || a.faq.some((f) => !Array.isArray(f) || f.length !== 2 || !f[0] || !f[1])) errs.push('よくある質問は質問と答えの両方が必要');
  if (!a.description || a.description.length < 60) warns.push('要約（description）が60字未満');
  if (!a.lead || a.lead.length < 50) warns.push('リード文が50字未満');
  if ((a.sections || []).length < 4) warns.push('見出しが4つ未満');
  if (!a.fineme || a.fineme.length < 80) warns.push('「Finemeでできること」が80字未満');
  if ((a.faq || []).length < 2) warns.push('よくある質問が2つ未満');
  const len = bodyLength(a);
  if (len < 1200) warns.push(`本文が${len}字（1200字以上が目安）`);
  const text = JSON.stringify(a);
  for (const n of BANNED_NAMES) if (text.includes(n)) warns.push(`他社名「${n}」`);
  for (const [re, label] of BANNED_PATTERNS) if (re.test(text)) warns.push(label);
  return { errs, warns, len };
}
