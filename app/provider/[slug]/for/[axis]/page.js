'use client';
// 診断起点LP（店舗SaaS実装仕様書 SAAS-020）。
// Me Scan/Mirrorの優先軸に一致する店舗の体験メニュー・施術事例・スタッフを表示する。
// 事例(cases)はユーザー本人が承認済み(approved_by_user=true)のものだけがAPI側で返る。
//
// 見出し・導入文・メニューの一言フック・締めの一言は、店舗の実テキストだけを事実として
// AI(Claude Haiku 4.5)が軸ごとに生成したもの(data.copy)。店舗が実テキストを何も書いて
// いない、または生成に失敗した場合はdata.copyがnullで返るため、その場合は軸ラベルだけを
// 使った固定テンプレートにフォールバックする（ここで新たな主張を作文しない）。
// 価格・所要時間・写真・Before/After実数値はAIを一切通さず、DBの値をそのまま表示する。
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

  if (status === 'loading') {
    return (
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
        読み込み中…
      </main>
    );
  }
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

  const { provider, menus, cases, staff, copy } = data;
  const axisLabel = AXIS_LABELS[axis] || axis;
  const facilityPhotos = (provider.facility_photos || []).filter(Boolean).slice(0, 4);

  const headline = copy?.headline || `${axisLabel}が気になるあなたへ`;
  const intro = copy?.intro || provider.catchphrase || '';
  const closingLine = copy?.closingLine || `${provider.name}に相談してみる`;

  function trackCta(kind) {
    if (typeof window.gtag === 'function') window.gtag('event', 'provider_lp_cta_click', { provider_slug: slug, axis, kind });
  }

  function scrollToConsult() {
    document.getElementById('lp-consult')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <main style={{ background: 'var(--color-bg-dark)', minHeight: '100vh', paddingBottom: 96 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 0 64px' }}>
        {/* ── ヒーロー ── */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 380,
            background: provider.cover_image_url
              ? `url(${provider.cover_image_url}) center/cover no-repeat`
              : 'linear-gradient(135deg,#0a0f1e 0%,#1c2438 100%)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,15,30,0.35) 10%, rgba(10,15,30,0.92) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 380, padding: '28px 20px 32px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', background: 'rgba(201,168,76,0.9)', color: 'var(--color-bg-dark)', borderRadius: 99 }}>
                {axisLabel}向けのご提案
              </span>
              {provider.area && <span style={{ fontSize: 12, padding: '5px 14px', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 99, backdropFilter: 'blur(4px)' }}>📍 {provider.area}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              {provider.photo_url && (
                <img src={provider.photo_url} alt={provider.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(201,168,76,0.6)', flexShrink: 0 }} />
              )}
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{provider.name}</p>
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 'clamp(24px,5vw,34px)', fontWeight: 800, lineHeight: 1.4, margin: '0 0 12px', color: '#fff' }}>
              {headline}
            </h1>
            {intro && <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(255,255,255,0.88)', margin: 0, maxWidth: 560 }}>{intro}</p>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 22 }}>
              {provider.price_from && (
                <span style={{ padding: '9px 16px', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)' }}>
                  ¥{Number(provider.price_from).toLocaleString()}〜
                </span>
              )}
              <button
                onClick={() => { trackCta('hero_scroll'); scrollToConsult(); }}
                style={{ padding: '12px 26px', background: 'var(--color-gold)', color: 'var(--color-bg-dark)', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-gold)' }}
              >
                {provider.name}に相談する
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {/* ── 店舗の写真 ── */}
          {facilityPhotos.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <div style={{ display: 'grid', gridTemplateColumns: facilityPhotos.length === 1 ? '1fr' : 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
                {facilityPhotos.map((url, i) => (
                  <img key={i} src={url} alt={`店内写真${i + 1}`} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--color-border-gold)', display: 'block' }} loading="lazy" />
                ))}
              </div>
            </section>
          )}

          {/* ── おすすめメニュー ── */}
          {menus?.length > 0 && (
            <section style={{ marginTop: 40 }}>
              <h2 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 20, margin: '0 0 16px', color: 'var(--color-fg)' }}>おすすめの体験メニュー</h2>
              <div className="stack" style={{ gap: 14 }}>
                {menus.map(m => {
                  const hook = copy?.menuHooks?.[m.id];
                  return (
                    <div key={m.id} className="card" style={{ display: 'flex', flexDirection: m.images?.[0] ? 'row' : 'column' }}>
                      {m.images?.[0] && (
                        <img src={m.images[0]} alt={m.name} style={{ width: 120, height: '100%', minHeight: 120, objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div style={{ padding: 18, flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <strong style={{ color: 'var(--color-fg)', fontSize: 15 }}>{m.name}</strong>
                          <span className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>¥{Number(m.price).toLocaleString()}／{m.duration_min}分</span>
                        </div>
                        {hook && (
                          <p style={{ fontSize: 13, color: 'var(--color-gold)', fontWeight: 700, margin: '8px 0 0' }}>✨ {hook}</p>
                        )}
                        {m.description && <p className="muted" style={{ fontSize: 13, margin: '8px 0 0', lineHeight: 1.7 }}>{m.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 施術事例 ── */}
          {cases?.length > 0 && (
            <section style={{ marginTop: 40 }}>
              <h2 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 20, margin: '0 0 16px', color: 'var(--color-fg)' }}>施術事例</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
                {cases.map(c => (
                  <div key={c.id} className="card" style={{ overflow: 'hidden' }}>
                    {c.image_url && <img src={c.image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: 14, textAlign: 'center' }}>
                      {c.user_type && <p className="muted" style={{ fontSize: 11, margin: '0 0 6px' }}>{c.user_type}タイプ</p>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 16 }}>
                        <span style={{ color: 'var(--color-muted)' }}>{c.before_score}</span>
                        <span style={{ color: 'var(--color-gold)' }}>→</span>
                        <span style={{ color: 'var(--color-gold)' }}>{c.after_score}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── スタッフ紹介 ── */}
          {staff?.length > 0 && (
            <section style={{ marginTop: 40 }}>
              <h2 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 20, margin: '0 0 16px', color: 'var(--color-fg)' }}>スタッフ紹介</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
                {staff.map(s => (
                  <div key={s.id} className="card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {s.photo_url
                      ? <img src={s.photo_url} alt={s.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(201,168,76,0.3)' }} />
                      : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ color: 'var(--color-fg)' }}>{s.name}</strong>{s.role ? <span className="muted"> ／ {s.role}</span> : null}
                      {s.bio && <p className="muted" style={{ fontSize: 13, margin: '6px 0 0', lineHeight: 1.6 }}>{s.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 予約導線 ── */}
          <section id="lp-consult" className="card stack" style={{ marginTop: 48, padding: '28px 24px', gap: 14, textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--color-fg)' }}>{closingLine}</p>
            <a
              className="btn btn--primary"
              href={`/provider/${slug}`}
              onClick={() => trackCta('view_profile')}
              style={{ fontSize: 15, padding: '13px 28px' }}
            >
              {provider.name}を詳しく見る
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
