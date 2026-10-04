'use client';
import { useEffect, useState } from 'react';
import MypageSideNav from '../_components/MypageSideNav';

const KIND_LABEL = { package: '回数券', membership: '会員プラン', other: 'その他' };

function getToken() {
  try {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) return null;
    const obj = JSON.parse(localStorage.getItem(sbKey));
    return obj?.user?.id ? obj.access_token : null;
  } catch { return null; }
}

export default function MypageContractsPage() {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  function load(token) {
    return fetch('/api/me/contract-documents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setDocs)
      .catch(() => setError('取得に失敗しました'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    load(token);
  }, []);

  async function open(id) {
    const token = getToken();
    if (!token) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/me/contract-documents/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.url) window.open(d.url, '_blank', 'noopener');
      else setError(d.error || '開けませんでした');
    } finally { setBusyId(''); }
  }

  async function acknowledge(id) {
    const token = getToken();
    if (!token) return;
    if (!confirm('この契約書の内容を確認したことを記録します。よろしいですか？')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/me/contract-documents/${id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) await load(token);
      else { const d = await res.json().catch(() => ({})); setError(d.error || '記録に失敗しました'); }
    } finally { setBusyId(''); }
  }

  return (
    <main className="section">
      <div className="container mypage-layout">
        <MypageSideNav />

        <section className="stack mypage-content">
          <h1 className="section-title">契約書</h1>
          <p className="muted" style={{ fontSize: '13px', marginTop: '-8px', lineHeight: 1.7 }}>
            店舗と交わした契約書を、店舗がここに保管している場合に表示されます。内容を確認したら「内容を確認しました」を押すと、確認した日時が記録されます。
          </p>

          {loading ? (
            <p className="muted">読み込み中...</p>
          ) : error ? (
            <p style={{ color: '#dc2626' }}>{error}</p>
          ) : docs.length === 0 ? (
            <p className="muted">表示できる契約書はまだありません。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {docs.map(d => (
                <div key={d.id} style={{ border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '18px 20px', background: '#151b24' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'rgba(232,228,220,0.5)' }}>
                    {d.provider_name}・{KIND_LABEL[d.contract_kind] || 'その他'}
                  </p>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{d.title}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(232,228,220,0.6)' }}>
                    {d.contract_date ? `契約日 ${d.contract_date}` : ''}
                    {d.note ? `${d.contract_date ? '・' : ''}${d.note}` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                    <button type="button" className="btn btn-ghost" disabled={busyId === d.id} onClick={() => open(d.id)} style={{ fontSize: '13px' }}>
                      契約書を開く
                    </button>
                    {d.customer_acknowledged_at ? (
                      <span style={{ fontSize: '12px', color: '#34d399' }}>
                        確認済み（{new Date(d.customer_acknowledged_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}）
                      </span>
                    ) : (
                      <button type="button" className="btn" disabled={busyId === d.id} onClick={() => acknowledge(d.id)} style={{ fontSize: '13px' }}>
                        内容を確認しました
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
