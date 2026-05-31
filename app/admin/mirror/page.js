'use client';
import { useEffect, useState } from 'react';

function Card({ label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', flex: '1 1 160px', minWidth: 160 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: accent || '#111827', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function FunnelBlock({ title, d }) {
  if (!d) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#374151', marginBottom: 12 }}>{title}</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Card label="分析数（利用）" value={d.total} />
        <Card label="¥500 購入" value={d.purchases} sub={`売上 ¥${d.revenue.toLocaleString()}`} accent="#c9a84c" />
        <Card label="無料→課金 転換率" value={`${d.conversionRate}%`} accent="#16a34a" />
        <Card label="無料アンロック" value={d.freeUnlocks} sub="サブスク/紹介/運営" />
        <Card label="プレビューのみ" value={d.previewOnly} />
      </div>
    </div>
  );
}

export default function AdminMirrorPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setStats(null); setError('');
    try {
      const res = await fetch('/api/admin/mirror-stats', {
        headers: { 'x-admin-key': sessionStorage.getItem('fineme:admin:key') || '' },
      });
      if (res.status === 401) { setError('管理者キーが必要です'); return; }
      const data = await res.json();
      if (data?.error) { setError(data.error); return; }
      setStats(data);
    } catch (e) { setError(e.message); }
  }

  return (
    <div style={{ color: '#111827' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🪞 Mirror ダッシュボード</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>利用数・無料→課金転換・紹介経由・フィードバックの推移</p>

      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
      {stats == null && !error && <div style={{ color: '#6b7280', padding: '40px 0', textAlign: 'center' }}>読み込み中...</div>}

      {stats && (
        <>
          <FunnelBlock title="直近7日間" d={stats.last7d} />
          <FunnelBlock title="直近30日間" d={stats.last30d} />
          <FunnelBlock title="累計" d={stats.all} />

          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#374151', marginBottom: 12 }}>サブスク・紹介</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <Card label="サブスク加入（active）" value={stats.subscription.active} sub={`MRR ¥${stats.subscription.mrr.toLocaleString()}`} accent="#c9a84c" />
            <Card label="紹介成立（累計）" value={stats.referral.total} sub={`7日 ${stats.referral.last7d} / 30日 ${stats.referral.last30d}`} accent="#2563eb" />
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#374151', marginBottom: 12 }}>Mirror フィードバック（声）</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <Card label="回答数" value={stats.feedback.count} />
            <Card label="分析の的確さ（平均）" value={stats.feedback.avgAccuracy || '-'} sub="★5中" />
            <Card label="また使いたい（平均）" value={stats.feedback.avgRevisit || '-'} sub="★5中" />
          </div>
          {stats.feedback.recentComments.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>最近の「気づき」コメント（LP掲載候補）</div>
              {stats.feedback.recentComments.map((c, i) => (
                <div key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, padding: '8px 0', borderBottom: i < stats.feedback.recentComments.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  「{c.comment}」
                  <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{new Date(c.created_at).toLocaleDateString('ja-JP')}</span>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 20 }}>
            集計時刻: {new Date(stats.generatedAt).toLocaleString('ja-JP')}
            <button onClick={load} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>再読み込み</button>
          </p>
        </>
      )}
    </div>
  );
}
