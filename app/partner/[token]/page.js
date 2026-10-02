'use client';
import { useEffect, useState } from 'react';

// 営業パートナー専用の管理画面（でお要望2026-10-02）。
// 紹介リンク・紹介コード・これまでの紹介実績・報酬額を、営業パートナー本人が
// 自分のURL（sales_partners.access_token付き）だけで確認できる。Finemeの認証
// アカウントは不要（掲載していない営業パートナーも多いため・app/staff-shift/[token]
// と同じ「推測不可能なURL＝本人確認」方式）。報酬率・計算ロジックは変更しない
// （lib/referral-summary.js を掲載者ダッシュボードの紹介報酬タブと共有）。
export default function PartnerPortalPage({ params }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetch(`/api/partner/${params.token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => setState({ loading: false, error: null, data }))
      .catch(() => setState({ loading: false, error: true, data: null }));
  }, [params.token]);

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    }).catch(() => {});
  };

  if (state.loading) {
    return <div style={wrap}><p style={{ color: '#9ca3af' }}>読み込み中…</p></div>;
  }
  if (state.error || !state.data?.partner) {
    return <div style={wrap}><p style={{ color: '#f87171' }}>このリンクは無効です。発行元にご確認ください。</p></div>;
  }

  const { partner, referrals, summary } = state.data;
  const referralUrl = `https://www.fineme.me/provider/join?ref=${encodeURIComponent(partner.referral_code)}`;

  return (
    <div style={wrap}>
      <p style={{ fontSize: '12px', color: '#9ca3af', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Fineme 営業パートナー管理画面</p>
      <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 24px', color: '#e8e4dc' }}>{partner.name} さん</h1>

      {partner.status !== 'active' && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: '#fca5a5' }}>
          現在このパートナー登録は停止中です。ご不明な点はFinemeまでお問い合わせください。
        </div>
      )}

      {/* 紹介コード・紹介URL */}
      <div style={card}>
        <div style={label}>あなたの紹介コード</div>
        <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '.04em', margin: '2px 0 14px', color: '#e8e4dc' }}>{partner.referral_code}</div>
        <div style={label}>紹介URL（この紹介コード経由で掲載申込した店舗が、あなたの紹介として記録されます）</div>
        <div style={{ fontSize: '13px', color: '#9ca3af', wordBreak: 'break-all', margin: '4px 0 14px' }}>{referralUrl}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={btn} onClick={() => copy(partner.referral_code, 'code')}>{copied === 'code' ? 'コピーしました' : 'コードをコピー'}</button>
          <button style={btn} onClick={() => copy(referralUrl, 'url')}>{copied === 'url' ? 'コピーしました' : 'URLをコピー'}</button>
        </div>
      </div>

      {/* サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', margin: '20px 0' }}>
        <StatCard label="紹介人数（合計）" value={summary.total_referred} />
        <StatCard label="課金中の紹介先" value={summary.active_count} />
        <StatCard label="今月の見込み報酬" value={`¥${(summary.pending_this_month || 0).toLocaleString()}`} accent />
        <StatCard label="累計報酬額" value={`¥${(summary.total_earned_all_time || 0).toLocaleString()}`} />
      </div>

      {/* 紹介実績一覧 */}
      <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '24px 0 10px', color: '#e8e4dc' }}>これまでの紹介実績</h2>
      {referrals.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '13px' }}>まだ紹介した掲載店舗がありません。上の紹介URLを共有して報酬を獲得しましょう。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {referrals.map(r => (
            <div key={r.referred_id} style={{ ...card, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', margin: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#e8e4dc' }}>{r.referred_name}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                  {r.billing_started ? `課金開始: ${String(r.billing_started).slice(0, 10)}` : 'まだ課金なし'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: r.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(156,163,175,0.15)', color: r.status === 'active' ? '#34d399' : '#9ca3af' }}>
                  {r.status === 'active' ? '課金中' : '未課金'}
                </span>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>累計 ¥{(r.total_earned || 0).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '32px', lineHeight: '1.7' }}>
        このページのURLはあなた専用です。第三者に共有しないでください。
      </p>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...card, margin: 0, padding: '14px 16px' }}>
      <div style={{ fontSize: '22px', fontWeight: 800, color: accent ? '#818cf8' : '#e8e4dc' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

const wrap = { maxWidth: '480px', margin: '0 auto', padding: '40px 20px 60px', background: '#0d1117', minHeight: '100vh' };
const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(232,228,220,0.12)', borderRadius: '14px', padding: '18px 20px', margin: '0 0 0' };
const label = { fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '.04em' };
const btn = { flex: 1, minWidth: '120px', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.2)', background: 'rgba(255,255,255,0.06)', color: '#e8e4dc', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };
