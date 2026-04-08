'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = typeof window !== 'undefined'
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

const STATUS_LABEL = {
  pending:          { text: '未処理',     color: '#f59e0b' },
  approved:         { text: '承認済み',   color: '#10b981' },
  counter_proposed: { text: '代替提案中', color: '#6366f1' },
  visited:          { text: '来店済み',   color: '#64748b' },
  rejected:         { text: 'お断り',     color: '#ef4444' },
  cancelled:        { text: 'キャンセル', color: '#ef4444' },
  expired:          { text: '期限切れ',   color: '#94a3b8' },
};

export default function ProviderRequestsPage() {
  const [token, setToken] = useState(null);
  const [providerId, setProviderId] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [modal, setModal] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [counterDate, setCounterDate] = useState('');
  const [counterTime, setCounterTime] = useState('');
  const [counterNote, setCounterNote] = useState('');

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('ログインが必要です'); setLoading(false); return; }
      setToken(session.access_token);
      const res = await fetch('/api/provider/me', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) { setError('掲載者情報の取得に失敗しました'); setLoading(false); return; }
      const me = await res.json();
      setProviderId(me.id);
    })();
  }, []);

  useEffect(() => {
    if (!providerId || !token) return;
    fetchReservations();
  }, [providerId, token]);

  async function fetchReservations() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations?providerId=${encodeURIComponent(providerId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('予約情報の取得に失敗しました');
      const data = await res.json();
      setReservations((Array.isArray(data) ? data : []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = reservations.filter(r => {
    if (filter === 'pending') return r.status === 'pending' || r.status === 'counter_proposed';
    if (filter === 'all') return true;
    return r.status === filter;
  });

  function openModal(reservation, action) {
    setModal({ id: reservation.id, action, reservation });
    setCounterDate('');
    setCounterTime('');
    setCounterNote('');
  }

  async function handleAction() {
    if (!modal) return;
    setProcessing(modal.id);
    try {
      let body = {};
      if (modal.action === 'approve') {
        body = { action: 'approve', confirmed_date: modal.reservation.reserved_date, confirmed_time: modal.reservation.start_time };
      } else if (modal.action === 'reject') {
        body = { action: 'cancel_provider' };
      } else if (modal.action === 'counter') {
        if (!counterDate || !counterTime) { alert('代替日時を入力してください'); setProcessing(null); return; }
        body = { status: 'counter_proposed', counter_date: counterDate, counter_time: counterTime, counter_proposal: counterNote };
      }
      const res = await fetch(`/api/reservations/${modal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || '操作に失敗しました'); }
      const updated = await res.json();
      setReservations(prev => prev.map(r => r.id === modal.id ? updated : r));
      setModal(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setProcessing(null);
    }
  }

  const statusInfo = (r) => {
    let s = r.status;
    if (s === 'counter_proposed' && r.counter_expires_at && new Date(r.counter_expires_at) < new Date()) s = 'expired';
    return STATUS_LABEL[s] || { text: s, color: '#94a3b8' };
  };

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '900px' }}>
        <h1 className="section-title">予約リクエスト管理</h1>

        {error && (
          <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', color: '#ef4444' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'pending', label: '未処理' },
            { key: 'approved', label: '承認済み' },
            { key: 'visited', label: '来店済み' },
            { key: 'all', label: 'すべて' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)} className={filter === key ? 'btn' : 'btn btn-ghost'} style={{ fontSize: '0.875rem', padding: '6px 14px' }}>
              {label}
              {key === 'pending' && reservations.filter(r => r.status === 'pending' || r.status === 'counter_proposed').length > 0 && (
                <span style={{ marginLeft: '6px', background: '#f59e0b22', color: '#f59e0b', borderRadius: '9999px', padding: '0 6px', fontSize: '0.75rem' }}>
                  {reservations.filter(r => r.status === 'pending' || r.status === 'counter_proposed').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && <p className="muted">読み込み中...</p>}
        {!loading && filtered.length === 0 && (
          <div className="card" style={{ padding: '32px', textAlign: 'center' }}><p className="muted">該当する予約リクエストはありません。</p></div>
        )}

        <div className="stack">
          {filtered.map(r => {
            const { text: statusText, color: statusColor } = statusInfo(r);
            return (
              <div key={r.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="stack" style={{ gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong>{r.user_name || '（名前なし）'}</strong>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>{statusText}</span>
                    </div>
                    <span className="muted" style={{ fontSize: '0.875rem' }}>希望日時: {r.reserved_date} {r.start_time}</span>
                    {r.service_name && <span className="muted" style={{ fontSize: '0.875rem' }}>サービス: {r.service_name}</span>}
                    {r.user_contact && <span className="muted" style={{ fontSize: '0.875rem' }}>連絡先: {r.user_contact}</span>}
                    {r.note && <span className="muted" style={{ fontSize: '0.875rem' }}>備考: {r.note}</span>}
                    {r.status === 'counter_proposed' && r.counter_date && (
                      <span style={{ fontSize: '0.875rem', color: '#6366f1' }}>代替提案: {r.counter_date} {r.counter_time}{r.provider_comment && `（${r.provider_comment}）`}</span>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                      <button className="btn" style={{ fontSize: '0.875rem', padding: '6px 14px' }} onClick={() => openModal(r, 'approve')}>承認</button>
                      <button className="btn btn-ghost" style={{ fontSize: '0.875rem', padding: '6px 14px' }} onClick={() => openModal(r, 'counter')}>代替提案</button>
                      <button className="btn btn-ghost" style={{ fontSize: '0.875rem', padding: '6px 14px', color: '#ef4444' }} onClick={() => openModal(r, 'reject')}>お断り</button>
                    </div>
                  )}
                </div>
                <p className="muted" style={{ fontSize: '0.78rem', marginTop: '8px' }}>受付: {new Date(r.created_at).toLocaleDateString('ja-JP')}</p>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <>
          <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)', zIndex: 999 }} />
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 }}>
            <div className="card" style={{ width: 'min(100%, 480px)', padding: '24px' }}>
              <h2 style={{ margin: '0 0 16px' }}>
                {modal.action === 'approve' ? '予約を承認しますか？' : modal.action === 'reject' ? '予約をお断りしますか？' : '代替日時を提案'}
              </h2>
              {modal.action === 'counter' && (
                <div className="stack" style={{ gap: '12px', marginBottom: '16px' }}>
                  <label><span style={{ fontWeight: 600 }}>代替日 *</span><input type="date" value={counterDate} onChange={e => setCounterDate(e.target.value)} /></label>
                  <label><span style={{ fontWeight: 600 }}>代替時間 *</span><input type="time" value={counterTime} onChange={e => setCounterTime(e.target.value)} /></label>
                  <label><span style={{ fontWeight: 600 }}>コメント（任意）</span><textarea rows={2} value={counterNote} onChange={e => setCounterNote(e.target.value)} placeholder="変更理由など" /></label>
                </div>
              )}
              {modal.action === 'approve' && <p className="muted" style={{ marginBottom: '16px' }}>{modal.reservation.user_name}様の予約（{modal.reservation.reserved_date} {modal.reservation.start_time}）を承認します。確認メールが自動送信されます。</p>}
              {modal.action === 'reject' && <p className="muted" style={{ marginBottom: '16px' }}>{modal.reservation.user_name}様の予約リクエストをお断りします。</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" onClick={handleAction} disabled={!!processing} style={modal.action === 'reject' ? { background: '#ef4444' } : {}}>
                  {processing ? '処理中...' : modal.action === 'approve' ? '承認する' : modal.action === 'reject' ? 'お断りする' : '提案を送る'}
                </button>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>キャンセル</button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
