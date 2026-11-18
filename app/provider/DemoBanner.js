'use client';
// 営業用のデモ店舗に入っている時だけ、画面の上に常に出す帯（2026-11-14）。
// ログインのトークンのメールが demo.fineme.me の時だけ表示する（表示だけの判定。止める処理はサーバー側）
import { useEffect, useState } from 'react';
import { isDemoEmail } from '@/lib/demo';
import { PROVIDER_PLANS } from '@/lib/provider-plans';

function tokenEmail() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    const s = key ? JSON.parse(localStorage.getItem(key)) : null;
    return s?.user?.email || '';
  } catch { return ''; }
}

// 上に固定するとスマホのメニューのボタン（上部の固定バー）を覆ってしまったため、画面の下に小さく出し、たためるようにした（2026-11-14 渡邉報告）。
// 重なりの順番はメニュー（40〜60）・ポップアップ（200〜）より下にする
const FOLD_KEY = 'fineme:demo:banner-folded';
// どのプランの見え方で管理画面を見せるか（2026-11-18 渡邉依頼）。管理画面が /api/provider/features 等に x-plan-preview として付け、
// サーバーはデモ店舗（と運営本人）の時だけ見え方を差し替える。デモ店舗は特例＝Cと同じ全機能なので、何も選んでいない状態をCとして扱う
const PREVIEW_KEY = 'fineme:planPreview';
function readPreview() {
  try { const v = sessionStorage.getItem(PREVIEW_KEY); return ['A', 'B'].includes(v) ? v : 'C'; } catch { return 'C'; }
}
function choosePlan(current, next) {
  if (current === next) return;
  try { if (next === 'C') sessionStorage.removeItem(PREVIEW_KEY); else sessionStorage.setItem(PREVIEW_KEY, next); } catch { return; }
  location.reload();
}

export default function DemoBanner() {
  const [on, setOn] = useState(false);
  const [folded, setFolded] = useState(false);
  const [plan, setPlan] = useState('C');
  useEffect(() => {
    setPlan(readPreview());
    const check = () => setOn(isDemoEmail(tokenEmail()));
    check();
    try { setFolded(sessionStorage.getItem(FOLD_KEY) === '1'); } catch {}
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, []);
  if (!on) return null;
  const fold = v => { setFolded(v); try { sessionStorage.setItem(FOLD_KEY, v ? '1' : '0'); } catch {} };
  // 位置：パソコンは左のメニュー（244px）の右・下の端。スマホは右下のAIコンサルのボタンの上に出す
  const css = `.demo-note { position: fixed; z-index: 35; left: 260px; bottom: 16px; background: #1f2a44; color: #fff; box-shadow: 0 4px 14px rgba(0,0,0,.18); }
    .demo-note.is-open { width: min(480px, calc(100vw - 560px)); min-width: 280px; }
    @media (max-width: 900px) { .demo-note { left: 12px; bottom: 72px; } .demo-note.is-open { width: calc(100vw - 24px); min-width: 0; } }`;
  if (folded) {
    return (
      <>
        <style>{css}</style>
        <button type="button" className="demo-note" onClick={() => fold(false)} aria-label="デモの注意書きを開く"
          style={{ border: 'none', borderRadius: 999, fontSize: 12, padding: '6px 14px', cursor: 'pointer', minHeight: 32 }}>
          デモ中・PLAN {plan}
        </button>
      </>
    );
  }
  return (
    <div role="status" className="demo-note is-open" style={{ borderRadius: 12, fontSize: 12, lineHeight: 1.6, padding: '8px 40px 8px 14px' }}>
      <style>{css}</style>
      デモ用の店舗です。データはすべて架空で、入力した内容は他の方にも見えます（毎晩元に戻ります）。メール・LINEの送信、決済、アカウントの変更は行われません。
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontWeight: 700, marginRight: 2 }}>プランごとの見え方</span>
        <div role="group" aria-label="表示するプラン" style={{ display: 'flex', gap: 4 }}>
          {PROVIDER_PLANS.map(p => {
            const on = plan === p.key;
            return (
              <button key={p.key} type="button" aria-pressed={on} onClick={() => choosePlan(plan, p.key)}
                style={{ minHeight: 32, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: on ? 'default' : 'pointer',
                  border: on ? '1px solid #e8cf7e' : '1px solid rgba(255,255,255,.35)', background: on ? '#e8cf7e' : 'transparent', color: on ? '#1f2a44' : '#fff' }}>
                {p.key} ¥{p.price}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 11, opacity: .85, flexBasis: '100%' }}>
          {plan === 'C' ? 'いまはPLAN C（すべての機能）で表示しています。' : `いまはPLAN ${plan}で表示しています。上のプランの機能には鍵が付きます。`}
        </span>
      </div>
      <button type="button" onClick={() => fold(true)} aria-label="注意書きをたたむ"
        style={{ position: 'absolute', top: 4, right: 4, width: 32, height: 32, border: 'none', background: 'transparent', color: '#fff', fontSize: 16, cursor: 'pointer' }}>
        ×
      </button>
    </div>
  );
}
