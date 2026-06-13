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

function VoicesSection({ adminKey }) {
  const [voices, setVoices] = useState(null);
  const [metaInputs, setMetaInputs] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => { loadVoices(); }, []);

  async function loadVoices() {
    setVoices(null);
    try {
      const res = await fetch('/api/admin/mirror-feedback', {
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (data.voices) {
        setVoices(data.voices);
        const init = {};
        data.voices.forEach(v => { init[v.id] = v.lp_meta || ''; });
        setMetaInputs(init);
      }
    } catch {}
  }

  async function toggleApprove(id, currentApproved) {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await fetch('/api/admin/mirror-feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id, lp_approved: !currentApproved, lp_meta: metaInputs[id] || '' }),
      });
      setVoices(vs => vs.map(v => v.id === id ? { ...v, lp_approved: !currentApproved, lp_meta: metaInputs[id] || '' } : v));
    } catch {}
    setSaving(s => ({ ...s, [id]: false }));
  }

  async function saveMeta(id) {
    setSaving(s => ({ ...s, [`meta_${id}`]: true }));
    try {
      await fetch('/api/admin/mirror-feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id, lp_meta: metaInputs[id] || '' }),
      });
      setVoices(vs => vs.map(v => v.id === id ? { ...v, lp_meta: metaInputs[id] || '' } : v));
    } catch {}
    setSaving(s => ({ ...s, [`meta_${id}`]: false }));
  }

  const approved = voices?.filter(v => v.lp_approved).length ?? 0;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#374151', margin: 0 }}>LP掲載管理（E3収集の声）</h2>
        {voices !== null && (
          <span style={{ fontSize: 12, background: approved > 0 ? '#dcfce7' : '#f3f4f6', color: approved > 0 ? '#16a34a' : '#6b7280', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>
            {approved}件 LP掲載中 / 計{voices.length}件
          </span>
        )}
        <button onClick={loadVoices} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: 'auto' }}>再読み込み</button>
      </div>

      {voices === null && <div style={{ color: '#9ca3af', fontSize: 13 }}>読み込み中...</div>}

      {voices !== null && voices.length === 0 && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px', fontSize: 13, color: '#6b7280' }}>
          E3（購入後24h）メールへの回答がまだありません。
        </div>
      )}

      {voices !== null && voices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {voices.map(v => (
            <div
              key={v.id}
              style={{
                background: v.lp_approved ? '#f0fdf4' : '#fff',
                border: `1px solid ${v.lp_approved ? '#86efac' : '#e5e7eb'}`,
                borderRadius: 10,
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.75, margin: '0 0 8px' }}>
                    「{v.text}」
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="属性メモ（例: 20代・初挑戦）"
                      value={metaInputs[v.id] ?? ''}
                      onChange={e => setMetaInputs(m => ({ ...m, [v.id]: e.target.value }))}
                      onBlur={() => saveMeta(v.id)}
                      style={{ fontSize: 11, border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', color: '#374151', width: 200 }}
                    />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      {new Date(v.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleApprove(v.id, v.lp_approved)}
                  disabled={saving[v.id]}
                  style={{
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: saving[v.id] ? 'not-allowed' : 'pointer',
                    background: v.lp_approved ? '#ef4444' : '#16a34a',
                    color: '#fff',
                  }}
                >
                  {saving[v.id] ? '...' : v.lp_approved ? 'LP から外す' : 'LP に掲載'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminMirrorPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [adminKey, setAdminKey] = useState('');

  useEffect(() => {
    const key = sessionStorage.getItem('fineme:admin:key') || '';
    setAdminKey(key);
    load(key);
  }, []);

  async function load(key) {
    const k = key ?? adminKey;
    setStats(null); setError('');
    try {
      const res = await fetch('/api/admin/mirror-stats', {
        headers: { 'x-admin-key': k },
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

          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#374151', marginBottom: 12 }}>解約動向（直近3ヶ月）</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            {(stats.subscription.cancellations || []).map(c => (
              <Card
                key={c.month}
                label={`${c.month} 解約`}
                value={c.count === 0 ? '—' : `${c.count}件`}
                sub={c.count === 0 ? '解約なし' : undefined}
                accent={c.count > 0 ? '#ef4444' : undefined}
              />
            ))}
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#374151', marginBottom: 12 }}>Mirror フィードバック（声）</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <Card label="回答数" value={stats.feedback.count} />
            <Card label="分析の的確さ（平均）" value={stats.feedback.avgAccuracy || '-'} sub="★5中" />
            <Card label="また使いたい（平均）" value={stats.feedback.avgRevisit || '-'} sub="★5中" />
          </div>
          {stats.feedback.recentComments.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>最近の「気づき」コメント（アプリ内フィードバック）</div>
              {stats.feedback.recentComments.map((c, i) => (
                <div key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, padding: '8px 0', borderBottom: i < stats.feedback.recentComments.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  「{c.comment}」
                  <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{new Date(c.created_at).toLocaleDateString('ja-JP')}</span>
                </div>
              ))}
            </div>
          )}

          <VoicesSection adminKey={adminKey} />

          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 20 }}>
            集計時刻: {new Date(stats.generatedAt).toLocaleString('ja-JP')}
            <button onClick={() => load()} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>再読み込み</button>
          </p>
        </>
      )}
    </div>
  );
}
