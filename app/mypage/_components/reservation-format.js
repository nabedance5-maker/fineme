// マイページのホームと予約一覧で共通に使う、予約の表示ルール（2026-10-22 UI刷新）。
// 状態は色だけで伝えず、必ず文字のラベルを付ける。

export const STATUS = {
  pending: { label: '返事待ち', tone: 'wait' },
  counter_proposed: { label: '日時の提案あり', tone: 'act' },
  approved: { label: '確定', tone: 'ok' },
  visited: { label: '来店済み', tone: 'done' },
  rejected: { label: 'お断り', tone: 'done' },
  cancelled: { label: 'キャンセル済み', tone: 'done' },
  expired: { label: '期限切れ', tone: 'done' },
};

const ACTIVE = ['pending', 'counter_proposed', 'approved'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// これからの予約（日付の近い順）と、これまでの予約（新しい順）に分ける
export function splitReservations(items) {
  const today = todayStr();
  const upcoming = [];
  const past = [];
  (items || []).forEach(r => {
    const d = r.status === 'counter_proposed' ? (r.counter_date || r.date) : r.date;
    if (ACTIVE.includes(r.status) && (!d || d >= today)) upcoming.push(r);
    else past.push(r);
  });
  const key = r => `${r.date || '9999'} ${r.time || ''}`;
  upcoming.sort((a, b) => key(a).localeCompare(key(b)));
  past.sort((a, b) => key(b).localeCompare(key(a)));
  return { upcoming, past };
}

// 「10月24日（金）」
export function fmtDay(ymd) {
  if (!ymd) return '日時未定';
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  if (!y) return String(ymd);
  const w = '日月火水木金土'[new Date(y, m - 1, d).getDay()];
  const thisYear = new Date().getFullYear();
  return `${y !== thisYear ? `${y}年` : ''}${m}月${d}日（${w}）`;
}

// 「あと3日」「今日」「明日」
export function fmtUntil(ymd) {
  if (!ymd) return '';
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(y, m - 1, d) - t) / 86400000);
  if (diff === 0) return '今日';
  if (diff === 1) return '明日';
  if (diff > 1) return `あと${diff}日`;
  return '';
}

export const hhmm = t => (t ? String(t).slice(0, 5) : '');

// 共通の見た目。ページごとに色を書かない
export const RES_CSS = `
  .rs-chip { display: inline-flex; align-items: center; min-height: 24px; padding: 0 10px; border-radius: 99px; font-size: 12px; font-weight: 700; white-space: nowrap; border: 1px solid rgba(232,228,220,0.3); color: #e8e4dc; background: transparent; }
  .rs-chip--ok { background: #c8a45a; border-color: #c8a45a; color: #0d1117; }
  .rs-chip--act { background: #e8e4dc; border-color: #e8e4dc; color: #0d1117; }
  .rs-chip--wait { border-style: dashed; }
  .rs-chip--done { color: rgba(232,228,220,0.62); border-color: rgba(232,228,220,0.16); }
  .rs-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; border: 1px solid rgba(232,228,220,0.22); background: transparent; color: #e8e4dc; transition: background .15s, border-color .15s; }
  .rs-btn:hover { background: rgba(232,228,220,0.06); }
  .rs-btn:focus-visible { outline: 2px solid #c8a45a; outline-offset: 2px; }
  .rs-btn:disabled { opacity: .45; cursor: not-allowed; }
  .rs-btn--primary { background: #c8a45a; border-color: #c8a45a; color: #0d1117; }
  .rs-btn--primary:hover { background: #d6b46c; }
  .rs-btn--quiet { border-color: transparent; color: rgba(232,228,220,0.75); padding: 0 8px; }
  .rs-link { color: #e8e4dc; font-size: 13px; font-weight: 700; text-decoration: underline; text-decoration-color: rgba(200,164,90,0.7); text-underline-offset: 4px; }
`;
