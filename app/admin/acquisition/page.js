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

function StatusPill({ ok, onLabel, offLabel }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px',
      background: ok ? '#dcfce7' : '#fef3c7', color: ok ? '#16a34a' : '#b45309',
    }}>
      {ok ? onLabel : offLabel}
    </span>
  );
}

function Section({ title, status, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#374151', margin: 0 }}>{title}</h2>
        {status}
      </div>
      {children}
    </div>
  );
}

export default function AdminAcquisitionPage() {
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
      const res = await fetch('/api/admin/acquisition-stats', { headers: { 'x-admin-key': k } });
      if (res.status === 401) { setError('管理者キーが必要です'); return; }
      const data = await res.json();
      if (data?.error) { setError(data.error); return; }
      setStats(data);
    } catch (e) { setError(e.message); }
  }

  return (
    <div style={{ color: '#111827' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📣 集客施策ダッシュボード</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
        2026-08-03新設：Pinterest・提携店舗B2B2C・借り場コンテンツ・Mirror Xレーンの稼働状況
      </p>

      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
      {stats == null && !error && <div style={{ color: '#6b7280', padding: '40px 0', textAlign: 'center' }}>読み込み中...</div>}

      {stats && (
        <>
          <Section
            title="Pinterest"
            status={<StatusPill ok={stats.channels.pinterest.configured} onLabel="API連携済み・自動投稿中" offLabel="トークン未設定・メール下書き中" />}
          >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <Card label="自動投稿済み" value={stats.channels.pinterest.autoPosted} />
              <Card label="メール下書きのみ" value={stats.channels.pinterest.emailedOnly} />
            </div>
            {stats.channels.pinterest.recentPosts.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
                {stats.channels.pinterest.recentPosts.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#374151', padding: '6px 0', borderBottom: i < stats.channels.pinterest.recentPosts.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <b>{p.source}</b>・{p.posted ? '自動投稿' : 'メール下書き'}・{new Date(p.at).toLocaleDateString('ja-JP')}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="提携店舗 New Me Log ツールキット">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Card label="active掲載店舗" value={stats.channels.providerToolkit.activeProviders} />
              <Card label="案内済み" value={stats.channels.providerToolkit.announced} accent="#16a34a" />
              <Card label="未案内（次回発火で送信）" value={stats.channels.providerToolkit.pending} accent={stats.channels.providerToolkit.pending > 0 ? '#b45309' : undefined} />
            </div>
          </Section>

          <Section
            title="借り場コンテンツ（知恵袋・ガールズちゃんねる）"
            status={<StatusPill ok={stats.channels.qandaScout.configured} onLabel="検索API連携・生きた質問を自動検索中" offLabel="検索API未設定・回答ストックのみ" />}
          >
            {stats.channels.qandaScout.lastRuns.length > 0 ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
                {stats.channels.qandaScout.lastRuns.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#374151', padding: '6px 0' }}>
                    {r.mode === 'live_scout' ? '候補' : 'ストック'} {r.detail} ・ {new Date(r.at).toLocaleDateString('ja-JP')}
                  </div>
                ))}
              </div>
            ) : <p style={{ fontSize: 13, color: '#9ca3af' }}>まだ実行履歴がありません（次回スケジュールで初回実行）。</p>}
          </Section>

          <Section title="Mirror「でお実体験」Xレーン">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Card label="投稿済み" value={stats.channels.xExperienceLane.postedCount} />
            </div>
            {stats.channels.xExperienceLane.postedCount === 0 && (
              <p style={{ fontSize: 13, color: '#b45309', marginTop: 8 }}>
                0件＝まだ `EXPERIENCE_CONTEXTS`（x-post/route.js）の実話が未記入の可能性。記入するまでは自動でtipsに差し替わる仕様。
              </p>
            )}
          </Section>

          <Section title="流入元（直近30日・/log・/diagnosis等への?src=着弾）">
            {stats.srcInbound30d.length > 0 ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
                {stats.srcInbound30d.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', padding: '6px 0', borderBottom: i < stats.srcInbound30d.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <span>{s.src}</span><b>{s.count}</b>
                  </div>
                ))}
              </div>
            ) : <p style={{ fontSize: 13, color: '#9ca3af' }}>まだ流入計測がありません。</p>}
          </Section>

          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 20 }}>
            集計時刻: {new Date(stats.generatedAt).toLocaleString('ja-JP')}
            <button onClick={() => load()} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: 8 }}>再読み込み</button>
          </p>
        </>
      )}
    </div>
  );
}
