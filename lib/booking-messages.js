// 予約の時にお客様へ自動で送るメッセージ（でお要望 2026-10-27：即時予約でも「リクエストをお待ちください」と届いていた／
// お店が文面を編集できるように）。providers.booking_messages に { instant, request } で保存し、空なら下の既定文。
// 文中の {お名前} {お店} {日時} {メニュー} は送る時に置き換える。LINEとメールの両方で同じ文面を使う。

export const BOOKING_MESSAGE_DEFAULTS = {
  instant: '{お名前}様\n{お店}のご予約が確定しました。\n日時：{日時}\nメニュー：{メニュー}\n当日お待ちしております。',
  request: '{お名前}様\n{お店}への予約リクエストを受け付けました。\n希望日時：{日時}\nメニュー：{メニュー}\nお店からの返事をお待ちください。確定したらお知らせします。',
};
export const BOOKING_MESSAGE_TAGS = ['{お名前}', '{お店}', '{日時}', '{メニュー}'];
export const BOOKING_MESSAGE_MAX = 1000;

export function bookingMessageTemplate(provider, kind) {
  const t = provider?.booking_messages?.[kind];
  return typeof t === 'string' && t.trim() ? t : BOOKING_MESSAGE_DEFAULTS[kind];
}

export function renderBookingMessage(template, vars) {
  return String(template)
    .replaceAll('{お名前}', vars.name || 'お客')
    .replaceAll('{お店}', vars.store || 'お店')
    .replaceAll('{日時}', vars.when || '')
    .replaceAll('{メニュー}', vars.menu || 'ご相談')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 保存用：空・既定文と同じものは保存しない（既定文が変わった時に追従できるように）
export function normalizeBookingMessages(input) {
  const out = {};
  for (const kind of ['instant', 'request']) {
    const v = typeof input?.[kind] === 'string' ? input[kind].trim().slice(0, BOOKING_MESSAGE_MAX) : '';
    if (v && v !== BOOKING_MESSAGE_DEFAULTS[kind]) out[kind] = v;
  }
  return out;
}
