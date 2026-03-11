'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseAnon = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

const STATUS_LABELS = {
  pending: '返答待ち',
  approved: '承認済み',
  rejected: 'お断り',
  counter_proposed: '代替提案あり',
  visited: '来店確認済み',
  cancelled: 'キャンセル済み',
  expired: '期限切れ',
};
const STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  counter_proposed: '#6366f1',
  visited: '#059669',
  cancelled: '#9ca3af',
  expired: '#9ca3af',
};

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return String(d); }
}

function ReservationCard({ r, onRefresh }) {
  const [acting, setActing] = useState(false);
  const statusColor = STATUS_COLORS[r.status] || '#6b7280';
  const statusLabel = STATUS_LABELS[r.status] || r.status;

  // noteからメニューとメッセージを抽出
  const menuMatch = (r.note || '').match(/【メニュー】([^\n]+)/);
  const menuText = menuMatch ? menuMatch[1] : '';
  const userMsg = (r.note || '')
    .replace(/【メニュー】[^\n]*/g, '')
    .replace(/【第[23]希望】\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/g, '')
    .trim();

  async function patchStatus(status, extra = {}) {
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

  return (
    <div style={{ border: `1.5px solid ${r.status === 'counter_proposed' ? '#818cf8' : '#e5e7eb'}`, borderRadius: '16px', padding: '20px', marginBottom: '12px', background: r.status === 'counter_proposed' ? '#fafafe' : '#fff' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div>
          <Link href={`/provider/${r.provider_slug}`} style={{ fontSize: '16px', fontWeight: '800', color: '#111', textDecoration: 'none' }}>
            {r.provider_name || '掲載者'}
          </Link>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>{fmtDate(r.created_at)} 送信</p>
        </div>
        <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '99px', background: statusColor + '20', color: statusColor }}>
          {statusLabel}
        </span>
      </div>

      {/* 希望日時 */}
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
        📅 第1希望: {r.reserved_date || '—'} {r.start_time || ''}
      </div>

      {/* メニュー */}
      {menuText && <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', margin: '0 0 8px' }}>🎯 {menuText}</p>}

      {/* ユーザーメッセージ */}
      {userMsg && <div style={{ fontSize: '13px', color: '#374151', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '10px' }}>{userMsg}</div>}

      {/* 確定日時（承認済み） */}
      {r.status === 'approved' && r.confirmed_date && (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', marginBottom: '10px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#15803d', margin: '0 0 4px' }}>✓ 確定日時</p>
          <p style={{ fontSize: '15px', fontWeight: '800', color: '#15803d', margin: 0 }}>{fmtDate(r.confirmed_date)} {r.confirmed_time}</p>
        </div>
      )}

      {/* 代替提案 */}
      {r.status === 'counter_proposed' && (
        <div style={{ padding: '14px 16px', background: '#eef2ff', border: '1.5px solid #818cf8', borderRadius: '10px', marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#4f46e5', margin: '0 0 6px' }}>📋 掲載者から代替日時の提案があります</p>
          <p style={{ fontSize: '16px', fontWeight: '800', color: '#4f46e5', margin: '0 0 8px' }}>
            {fmtDate(r.counter_date)} {r.counter_time}
          </p>
          {r.provider_comment && <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 12px' }}>{r.provider_comment}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => patchStatus('approved', { confirmed_date: r.counter_date, confirmed_time: r.counter_time })}
              disabled={acting}
              style={{ flex: 1, padding: '10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: acting ? 'not-allowed' : 'pointer' }}
            >
              {acting ? '処理中…' : 'この日時で承認する'}
            </button>
            <button
              onClick={() => { if (confirm('キャンセルしますか？')) patchStatus('cancelled'); }}
              disabled={acting}
              style={{ padding: '10px 14px', background: '#fff', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', cursor: acting ? 'not-allowed' : 'pointer' }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 掲載者コメント（お断り） */}
      {r.status === 'rejected' && r.provider_comment && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#374151' }}>
          掲載者より: {r.provider_comment}
        </div>
      )}

      {/* キャンセルボタン（返答待ち） */}
      {r.status === 'pending' && (
        <button
          onClick={() => { if (confirm('この予約リクエストをキャンセルしますか？')) patchStatus('cancelled'); }}
          disabled={acting}
          style={{ marginTop: '8px', padding: '8px 16px', background: '#fff', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: acting ? 'not-allowed' : 'pointer' }}
        >
          {acting ? '処理中…' : 'リクエストをキャンセル'}
        </button>
      )}
    </div>
  );
}

function MyReservationsContent() {
  const sp = useSearchParams();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState('');
  const [inputContact, setInputContact] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    // ログイン中ユーザーのメールを自動取得
    supabaseAnon.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email || '';
      if (email) {
        setContact(email);
        setInputContact(email);
        fetchReservations(email);
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  async function fetchReservations(email) {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/by-contact?contact=${encodeURIComponent(email)}`);
      if (res.ok) setReservations(await res.json());
    } finally {
      setLoading(false);
      setSearched(true);
      setContact(email);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (inputContact.trim()) fetchReservations(inputContact.trim());
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px 80px' }}>
      <h1 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: '800', margin: '0 0 8px' }}>予約履歴</h1>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 28px' }}>
        予約リクエストの状況を確認できます。代替提案への回答もこちらから行えます。
      </p>

      {/* メール入力フォーム */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        <input
          value={inputContact}
          onChange={e => setInputContact(e.target.value)}
          placeholder="予約時に入力したメールアドレス"
          type="email"
          style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          確認する
        </button>
      </form>

      {/* 結果 */}
      {loading ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>読み込み中…</p>
      ) : !searched ? null : reservations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '16px', border: '1px dashed #d1d5db' }}>
          <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📭</p>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>予約履歴が見つかりません</p>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>予約時に使用したメールアドレスで検索してください</p>
        </div>
      ) : (
        <>
          {/* 代替提案バナー */}
          {reservations.some(r => r.status === 'counter_proposed') && (
            <div style={{ padding: '14px 18px', background: '#eef2ff', border: '1.5px solid #818cf8', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#4f46e5', margin: 0 }}>
                代替日時の提案が届いています。下記から確認・承認してください。
              </p>
            </div>
          )}
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>{reservations.length}件の予約</p>
          {reservations.map(r => (
            <ReservationCard key={r.id} r={r} onRefresh={() => fetchReservations(contact)} />
          ))}
        </>
      )}

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <Link href="/search" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none' }}>← サービスを探す</Link>
      </div>
    </div>
  );
}

export default function MyReservationsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>読み込み中…</div>}>
      <MyReservationsContent />
    </Suspense>
  );
}
