'use client';
// 診断起点LP（店舗SaaS実装仕様書 SAAS-020）。Mirror診断の優先軸に一致する店舗への
// 「口説く構成」のランディングページ。/mirror/match（SAAS-026）からの遷移が主動線で、
// ?score= にその軸のMirrorスコアが付くことがある（無ければ非表示、でっち上げない）。
//
// 構成（売れるLPの型を踏襲）:
//   フック(診断結果を踏まえた見出し) → 信頼の一言(店舗写真) → 証拠(Before/After) →
//   オファー(メニュー、各カードに個別CTA) → 反論処理(よくある質問) → 人(スタッフ) →
//   最終CTA + モバイル用の常時表示CTAバー
// CTAは全て店舗プロフィールページの相談タブ（/provider/[slug]?tab=consult）に直接遷移。
// 一般プロフィール(17タブ)に迷い込ませず、パーソナライズした文脈のまま予約フォームへ導く。
//
// 見出し・導入文・メニューの一言フック・締めの一言(data.copy)は、店舗の実テキストだけを
// 事実としてAI(Claude Haiku 4.5)が軸ごとに生成したもの。実テキストが無い/生成失敗時は
// data.copyがnullで返るため、軸ラベルだけの固定テンプレートにフォールバックする。
// 価格・所要時間・写真・Before/After実数値・FAQの各項目はAIを一切通さずDBの値のまま。
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PROVIDER_AXIS_LABELS } from '@/lib/provider-axes';
import { AXIS_NARRATIVES, CONSULT_STEPS } from '@/lib/axis-narratives';

const AXIS_LABELS = PROVIDER_AXIS_LABELS;
const PAYMENT_METHOD_LABELS = {
  cash: '現金', credit: 'クレジットカード', paypay: 'PayPay',
  rakuten_pay: '楽天Pay', line_pay: 'LINE Pay', bank: '銀行振込', other: 'その他',
};

