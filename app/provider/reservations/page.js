'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = typeof window !== 'undefined'
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

const STATUS_LABEL = {
  pending:          { text: '申請中',     color: '#f59e0b' },
  approved:         { text: '確定済み',   color: '#10b981' },
  counter_proposed: { text: '代替提案中', color: '#6366f1' },
  visited:          { text: '来店済み',   color: '#64748b' },
  rejected:         { text: 'お断り',     color: '#ef4444' },
  cancelled:        { text: 'キャンセル', color: '#ef4444' },
  expired:          { text: '期限切れ',   color: '#94a3b8' },
};

export default function ProviderReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState(null);
  const [providerId, setProviderId] = useState(null);
  const [visiting, setVisiting] = useState(null); // 処理中のID

  // 認証 + 掲載者情報を取得
  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('ログインが必要です');
        setLoading(false);
        return;
      }
      const t = session.access_token;
      setToken(t);

      const res = await fetch('/api/provider/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) { setError('掲載者情報の取得に失敗しました'); setLoading(false); return; }
      const me = await res.json();
      setProviderId(me.id);
    })();
  }, []);

  // 予約一覧を取得
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
      if (!res.ok) throw new Error('予約一覧の取得に失敗しました');
      const data = await res.json();
      // 最新順にソート
      setReservations((Array.isArray(data) ? data : []).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      ));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVisited(id) {
    if (!confirm('このお客様の来店を確認しますか？\n確認後、体験談依頼メールが自動送信されます。')) return;
    setVisiting(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'visited' }),
      });
      if (!res.ok) throw new Error('来店確認に失敗しました');
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'visited' } : r));
      alert('来店確認しました。体験談依頼メールを送信しました。');
    } catch (e) {
      alert(e.message);
    } finally {
      setVisiting(null);
    }
  }

  const statusInfo = (r) => {
    let s = r.status;
    if (s === 'counter_proposed' && r.counter_expires_at && new Date(r.counter_expires_at) < new Date()) s = 'expired';
    return STATUS_LABEL[s] || { text: s, color: '#94a3b8' };
  };

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '1000px' }}>
        <h1 className="section-title">予約一覧</h1>
        <p className="muted">来店確認を行うと、体験談依頼メールが自動送信されます。</p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {loading && <p className="muted">読み込み中...</p>}

        {!loading && !error && reservations.length === 0 && (
          <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
            <p className="muted">予約がまだありません。</p>
          </div>
        )}

        <div className="stack">
          {reservations.map(r => {
            const { text: statusText, color: statusColor } = statusInfo(r);
            const dateStr = r.confirmed_date || r.reserved_date || '';
            const timeStr = r.confirmed_time || r.start_time || '';
            return (
              <div key={r.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="stack" style={{ gap: '4px', flex: 1 }}>
                    <strong>{r.user_name || '（名前なし）'}</strong>
                    <span className="muted" style={{ fontSize: '0.875rem' }}>
                      {r.service_name && <>{r.service_name} ／ </>}
                      来店予定: {dateStr} {timeStr}
                    </span>
                    {r.user_contact && (
                      <span className="muted" style={{ fontSize: '0.875rem' }}>
                        連絡先: {r.user_contact}
                      </span>
                    )}
                    {r.note && (
                      <span className="muted" style={{ fontSize: '0.875rem' }}>
                        メモ: {r.note}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600, padding: '2px 10px',
                      borderRadius: '9999px', background: `${statusColor}22`, color: statusColor,
                      border: `1px solid ${statusColor}44`,
                    }}>
                      {statusText}
                    </span>
                    {r.status === 'approved' && (
                      <button
                        className="btn"
                        style={{ fontSize: '0.875rem', padding: '6px 14px' }}
                        disabled={visiting === r.id}
                        onClick={() => handleVisited(r.id)}
                      >
                        {visiting === r.id ? '処理中...' : '来店確認'}
                      </button>
                    )}
                  </div>
                </div>
                {r.price > 0 && (
                  <p className="muted" style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                    料金: ¥{r.price.toLocaleString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
