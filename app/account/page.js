'use client';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const sb = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

const STATUS_LABELS = {
  pending: '返答待ち', approved: '承認済み', rejected: 'お断り',
  counter_proposed: '代替提案あり', visited: '来店確認済み',
  cancelled: 'キャンセル済み', expired: '期限切れ',
};
const STATUS_COLORS = {
  pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444',
  counter_proposed: '#6366f1', visited: '#059669', cancelled: '#9ca3af', expired: '#9ca3af',
};

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return String(d); }
}

function fmtRemaining(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return { text: '期限切れ', urgent: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const text = h >= 1 ? `残り${h}時間${m > 0 ? m + '分' : ''}` : `残り${m}分`;
  return { text, urgent: diff < 3 * 3600000 };
}

/* ── 予約カード ── */
function ReservationCard({ r, onRefresh }) {
  const [acting, setActing] = useState(false);
  const color = STATUS_COLORS[r.status] || '#6b7280';
  const label = STATUS_LABELS[r.status] || r.status;

  const menuMatch = (r.note || '').match(/【メニュー】([^\n]+)/);
  const menuText = menuMatch ? menuMatch[1] : '';
  const userMsg = (r.note || '')
    .replace(/【メニュー】[^\n]*/g, '')
    .replace(/【第[23]希望】\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/g, '')
    .trim();

  async function patch(status, extra = {}) {
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      });
      if (res.ok) onRefresh();
      else { const e = await res.json().catch(() => {}); alert('エラー: ' + (e?.error || res.status)); }
    } finally { setActing(false); }
  }

  const remaining = fmtRemaining(r.counter_expires_at);

  return (
    <div style={{
      border: `1.5px solid ${r.status === 'counter_proposed' ? '#818cf8' : '#e5e7eb'}`,
      borderRadius: '14px', padding: '18px', marginBottom: '12px',
      background: r.status === 'counter_proposed' ? '#fafafe' : '#fff',
    }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <div>
          <Link href={`/provider/${r.provider_slug || ''}`}
            style={{ fontSize: '16px', fontWeight: '800', color: '#111', textDecoration: 'none' }}>
            {r.provider_name || '掲載者'}
          </Link>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>{fmtDate(r.created_at)} 送信</p>
        </div>
        <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '99px', background: color + '20', color, alignSelf: 'flex-start' }}>
          {label}
        </span>
      </div>

      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 6px' }}>
        📅 第1希望: {r.reserved_date || '—'} {r.start_time || ''}
      </p>
      {menuText && <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', margin: '0 0 8px' }}>🎯 {menuText}</p>}
      {userMsg && <div style={{ fontSize: '13px', color: '#374151', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '10px' }}>{userMsg}</div>}

      {/* 承認済み：確定日時 */}
      {r.status === 'approved' && r.confirmed_date && (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', marginBottom: '10px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#15803d', margin: '0 0 4px' }}>✓ 確定日時</p>
          <p style={{ fontSize: '15px', fontWeight: '800', color: '#15803d', margin: 0 }}>{fmtDate(r.confirmed_date)} {r.confirmed_time}</p>
        </div>
      )}

      {/* 代替提案 */}
      {r.status === 'counter_proposed' && (
        <div style={{ padding: '14px 16px', background: '#eef2ff', border: '1.5px solid #818cf8', borderRadius: '10px', marginBottom: '10px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#4f46e5', margin: '0 0 6px' }}>📋 掲載者から代替日時の提案があります</p>
          <p style={{ fontSize: '16px', fontWeight: '800', color: '#4f46e5', margin: '0 0 8px' }}>
            {fmtDate(r.counter_date)} {r.counter_time}
          </p>
          {r.provider_comment && <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 8px' }}>{r.provider_comment}</p>}
          {/* 回答期限 */}
          {remaining ? (
            <p style={{ fontSize: '12px', fontWeight: '700', color: remaining.urgent ? '#ef4444' : '#6b7280', margin: '0 0 12px' }}>
              ⏰ {remaining.text}に自動キャンセル
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px' }}>
              ⏰ お早めにご返答ください（24時間以内推奨）
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => patch('approved', { confirmed_date: r.counter_date, confirmed_time: r.counter_time })}
              disabled={acting}
              style={{ flex: 1, padding: '10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: acting ? 'not-allowed' : 'pointer', minWidth: '140px' }}
            >
              {acting ? '処理中…' : 'この日時で承認する'}
            </button>
            <button
              onClick={() => { if (confirm('キャンセルしますか？')) patch('cancelled'); }}
              disabled={acting}
              style={{ padding: '10px 16px', background: '#fff', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', cursor: acting ? 'not-allowed' : 'pointer' }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* お断り */}
      {r.status === 'rejected' && r.provider_comment && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '10px', fontSize: '13px', color: '#374151' }}>
          掲載者より: {r.provider_comment}
        </div>
      )}

      {/* キャンセルボタン（返答待ち） */}
      {r.status === 'pending' && (
        <button
          onClick={() => { if (confirm('リクエストをキャンセルしますか？')) patch('cancelled'); }}
          disabled={acting}
          style={{ marginTop: '6px', padding: '7px 14px', background: '#fff', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: acting ? 'not-allowed' : 'pointer' }}
        >
          {acting ? '処理中…' : 'リクエストをキャンセル'}
        </button>
      )}
    </div>
  );
}

/* ── メインコンポーネント ── */
function AccountContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [rsvLoading, setRsvLoading] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
      if (session?.user?.email) fetchReservations(session.user.email);
    }).catch(() => setLoading(false));
  }, []);

  const fetchReservations = useCallback(async (email) => {
    setRsvLoading(true);
    try {
      const res = await fetch(`/api/reservations/by-contact?contact=${encodeURIComponent(email)}`);
      if (res.ok) setReservations(await res.json());
    } finally { setRsvLoading(false); }
  }, []);

  async function handleSignOut() {
    await sb.auth.signOut();
    window.location.href = '/pages/user/login.html';
  }

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
      読み込み中…
    </div>
  );

  if (!user) return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
      <p style={{ fontSize: '20px', margin: '0 0 8px' }}>🔒</p>
      <h1 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px' }}>ログインが必要です</h1>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>マイページを利用するにはログインしてください。</p>
      <a href="/pages/user/login.html" style={{ padding: '12px 28px', background: '#111', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: '700', display: 'inline-block' }}>
        ログイン
      </a>
    </div>
  );

  const pending = reservations.filter(r => r.status === 'pending').length;
  const counter = reservations.filter(r => r.status === 'counter_proposed').length;
  const approved = reservations.filter(r => r.status === 'approved').length;

  const TABS = [
    { id: 'overview', label: '概要' },
    { id: 'reservations', label: `予約履歴${reservations.length ? ` (${reservations.length})` : ''}` },
  ];

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: '800', margin: '0 0 4px' }}>マイページ</h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>{user.email}</p>
        </div>
        <button onClick={handleSignOut} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
          ログアウト
        </button>
      </div>

      {/* 代替提案バナー */}
      {counter > 0 && (
        <div onClick={() => setTab('reservations')} style={{ padding: '14px 18px', background: '#eef2ff', border: '1.5px solid #818cf8', borderRadius: '12px', marginBottom: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#4f46e5', margin: 0 }}>
            代替日時の提案が{counter}件届いています → タップして確認
          </p>
        </div>
      )}

      {/* タブ */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '24px', gap: '4px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 18px', fontSize: '14px', fontWeight: tab === t.id ? '800' : '500',
            color: tab === t.id ? '#111' : '#6b7280', background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid #111' : '2px solid transparent',
            marginBottom: '-2px', cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '20px', background: '#fff' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 14px' }}>予約状況</h2>
            {reservations.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>まだ予約はありません</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>合計 <strong>{reservations.length}件</strong></p>
                {counter > 0 && <p style={{ fontSize: '13px', color: '#6366f1', fontWeight: '700', margin: 0 }}>📋 代替提案あり: {counter}件</p>}
                {pending > 0 && <p style={{ fontSize: '13px', color: '#f59e0b', margin: 0 }}>⏳ 返答待ち: {pending}件</p>}
                {approved > 0 && <p style={{ fontSize: '13px', color: '#10b981', margin: 0 }}>✓ 承認済み: {approved}件</p>}
              </div>
            )}
            <button onClick={() => setTab('reservations')} style={{ marginTop: '14px', padding: '9px 18px', background: '#111', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              予約履歴を見る
            </button>
          </div>
          <div style={{ border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '20px', background: '#fff' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 12px' }}>サービスを探す</h2>
            <Link href="/search" style={{ padding: '10px 20px', background: '#111', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '700', display: 'inline-block' }}>
              検索する
            </Link>
          </div>
        </div>
      )}

      {/* 予約履歴タブ */}
      {tab === 'reservations' && (
        <div>
          {rsvLoading ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>読み込み中…</p>
          ) : reservations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '16px', border: '1px dashed #d1d5db' }}>
              <p style={{ fontSize: '28px', margin: '0 0 10px' }}>📭</p>
              <p style={{ fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>予約履歴がありません</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>サービスページから予約リクエストを送ってみましょう</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 14px' }}>{reservations.length}件</p>
              {reservations.map(r => (
                <ReservationCard key={r.id} r={r} onRefresh={() => fetchReservations(user.email)} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>読み込み中…</div>}>
      <AccountContent />
    </Suspense>
  );
}
