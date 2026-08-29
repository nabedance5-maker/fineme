'use client';
// 診断起点LP（店舗SaaS実装仕様書 SAAS-020）。
// Me Scan/Mirrorの優先軸に一致する店舗の体験メニュー・施術事例・スタッフを表示する。
// 事例(cases)はユーザー本人が承認済み(approved_by_user=true)のものだけがAPI側で返る。
import { useEffect, useState } from 'react';
import { PROVIDER_AXIS_LABELS } from '@/lib/provider-axes';

const AXIS_LABELS = PROVIDER_AXIS_LABELS;

export default function ProviderLandingPage({ params }) {
  const { slug, axis } = params;
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | not-found

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/providers/${slug}/landing?axis=${encodeURIComponent(axis)}`)
      .then(res => {
        if (!res.ok) throw new Error('not-found');
        return res.json();
      })
      .then(d => { if (!cancelled) { setData(d); setStatus('ready'); } })
      .catch(() => { if (!cancelled) setStatus('not-found'); });

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'provider_lp_view', { provider_slug: slug, axis });
    }
    return () => { cancelled = true; };
  }, [slug, axis]);

  if (status === 'loading') return <main className="section"><div className="container">読み込み中…</div></main>;
  if (status === 'not-found' || !data?.provider) {
    return (
      <main className="section">
        <div className="container stack">
          <p>ページが見つかりませんでした。</p>
          <p><a href={`/provider/${slug}`}>店舗ページへ戻る</a></p>
        </div>
      </main>
    );
  }

  const { provider, menus, cases, staff } = data;
  const axisLabel = AXIS_LABELS[axis] || axis;

  function trackCta(kind) {
    if (typeof window.gtag === 'function') window.gtag('event', 'provider_lp_cta_click', { provider_slug: slug, axis, kind });
  }

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 860, margin: '0 auto', gap: 32 }}>
        {/* ヒーロー */}
        <section className="stack" style={{ gap: 10 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{provider.name}</p>
          <h1 className="section-title" style={{ margin: 0 }}>{axisLabel}が気になるあなたへ</h1>
          {provider.catchphrase && <p style={{ fontSize: 16, color: 'var(--color-muted)', margin: 0 }}>{provider.catchphrase}</p>}
        </section>

        {/* おすすめメニュー */}
        {menus?.length > 0 && (
          <section className="stack" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>おすすめの体験メニュー</h2>
            <div className="stack" style={{ gap: 12 }}>
              {menus.map(m => (
                <div key={m.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{m.name}</strong>
                    <span className="muted">¥{Number(m.price).toLocaleString()}／{m.duration_min}分</span>
                  </div>
                  {m.description && <p className="muted" style={{ fontSize: 14, margin: '8px 0 0' }}>{m.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 施術事例 */}
        {cases?.length > 0 && (
          <section className="stack" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>施術事例</h2>
            <div className="cols c2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
              {cases.map(c => (
                <div key={c.id} className="card" style={{ padding: 16, textAlign: 'center' }}>
                  {c.image_url && <img src={c.image_url} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
                  {c.user_type && <p className="muted" style={{ fontSize: 12, margin: '0 0 4px' }}>{c.user_type}タイプ</p>}
                  <p style={{ margin: 0, fontWeight: 700 }}>{c.before_score} → {c.after_score}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* スタッフ紹介 */}
        {staff?.length > 0 && (
          <section className="stack" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>スタッフ紹介</h2>
            <div className="cols c2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
              {staff.map(s => (
                <div key={s.id} className="card" style={{ padding: 16 }}>
                  <strong>{s.name}</strong>{s.role ? <span className="muted"> ／ {s.role}</span> : null}
                  {s.bio && <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>{s.bio}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 予約導線 */}
        <section className="card stack" style={{ padding: 24, gap: 10, textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 700 }}>{provider.name}に相談してみる</p>
          <a className="btn" href={`/provider/${slug}`} onClick={() => trackCta('view_profile')}>店舗ページで詳しく見る</a>
        </section>
      </div>
    </main>
  );
}
