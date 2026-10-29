'use client';
// マイページの一番上に、お店から届いているまだ払っていないお支払い（ロッカー代・請求）を出す（2026-10-29）。
// LINEの案内を見逃しても、マイページを開けば気づけるように。無い時は何も出さない。
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { freshAccessToken } from '@/lib/browser-auth';

const yen = n => `¥${Number(n || 0).toLocaleString()}`;

export default function PendingPayments() {
  const pathname = usePathname();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let stopped = false;
    freshAccessToken()
      .then(t => (t ? fetch('/api/me/pending-payments', { headers: { Authorization: `Bearer ${t}` } }) : null))
      .then(r => (r && r.ok ? r.json() : { items: [] }))
      .then(d => { if (!stopped) setItems(d.items || []); })
      .catch(() => {});
    return () => { stopped = true; };
  }, [pathname]);

  if (!items.length) return null;
  return (
    <div role="region" aria-label="お支払いのお願い" style={{ maxWidth: '1100px', margin: '16px auto 0', padding: '0 16px' }}>
      <div style={{ border: '1px solid rgba(201,168,76,0.55)', background: 'rgba(201,168,76,0.1)', borderRadius: '14px', padding: '14px 16px', color: '#e8e4dc' }}>
        <b style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>お店からお支払いのお願いが届いています</b>
        <div style={{ display: 'grid', gap: '8px' }}>
          {items.map(it => (
            <div key={`${it.kind}-${it.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0, fontSize: '13px', lineHeight: 1.6 }}>
                <span style={{ color: 'rgba(232,228,220,0.75)' }}>{it.store_name}</span><br />
                <b>{it.title}</b>　{yen(it.amount)}{it.monthly ? ' / 月' : ''}{it.due_date ? `（期限 ${it.due_date}）` : ''}
              </div>
              <a href={it.url} style={{ minHeight: '44px', padding: '0 16px', borderRadius: '10px', background: '#c9a84c', color: '#0a0f1e', fontWeight: 800, fontSize: '14px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{it.monthly ? 'カードを登録して支払う' : '支払う'}</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
