'use client';
// 使い方タブの「やりたいことから探す」（2026-11-26 渡邉要望：一覧で見られるのはいいが、もう少しうまく案内を出してほしい）。
// 目的のボタンを押すか、言葉を入れると、合う画面だけを短い説明・使い方つきで出し、そのまま開ける。
// 中身は lib/dashboard-tutorial.js（機能一覧・各タブの使い方）をそのまま使う。権限や機能設定で無いタブは出さない。
import { useEffect, useMemo, useState } from 'react';
import { FEATURE_LIST, TAB_TUTORIALS } from '@/lib/dashboard-tutorial';
import { goToTab } from './consultant-api';

const PURPOSES = [
  { label: 'ネットで予約を受けたい', keys: ['service', 'business-hours', 'slots', 'calendar', 'publish'] },
  { label: '今のお客様の情報を移したい', keys: ['data', 'customers', 'packages'] },
  { label: 'リピートを増やしたい', keys: ['customers', 'visit-settings', 'broadcast-email', 'consultant'] },
  { label: '回数券・月額会員を管理したい', keys: ['packages', 'membership-plans', 'memberships', 'membership-billing'] },
  { label: 'スタッフ・シフトを管理したい', keys: ['staff', 'shift', 'attendance'] },
  { label: '売上を記録・確認したい', keys: ['sales', 'pos', 'invoices', 'reports'] },
  { label: 'お店のLINEから送りたい', keys: ['line-channel', 'broadcast-email', 'events'] },
  { label: 'お店のページを整えたい', keys: ['profile', 'page-design', 'appeal-settings', 'stories', 'publish'] },
];

// 画面の名前に出てこない言い方でも見つかるように
const SYNONYMS = {
  data: 'CSV エクセル 乗り換え 移行 取り込み インポート 書き出し エクスポート',
  'line-channel': 'ライン LINE 公式アカウント',
  packages: '回数券 チケット コース',
  'business-hours': '定休日 休み 営業日',
  slots: '予約の受け方 予約枠 空き枠 何日先',
  customers: '顧客 お客様 カルテ 会員 名簿',
  sales: 'レジ 会計 売上',
  shift: '勤務 シフト表',
  billing: '解約 支払い 契約 プラン',
  'broadcast-email': '一斉送信 配信 お知らせ メール',
};

const CSS = `
.hf { display: grid; gap: 12px; }
.hf-search { width: 100%; box-sizing: border-box; padding: 11px 14px; font-size: 14px; border: 1.5px solid rgba(26,20,16,.15); border-radius: 12px; font-family: inherit; }
.hf-search:focus { outline: 2px solid #c9a84c; outline-offset: 1px; }
.hf-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.hf-chip { border: 1px solid rgba(26,20,16,.16); background: #fff; border-radius: 999px; padding: 7px 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; color: #1a1410; min-height: 34px; }
.hf-chip[aria-pressed="true"] { border-color: #c9a84c; background: rgba(201,168,76,.14); }
.hf-res { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); }
.hf-item { border: 1px solid rgba(26,20,16,.12); border-radius: 12px; padding: 12px 14px; display: grid; gap: 6px; align-content: start; background: #fff; }
.hf-item b { font-size: 14px; }
.hf-item p { margin: 0; font-size: 12.5px; line-height: 1.65; color: rgba(26,20,16,.65); }
.hf-item ul { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.7; color: rgba(26,20,16,.75); }
.hf-open { justify-self: start; border: 0; border-radius: 999px; padding: 7px 14px; font-weight: 800; font-size: 12.5px; cursor: pointer; color: #1a1410; background: linear-gradient(180deg, #e8cf7e, #c9a84c); min-height: 34px; }
.hf-empty { margin: 0; font-size: 13px; color: rgba(26,20,16,.6); }
.hf button:focus-visible { outline: 2px solid #2f4f8f; outline-offset: 2px; }
`;

const ITEMS = (() => {
  const seen = new Set();
  const out = [];
  FEATURE_LIST.forEach(g => g.items.forEach(it => {
    const id = it.id || it.key;
    if (seen.has(id)) return;
    seen.add(id);
    const tips = !it.id ? TAB_TUTORIALS[it.key]?.tips || [] : [];
    out.push({ id, key: it.key, flag: it.flag, label: it.label, desc: it.desc, group: g.heading, tips, text: `${it.label} ${it.desc} ${g.heading} ${tips.join(' ')} ${SYNONYMS[it.key] || ''}`.toLowerCase() });
  }));
  return out;
})();

export default function HelpFinder() {
  const [q, setQ] = useState('');
  const [purpose, setPurpose] = useState(null);
  const [available, setAvailable] = useState(null);

  // このログインで開けるタブだけを出す（スタッフの権限・機能設定でオフ・プランで使えないタブは消える）
  useEffect(() => {
    const check = () => {
      const ok = new Set();
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => {
        if (b.closest('[data-panel="hidden"]') || b.style.display === 'none') return;
        ok.add(b.dataset.tab);
      });
      setAvailable(ok);
    };
    check();
    const t = setTimeout(check, 1500);
    return () => clearTimeout(t);
  }, []);

  const results = useMemo(() => {
    const usable = ITEMS.filter(it => !available || available.has(it.key));
    if (purpose) {
      const p = PURPOSES.find(x => x.label === purpose);
      return p.keys.map(k => usable.find(it => it.key === k && !it.flag)).filter(Boolean);
    }
    const words = q.trim().toLowerCase().split(/[\s　]+/).filter(Boolean);
    if (!words.length) return null;
    return usable.filter(it => words.every(w => it.text.includes(w))).slice(0, 12);
  }, [q, purpose, available]);

  return (
    <div className="hf">
      <style>{CSS}</style>
      <input className="hf-search" type="search" value={q} placeholder="やりたいことや言葉で探す（例：回数券、CSV、シフト、LINE）"
        aria-label="使い方を探す" onChange={e => { setQ(e.target.value); setPurpose(null); }} />
      <div className="hf-chips" role="group" aria-label="やりたいことから探す">
        {PURPOSES.map(p => (
          <button key={p.label} type="button" className="hf-chip" aria-pressed={purpose === p.label}
            onClick={() => { setPurpose(purpose === p.label ? null : p.label); setQ(''); }}>{p.label}</button>
        ))}
      </div>
      {results && (results.length === 0 ? (
        <p className="hf-empty">合う画面が見つかりませんでした。別の言葉で探すか、右下のAIコンサルに聞いてみてください。</p>
      ) : (
        <div className="hf-res">
          {results.map((it, i) => (
            <div key={it.id} className="hf-item">
              <b>{purpose ? `${i + 1}. ` : ''}{it.label}</b>
              <p>{it.desc}</p>
              {it.tips.length > 0 && <ul>{it.tips.slice(0, 3).map((t, j) => <li key={j}>{t}</li>)}</ul>}
              <button type="button" className="hf-open" onClick={() => goToTab(it.key)}>この画面を開く</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
