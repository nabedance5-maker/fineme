// 紹介コード（営業パートナーの FN001 など）の確かめ方。サーバー専用。
// 2026-11-06 渡邉指摘：専用ページを通らずに申し込んだお店はコードが消える → 問い合わせ・登録フォームで手入力でき、
// 運営の管理画面でも直せるようにした。手入力は全角・小文字・空白が混じるので整えてから、登録済みのコードか確かめる。
export function normalizeReferralCode(raw) {
  return String(raw ?? '').replace(/[Ａ-Ｚａ-ｚ０-９－＿]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/[\s　]/g, '').toUpperCase();
}

// 有効な紹介コードなら整えたコードを、空なら null を、見つからなければ { error } を返す
export async function checkReferralCode(sb, raw) {
  const code = normalizeReferralCode(raw);
  if (!code) return { code: null };
  if (!/^[A-Z0-9_-]{1,40}$/.test(code)) return { error: `紹介コード「${raw}」の形が正しくありません（例：FN001）` };
  const { data } = await sb.from('sales_partners').select('referral_code, status').eq('referral_code', code).maybeSingle();
  if (!data || data.status !== 'active') return { error: `紹介コード「${code}」が見つかりません。紹介してくれた方にコードをご確認ください（わからなければ空欄で送れます）` };
  return { code };
}
