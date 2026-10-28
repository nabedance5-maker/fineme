// お名前の照合（でお要望 2026-10-28：体験メニューの回数制限を、アカウントや連絡先を変えてすり抜けるのに気づくため）。
// 空白・「様」・全角半角・カタカナとひらがなの違いを無くして比べる（「山田 太郎」「山田太郎」「ヤマダ タロウ」「やまだたろう」）。
export function normalizeName(s) {
  return String(s || '')
    .normalize('NFKC')
    .replace(/[\s・･.,、。]/g, '')
    .replace(/様$/, '')
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .toLowerCase();
}

// 照合に使うお名前の候補（2文字未満は同じになりやすいので使わない）
export function nameKeys(...names) {
  return [...new Set(names.map(normalizeName).filter(n => n.length >= 2))];
}
