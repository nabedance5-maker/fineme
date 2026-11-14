'use client';
// 営業用のデモ店舗に入っている時だけ、画面の上に常に出す帯（2026-11-14）。
// ログインのトークンのメールが demo.fineme.me の時だけ表示する（表示だけの判定。止める処理はサーバー側）
import { useEffect, useState } from 'react';
import { isDemoEmail } from '@/lib/demo';

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

export default function DemoBanner() {
  const [on, setOn] = useState(false);
  const [folded, setFolded] = useState(false);
  useEffect(() => {
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
          デモ中
        </button>
      </>
    );
  }
  return (
    <div role="status" className="demo-note is-open" style={{ borderRadius: 12, fontSize: 12, lineHeight: 1.6, padding: '8px 40px 8px 14px' }}>
      <style>{css}</style>
      デモ用の店舗です。データはすべて架空で、入力した内容は他の方にも見えます（毎晩元に戻ります）。メール・LINEの送信、決済、アカウントの変更は行われません。
      <button type="button" onClick={() => fold(true)} aria-label="注意書きをたたむ"
        style={{ position: 'absolute', top: 4, right: 4, width: 32, height: 32, border: 'none', background: 'transparent', color: '#fff', fontSize: 16, cursor: 'pointer' }}>
        ×
      </button>
    </div>
  );
}