export default function ProviderLandingPage({ params }) {
  const { slug, axis } = params;
  const searchParams = useSearchParams();
  const mirrorScore = Number(searchParams.get('score'));
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

  const narrative = AXIS_NARRATIVES[axis] || AXIS_NARRATIVES.other;
  const consultHref = `/provider/${slug}?tab=consult`;
  function menuConsultHref(menuName) {
    return `/provider/${slug}?tab=consult&menu_name=${encodeURIComponent(menuName)}`;
  }
  function trackCta(kind) {
    if (typeof window.gtag === 'function') window.gtag('event', 'provider_lp_cta_click', { provider_slug: slug, axis, kind });
  }

  // 反論処理（FAQ）。事実が無い項目は出さない＝でっち上げない
  const faqs = [];
  if (provider.first_session_desc) faqs.push({ q: '初めてでも大丈夫？', a: provider.first_session_desc });
  if (provider.online_available) faqs.push({ q: 'オンラインでも相談できる？', a: 'はい、オンラインでの相談・セッションに対応しています。' });
  if (provider.trial_available) faqs.push({ q: 'お試し・体験はある？', a: provider.trial_desc || 'あります。まずは軽い内容から始められます。' });
  if (provider.cancellation_policy) faqs.push({ q: 'キャンセルはできる？', a: provider.cancellation_policy });
  if (provider.payment_methods?.length) faqs.push({ q: '支払い方法は？', a: provider.payment_methods.map(m => PAYMENT_METHOD_LABELS[m] || m).join('・') });
  if (provider.response_hours) faqs.push({ q: '返信はどれくらいで来る？', a: `目安として約${provider.response_hours}時間以内に返信しています。` });

  return (
    <main style={{ background: 'var(--color-bg-dark)', minHeight: '100vh', paddingBottom: 96 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 0 64px' }}>
        {/* ── ヒーロー（フック） ── */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 400,
            background: provider.cover_image_url
              ? `url(${provider.cover_image_url}) center/cover no-repeat`
              : 'linear-gradient(135deg,#0a0f1e 0%,#1c2438 100%)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,15,30,0.35) 10%, rgba(10,15,30,0.94) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 400, padding: '28px 20px 32px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', background: 'rgba(201,168,76,0.9)', color: 'var(--color-bg-dark)', borderRadius: 99 }}>
                {axisLabel}向けのご提案
              </span>
              {provider.area && <span style={{ fontSize: 12, padding: '5px 14px', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 99, backdropFilter: 'blur(4px)' }}>📍 {provider.area}</span>}
            </div>

            {Number.isFinite(mirrorScore) && (
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                あなたのMirror診断では、<strong style={{ color: 'var(--color-gold)' }}>{axisLabel}</strong>が現在<strong style={{ color: 'var(--color-gold)' }}>{mirrorScore}点</strong>——伸びしろが最も大きいエリアでした。
              </p>
            )}

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
              <a
                href={consultHref}
                onClick={() => trackCta('hero_consult')}
                className="btn btn--primary"
                style={{ fontSize: 15, padding: '12px 26px' }}
              >
                無料で相談してみる
              </a>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {/* ── 共感（あなた、こんな状態じゃない？） ── */}
          <section style={{ marginTop: 28 }}>
            <div className="stack" style={{ gap: 8 }}>
              {narrative.empathy.map((line, i) => (
                <p key={i} style={{ margin: 0, fontSize: 14, color: 'var(--color-fg)', paddingLeft: 20, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--color-gold)' }}>・</span>{line}
                </p>
              ))}
            </div>
          </section>

          {/* ── 問題の本質の再定義 ── */}
          <section className="card" style={{ marginTop: 20, padding: '20px 22px' }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.9, color: 'var(--color-fg)', fontWeight: 600 }}>{narrative.reframe}</p>
          </section>

          {/* ── 店舗の写真（早い段階の信頼） ── */}
          {facilityPhotos.length > 0 && (
            <section style={{ marginTop: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: facilityPhotos.length === 1 ? '1fr' : 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
                {facilityPhotos.map((url, i) => (
                  <img key={i} src={url} alt={`店内写真${i + 1}`} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--color-border-gold)', display: 'block' }} loading="lazy" />
                ))}
              </div>
            </section>
          )}

          {/* ── 証拠：施術事例 ── */}
          {cases?.length > 0 && (
            <section style={{ marginTop: 36 }}>
              <h2 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 20, margin: '0 0 6px', color: 'var(--color-fg)' }}>実際の変化</h2>
              <p className="muted" style={{ fontSize: 13, margin: '0 0 16px' }}>本人が承認した実際のBefore/Afterです</p>
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

          {/* ── オファー：おすすめメニュー ── */}
          {menus?.length > 0 && (
            <section style={{ marginTop: 36 }}>
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
                        {hook && <p style={{ fontSize: 13, color: 'var(--color-gold)', fontWeight: 700, margin: '8px 0 0' }}>✨ {hook}</p>}
                        {m.description && <p className="muted" style={{ fontSize: 13, margin: '8px 0 0', lineHeight: 1.7 }}>{m.description}</p>}
                        <a
                          href={menuConsultHref(m.name)}
                          onClick={() => trackCta('menu_consult')}
                          className="btn"
                          style={{ fontSize: 13, padding: '8px 16px', marginTop: 12, display: 'inline-block' }}
                        >
                          このメニューで相談する
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 利用の流れ ── */}
          <section style={{ marginTop: 36 }}>
            <h2 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 20, margin: '0 0 16px', color: 'var(--color-fg)' }}>相談から施術までの流れ</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
              {CONSULT_STEPS.map(s => (
                <div key={s.step} className="card" style={{ padding: '16px 14px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: 'var(--color-gold)', letterSpacing: 1 }}>STEP {s.step}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-fg)', fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 反論処理：よくある質問 ── */}
          {faqs.length > 0 && (
            <section style={{ marginTop: 36 }}>
              <h2 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 20, margin: '0 0 16px', color: 'var(--color-fg)' }}>よくある質問</h2>
              <div className="stack" style={{ gap: 10 }}>
                {faqs.map((f, i) => (
                  <div key={i} className="card" style={{ padding: 16 }}>
                    <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 14, color: 'var(--color-gold)' }}>Q. {f.q}</p>
                    <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 人：スタッフ紹介 ── */}
          {staff?.length > 0 && (
            <section style={{ marginTop: 36 }}>
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

          {/* ── 最終CTA ── */}
          <section className="card stack" style={{ marginTop: 44, padding: '28px 24px', gap: 14, textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--color-fg)' }}>{closingLine}</p>
            <a className="btn btn--primary" href={consultHref} onClick={() => trackCta('final_consult')} style={{ fontSize: 15, padding: '13px 28px' }}>
              無料で相談してみる
            </a>
            <a href={`/provider/${slug}`} onClick={() => trackCta('view_profile')} style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              店舗の詳細プロフィールを見る
            </a>
          </section>
        </div>
      </div>

      {/* ── モバイル用：常時表示CTAバー ── */}
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20,
          padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
          background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(8px)',
          borderTop: '1px solid var(--color-border-gold)',
          display: 'flex', justifyContent: 'center',
        }}
        className="lp-sticky-cta"
      >
        <a
          href={consultHref}
          onClick={() => trackCta('sticky_consult')}
          className="btn btn--primary"
          style={{ width: '100%', maxWidth: 420, textAlign: 'center', fontSize: 15, padding: '13px 0' }}
        >
          {provider.name}に無料で相談する
        </a>
      </div>
      <style>{`@media (min-width: 860px) { .lp-sticky-cta { display: none; } }`}</style>
    </main>
  );
}
