// 公開ページ（/provider/[slug]）に何を出すかの店舗ごとの設定（でお要望 2026-10-22）。
// providers.page_visibility に { キー: false } で「出さない」を持つ。キーが無ければ出す（既定は全部出す）。
// アピール欄の中身（ガイド・スタッフ・体験談等）の並び替え・表示切替は「アピール設定」側にある。

export const PAGE_VISIBILITY_GROUPS = [
  {
    label: 'タブ',
    note: '予約のタブはいつも出ます',
    items: [
      { key: 'tab_basic', label: '基本情報' },
      { key: 'tab_appeal', label: 'アピール' },
      { key: 'tab_class', label: 'グループレッスン' },
      { key: 'tab_packages', label: '回数券' },
    ],
  },
  {
    label: 'ページ上部',
    items: [
      { key: 'quick_facts', label: '要点の帯（エリア・オンライン対応・お試し・返信目安・お支払い）' },
      { key: 'hero_status', label: '店名の下の「最寄り駅・本日の営業状況」' },
    ],
  },
  {
    label: '基本情報タブの項目',
    items: [
      { key: 'basic_address', label: '住所・地図' },
      { key: 'basic_station', label: '最寄り駅' },
      { key: 'basic_hours', label: '営業時間' },
      { key: 'basic_price', label: '料金' },
      { key: 'basic_payment', label: 'お支払い方法' },
      { key: 'basic_online', label: 'オンライン対応' },
      { key: 'basic_trial', label: 'お試し' },
      { key: 'basic_response', label: '返信目安' },
      { key: 'basic_first_session', label: '初回について' },
      { key: 'basic_cancel', label: 'キャンセルについて' },
    ],
  },
];

const KEYS = new Set(PAGE_VISIBILITY_GROUPS.flatMap(g => g.items.map(i => i.key)));

export function isShown(provider, key) {
  return provider?.page_visibility?.[key] !== false;
}

// 保存用：知っているキーの「出さない」だけを残す
export function normalizeVisibility(v) {
  const out = {};
  if (v && typeof v === 'object') for (const [k, val] of Object.entries(v)) if (KEYS.has(k) && val === false) out[k] = false;
  return out;
}
