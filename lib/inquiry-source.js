// 問い合わせ・営業パートナー応募の「このページを知ったきっかけ」。
// ChatGPT 等のAI経由の応募が実際に来ている（2026-11-02 宮前さん）ので、経路ごとに数えられるようにする。
// provider_inquiries.source に key を保存する（supabase-inquiry-source.sql）。
export const INQUIRY_SOURCES = [
  ['ai', 'ChatGPTなどのAIに聞いて'],
  ['search', 'Google・Yahoo!などの検索'],
  ['sns', 'SNS（X・Instagram・TikTokなど）'],
  ['referral', '知人・営業パートナーからの紹介'],
  ['other', 'その他'],
];

export function normalizeSource(v) {
  return INQUIRY_SOURCES.some(([k]) => k === v) ? v : null;
}

export function sourceLabel(v) {
  return (INQUIRY_SOURCES.find(([k]) => k === v) || [])[1] || '';
}
