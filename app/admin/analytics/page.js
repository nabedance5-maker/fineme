'use client';
// 運営管理画面のアナリティクス（渡邉指摘 2026-11-06：データが全く入っていない。自動でリアルタイムに入るものでないと意味がない）。
// 以前はブラウザに保存したデモ用のデータ（localStorage）を読んでいた。いまはサイトの閲覧を Fineme 自身が自動で記録し
// （app/_components/PageViewTracker.js → /api/track → site_page_views）、ここで30秒ごとに読み直す。
import { useCallback, useEffect, useRef, useState } from 'react';

function getAdminKey() {
  let key = sessionStorage.getItem('fineme:admin:key') || '';
  if (!key) {
    key = prompt('管理APIキーを入力してください：') || '';
    if (key) sessionStorage.setItem('fineme:admin:key', key);
  }
  return key;
}

const RANGES = [['today', '今日'], ['7d', '7日間'], ['30d', '30日間'], ['90d', '90日間']];
const REFRESH_MS = 30 * 1000;
const card = { background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 };
const n = v => (v == null ? '—' : Number(v).toLocaleString());
const time = d => new Date(d).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

function Timeline({ data, range }) {
  if (!data?.length) return null;
  const W = 760; const H = 160; const pad = 22;
  const max = Math.max(1, ...data.map(d => d.views));
  const bw = (W - pad) / data.length;
  const label = d => (range === 'today' ? `${d.key}時` : `${Number(d.key.slice(5, 7))}/${Number(d.key.slice(8, 10))}`);
  const every = Math.ceil(data.length / 12);
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} width="100%" role="img" aria-label="閲覧数の推移" style={{ display: 'block' }}>
      <line x1={pad} y1={H} x2={W} y2={H} stroke="#111" strokeWidth="1" />
      <text x="0" y="10" fontSize="10" fill="#111">{max}</text>
      {data.map((d, i) => {
        const h = Math.round((d.views / max) * (H - 14));
        return (
          <g key={d.key}>
            <rect x={pad + i * bw + 1} y={H - h} width={Math.max(1, bw - 2)} height={h} fill="#111"><title>{`${label(d)}：閲覧 ${d.views}・訪問者 ${d.visitors}`}</title></rect>
            {i % every === 0 && <text x={pad + i * bw + bw / 2} y={H + 14} fontSize="10" textAnchor="middle" fill="#111">{label(d)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function Table({ title, rows, keyLabel }) {
  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>{title}</h3>
      {!rows?.length ? <p style={{ fontSize: 13, margin: 0 }}>まだデータがありません</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #111' }}>{keyLabel}</th><th style={{ textAlign: 'right', padding: '4px 6px', borderBottom: '1px solid #111' }}>閲覧</th><th style={{ textAlign: 'right', padding: '4px 6px', borderBottom: '1px solid #111' }}>訪問者</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key}>
                <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', wordBreak: 'break-all' }}>{r.key}</td>
                <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{n(r.views)}</td>
                <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{n(r.visitors)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const key = useRef('');

  const load = useCallback(async () => {
    if (!key.current) key.current = getAdminKey();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`, { headers: { 'x-admin-key': key.current }, cache: 'no-store' });
      if (!res.ok) { setError(res.status === 401 ? '取得エラー。管理APIキーを確認してください。' : '取得に失敗しました'); setLoading(false); return; }
      setData(await res.json());
      setError('');
    } catch { setError('取得に失敗しました'); }
    setLoading(false);
  }, [range]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const kpis = data ? [
    ['閲覧数', data.totals.views], ['訪問者', data.totals.visitors], ['訪問（セッション）', data.totals.sessions], ['1訪問あたりの閲覧', data.totals.pages_per_session],
  ] : [];

  return (
    <main className="section" style={{ textShadow: 'none', color: '#111' }}>
      <section className="stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="section-title" style={{ margin: 0 }}>アナリティクス</h1>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {RANGES.map(([k, l]) => (
              <button key={k} type="button" className={k === range ? 'btn' : 'btn btn-ghost'} style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => setRange(k)}>{l}</button>
            ))}
            <span style={{ fontSize: 12 }}>{loading ? '更新中…' : data ? `${time(data.generated_at)} 時点・30秒ごとに自動で更新` : ''}</span>
          </div>
        </div>
        <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.7 }}>サイトの閲覧は、ページを開くたびに自動で記録しています（管理画面・契約者の管理画面・個人用のURLは記録しません。個人を特定する情報は持ちません）。成果の数は各データからその場で数えています。</p>
        {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
        {data?.tracking_started && <p style={{ fontSize: 13, margin: 0 }}>{data.tracking_started}</p>}

        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <div style={{ ...card, border: '2px solid #111' }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>いま見ている人（直近5分）</div>
                <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{n(data.live.visitors)}</div>
                <div style={{ fontSize: 12 }}>閲覧 {n(data.live.views)}</div>
              </div>
              {kpis.map(([l, v]) => (
                <div key={l} style={card}><div style={{ fontSize: 12 }}>{l}</div><div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{n(v)}</div></div>
              ))}
            </div>

            <div style={card}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>閲覧数の推移（{RANGES.find(r => r[0] === range)?.[1]}）</h3>
              <Timeline data={data.timeline} range={data.range} />
            </div>

            <div style={card}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>成果（{RANGES.find(r => r[0] === range)?.[1]}）</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                {data.outcomes.map(o => (
                  <div key={o.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 12 }}>{o.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{n(o.value)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
              <Table title="よく見られたページ" rows={data.pages} keyLabel="ページ" />
              <Table title="最初に開かれたページ（入口）" rows={data.landings} keyLabel="ページ" />
              <Table title="どこから来たか" rows={data.referrers} keyLabel="参照元" />
              <Table title="広告・キャンペーン（UTM）" rows={data.utms} keyLabel="source / medium / campaign" />
              <Table title="サイトの区分" rows={data.sections} keyLabel="区分" />
              <Table title="端末" rows={data.devices} keyLabel="端末" />
            </div>

            <div style={card}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>直近の閲覧</h3>
              {!data.recent.length ? <p style={{ fontSize: 13, margin: 0 }}>まだ閲覧の記録がありません</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {data.recent.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{time(r.at)}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', wordBreak: 'break-all' }}>{r.path}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee' }}>{r.section}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee' }}>{r.referrer || ''}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee' }}>{r.device === 'mobile' ? 'スマホ' : 'パソコン'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
