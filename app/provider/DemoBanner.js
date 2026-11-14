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

export default function DemoBanner() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const check = () => setOn(isDemoEmail(tokenEmail()));
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, []);
  if (!on) return null;
  return (
    <div role="status" style={{ position: 'sticky', top: 0, zIndex: 1000, background: '#1f2a44', color: '#fff', fontSize: 13, lineHeight: 1.6, padding: '8px 16px', textAlign: 'center' }}>
      デモ用の店舗です。お客様・予約・売上はすべて架空のデータです。入力した内容は、デモを使う他の方にも見えます（毎晩、元の状態に戻ります）。
      メール・LINEの送信、決済、アカウントの変更は行われません。
    </div>
  );
}
