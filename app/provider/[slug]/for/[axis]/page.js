'use client';
// 診断起点LP（店舗SaaS実装仕様書 SAAS-020）。Mirror診断の優先軸に一致する店舗への
// セールスレターの型で構成したランディングページ。/mirror/match（SAAS-026）からの
// 遷移が主動線で、?score= にその軸のMirrorスコアが付くことがある（無ければ非表示）。
//
// [[feedback_persuasive_lp_structure]] のセールスレター12ステップに沿って構成:
//   ①ヘッドライン → ②悩み提示 → ③痛みの増幅 → ④原因の明確化 → ⑤希望の提示 →
//   ⑥解決策として店舗登場 → ⑦得られる未来 → ⑧なぜそれができるか → ⑨実績・事例 →
//   ⑩不安・反論を潰す(FAQ) → ⑪オファー → ⑫CTA（+モバイル常時表示バー）
// ②③④⑤⑦(フォールバック)は軸ごとの汎用コピー(lib/axis-narratives.js、特定店舗の主張を
// 含まないため静的で安全)。①⑥⑦(店舗textがある場合)⑧はAI(Claude Haiku 4.5)が店舗の
// 実テキストだけを事実として生成/引用したもの。価格・所要時間・写真・実績の数値は
// AIを一切通さずDBの値のまま。
//
// CTA文言は必ず「相談する」等の中立表現にする。「無料相談」と言い切るのは誤り
// （実際は実施術・セッションが有料な店舗が大半で、相談フォームの送信自体が無料な
// だけ）。無料である事実は⑪オファー欄でのみ明示する。でお指摘（2026-08-31）。
//
// ビジュアル: スクロール時のフェードイン(Reveal)・Before/Afterのゲージ表示・
// 統一ラインアイコン(AxisIcon)・地図/羅針盤モチーフ(Fineme「地図と羅針盤」の
// タグラインに準拠)・CTAの控えめなパルスを追加。Gemini画像生成は課金停止のため
// 使わず（でお判断、2026-08-31）、外部アセット無し・手描きSVG+CSSのみで構成。
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PROVIDER_AXIS_LABELS } from '@/lib/provider-axes';
import { AXIS_NARRATIVES, AXIS_FUTURE_VISION, CONSULT_STEPS } from '@/lib/axis-narratives';
import { AxisIcon } from '@/lib/axis-icons';

const AXIS_LABELS = PROVIDER_AXIS_LABELS;
const PAYMENT_METHOD_LABELS = {
  cash: '現金', credit: 'クレジットカード', paypay: 'PayPay',
  rakuten_pay: '楽天Pay', line_pay: 'LINE Pay', bank: '銀行振込', other: 'その他',
};

function Reveal({ children, delay = 0, style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`lp-reveal${visible ? ' lp-reveal-in' : ''}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

function Section({ eyebrow, title, children, style }) {
  return (
    <section style={{ marginTop: 40, ...style }}>
      {eyebrow && (
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: 'var(--color-gold)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 1, background: 'var(--color-gold)', display: 'inline-block' }} />{eyebrow}
        </p>
      )}
      {title && <h2 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 21, margin: '0 0 16px', color: 'var(--color-fg)' }}>{title}</h2>}
      {children}
    </section>
  );
}

function ScoreGauge({ before, after }) {
  const b = Math.max(0, Math.min(100, Number(before) || 0));
  const a = Math.max(0, Math.min(100, Number(after) || 0));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{b}点</span>
        <span style={{ color: 'var(--color-gold)', fontSize: 15 }}>→</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-gold)' }}>{a}点</span>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 99, background: 'rgba(232,228,220,0.12)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${b}%`, background: 'rgba(232,228,220,0.35)' }} />
        <div className="lp-gauge-fill" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${a}%`, background: 'linear-gradient(90deg, rgba(201,168,76,0.5), var(--color-gold))' }} />
      </div>
    </div>
  );
}

// ヒーロー背景の装飾（cover_image_urlが無い店舗用）。Finemeのタグライン
// 「地図と羅針盤」に準拠し、航路線+ピン+羅針盤のラインアートを淡く敷く。
function HeroMapPattern() {
  return (
    <svg viewBox="0 0 780 340" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}>
      <path d="M-20,260 C120,220 180,300 320,240 C460,180 520,120 680,150 C740,160 780,120 820,90"
        fill="none" stroke="#c9a84c" strokeWidth="1.4" strokeDasharray="2 10" strokeLinecap="round" opacity="0.55" />
      <path d="M-40,60 C100,90 160,40 280,70 C420,105 520,40 680,80"
        fill="none" stroke="#c9a84c" strokeWidth="1" strokeDasharray="1 8" strokeLinecap="round" opacity="0.3" />
      <circle cx="320" cy="240" r="3.5" fill="#c9a84c" opacity="0.7" />
      <circle cx="680" cy="150" r="3.5" fill="#c9a84c" opacity="0.7" />
      <g transform="translate(640,60)" opacity="0.5">
        <circle r="26" fill="none" stroke="#c9a84c" strokeWidth="1" />
        <path d="M0,-20 L5,0 L0,20 L-5,0 Z" fill="#c9a84c" />
        <path d="M-20,0 L0,-5 L20,0 L0,5 Z" fill="#c9a84c" opacity="0.5" />
      </g>
    </svg>
  );
}

// スタッフ/流れセクションに使う小さな羅針盤アイコン（ブランドの一貫性用）
function CompassGlyph({ size = 28, color = 'var(--color-gold)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.3" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" fill={color} />
      <circle cx="12" cy="12" r="1" fill={color} />
    </svg>
  );
}

// STEPカードの上に置く、点線の「航路」ストリップ（地図モチーフの一貫性）
function RouteStrip() {
  return (
    <svg viewBox="0 0 400 24" preserveAspectRatio="none" style={{ width: '100%', height: 20, display: 'block', marginBottom: 4 }}>
      <line x1="10" y1="12" x2="390" y2="12" stroke="var(--color-gold)" strokeWidth="1.2" strokeDasharray="1 9" strokeLinecap="round" opacity="0.6" />
      {[10, 136.6, 263.3, 390].map((x, i) => (
        <circle key={i} cx={x} cy="12" r="3" fill="var(--color-gold)" opacity="0.85" />
      ))}
    </svg>
  );
}

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

  const { provider, menus, cases, stories, staff, copy } = data;
  const axisLabel = AXIS_LABELS[axis] || axis;
  const facilityPhotos = (provider.facility_photos || []).filter(Boolean).slice(0, 4);
  const narrative = AXIS_NARRATIVES[axis] || AXIS_NARRATIVES.other;

  const headline = copy?.headline || `${axisLabel}が気になるあなたへ`;
  const storeIntro = copy?.intro || provider.catchphrase || '';
  const futureVision = provider.transformation_pattern || AXIS_FUTURE_VISION[axis] || AXIS_FUTURE_VISION.other;
  const closingLine = copy?.closingLine || `${provider.name}に相談してみる`;

  // CTAの遷移先: 店舗が外部予約システム(booking_url)を設定していればそちらを最優先で使う
  // （店舗自身が能動的に設定した唯一の信頼できるシグナル）。無い場合は内部の相談フォームに
  // つなぐが、全店舗が予約リクエストに反応しているわけではない実態があるため
  // （app/api/cron/reservation-alert が24時間以上未回答の店舗にLINEで催促する仕組みが
  // 既にあること自体、この問題が既知であることの証拠）、「予約する」と言い切らず
  // 「問い合わせる」+返信目安の注記にとどめる。でお指摘（2026-08-31）。
  const hasExternalBooking = !!provider.booking_url;
  const consultHref = hasExternalBooking ? provider.booking_url : `/provider/${slug}?tab=consult`;
  const consultLinkProps = hasExternalBooking ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const ctaLabel = hasExternalBooking ? '予約する' : '問い合わせる';
  function menuCtaHref(menuName) {
    return hasExternalBooking ? provider.booking_url : `/provider/${slug}?tab=consult&menu_name=${encodeURIComponent(menuName)}`;
  }
  const menuCtaLabel = hasExternalBooking ? 'このメニューで予約する' : 'このメニューについて問い合わせる';
  function trackCta(kind) {
    if (typeof window.gtag === 'function') window.gtag('event', 'provider_lp_cta_click', { provider_slug: slug, axis, kind });
  }

  // ⑧なぜそれができるか：店舗が自分で書いた強み・哲学をそのまま引用（AI非経由）
  const whyItWorks = [provider.unique_strengths, provider.philosophy].filter(Boolean);

  // ⑩よくある不安・反論を潰す：事実が無い項目は出さない
  const faqs = [];
  if (provider.first_session_desc) faqs.push({ q: '初めてでも大丈夫？', a: provider.first_session_desc });
  if (provider.online_available) faqs.push({ q: 'オンラインでも相談できる？', a: 'はい、オンラインでの相談・セッションに対応しています。' });
  if (provider.cancellation_policy) faqs.push({ q: 'キャンセルはできる？', a: provider.cancellation_policy });
  if (provider.payment_methods?.length) faqs.push({ q: '支払い方法は？', a: provider.payment_methods.map(m => PAYMENT_METHOD_LABELS[m] || m).join('・') });
  if (provider.response_hours) faqs.push({ q: '返信はどれくらいで来る？', a: `目安として約${provider.response_hours}時間以内に返信しています。` });

  return (
    <main style={{ background: 'var(--color-bg-dark)', minHeight: '100vh', paddingBottom: 96 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 0 64px' }}>
        {/* ── ①ヘッドライン ── */}
        <div
          style={{
            position: 'relative', overflow: 'hidden', minHeight: 340,
            background: provider.cover_image_url
              ? `url(${provider.cover_image_url}) center/cover no-repeat`
              : 'linear-gradient(135deg,#0a0f1e 0%,#1c2438 100%)',
          }}
        >
          {!provider.cover_image_url && <HeroMapPattern />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,15,30,0.35) 10%, rgba(10,15,30,0.94) 100%)' }} />
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.25), transparent 70%)', filter: 'blur(4px)' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 340, padding: '28px 20px 32px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              <span className="lp-badge-shimmer" style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', color: 'var(--color-bg-dark)', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <AxisIcon axis={axis} size={13} color="var(--color-bg-dark)" strokeWidth={2} />{axisLabel}向けのご提案
              </span>
              {provider.area && <span style={{ fontSize: 12, padding: '5px 14px', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 99, backdropFilter: 'blur(4px)' }}>📍 {provider.area}</span>}
            </div>
            {Number.isFinite(mirrorScore) && (
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                あなたのMirror診断では、<strong style={{ color: 'var(--color-gold)' }}>{axisLabel}</strong>が現在<strong style={{ color: 'var(--color-gold)' }}>{mirrorScore}点</strong>——伸びしろが最も大きいエリアでした。
              </p>
            )}
            <h1 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 'clamp(24px,5vw,34px)', fontWeight: 800, lineHeight: 1.4, margin: 0, color: '#fff' }}>
              {headline}
            </h1>
          </div>
          <svg viewBox="0 0 780 40" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -1, width: '100%', height: 40, display: 'block' }}>
            <path d="M0,40 C130,10 260,10 390,25 C520,40 650,20 780,5 L780,40 Z" fill="var(--color-bg-dark)" />
          </svg>
        </div>

        <div style={{ padding: '0 20px' }}>
          {/* ── ②悩み・問題を提示 ── */}
          <Reveal>
            <Section eyebrow="こんな悩み、ありませんか" style={{ marginTop: 20 }}>
              <div className="stack" style={{ gap: 10 }}>
                {narrative.empathy.map((line, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'rgba(201,168,76,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                      <AxisIcon axis={axis} size={13} color="var(--color-gold)" />
                    </span>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--color-fg)', lineHeight: 1.6 }}>{line}</p>
                  </div>
                ))}
              </div>
            </Section>
          </Reveal>

          {/* ── ③このままだとどうなる（痛みの増幅） ── */}
          <Reveal>
            <p style={{ marginTop: 18, fontSize: 14, lineHeight: 1.9, color: 'var(--color-muted)' }}>{narrative.pain}</p>
          </Reveal>

          {/* ── ④問題の原因を明らかにする ── */}
          <Reveal>
            <section className="card lp-hover" style={{ marginTop: 16, padding: '20px 22px' }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.9, color: 'var(--color-fg)', fontWeight: 600 }}>{narrative.reframe}</p>
            </section>
          </Reveal>

          {/* ── ⑤希望の提示 ── */}
          <Reveal>
            <div className="lp-dot-grid" style={{ position: 'relative', marginTop: 20, padding: '22px 20px', textAlign: 'center', borderRadius: 16 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.12), transparent 75%)' }} />
              <p style={{ position: 'relative', margin: 0, fontSize: 16, lineHeight: 1.8, color: 'var(--color-gold)', fontWeight: 700 }}>{narrative.hope}</p>
            </div>
          </Reveal>

          {/* ── ⑥解決策として店舗登場 ── */}
          <Reveal>
            <Section eyebrow="だからこの店舗" title={`${provider.name}という選択肢`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {provider.photo_url && (
                  <img src={provider.photo_url} alt={provider.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(201,168,76,0.5)', flexShrink: 0 }} />
                )}
                <div>
                  <strong style={{ color: 'var(--color-fg)' }}>{provider.name}</strong>
                  {provider.price_from && <span className="muted" style={{ fontSize: 13, marginLeft: 8 }}>¥{Number(provider.price_from).toLocaleString()}〜</span>}
                </div>
              </div>
              {storeIntro && <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--color-fg)', margin: '0 0 16px' }}>{storeIntro}</p>}
              {facilityPhotos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: facilityPhotos.length === 1 ? '1fr' : 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
                  {facilityPhotos.map((url, i) => (
                    <img key={i} src={url} alt={`店内写真${i + 1}`} className="lp-hover" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--color-border-gold)', display: 'block' }} loading="lazy" />
                  ))}
                </div>
              )}
            </Section>
          </Reveal>

          {/* ── ⑦得られる未来を具体的に見せる ── */}
          <Reveal>
            <section className="card lp-hover" style={{ marginTop: 40, padding: '24px 24px', background: 'rgba(201,168,76,0.08)', borderColor: 'var(--color-gold)', position: 'relative', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', top: -14, right: -14, opacity: 0.1 }}>
                <AxisIcon axis={axis} size={110} color="var(--color-gold)" strokeWidth={1} />
              </span>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: 'var(--color-gold)', textTransform: 'uppercase' }}>この先に待っているもの</p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.9, color: 'var(--color-fg)', position: 'relative' }}>{futureVision}</p>
            </section>
          </Reveal>

          {/* ── ⑧なぜそれができるのか ── */}
          {whyItWorks.length > 0 && (
            <Reveal>
              <Section title="なぜこの店舗ならできるのか">
                <div className="stack" style={{ gap: 12 }}>
                  {whyItWorks.map((text, i) => (
                    <div key={i} className="card lp-hover" style={{ padding: 18 }}>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--color-fg)' }}>{text}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </Reveal>
          )}

          {/* ── ⑥続き：具体的なメニュー ── */}
          {menus?.length > 0 && (
            <Reveal>
              <Section title="おすすめの体験メニュー">
                <div className="stack" style={{ gap: 14 }}>
                  {menus.map(m => {
                    const hook = copy?.menuHooks?.[m.id];
                    return (
                      <div key={m.id} className="card lp-hover" style={{ display: 'flex', flexDirection: m.images?.[0] ? 'row' : 'column' }}>
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
                          <a href={menuCtaHref(m.name)} {...consultLinkProps} onClick={() => trackCta('menu_consult')} className="btn" style={{ fontSize: 13, padding: '8px 16px', marginTop: 12, display: 'inline-block' }}>
                            {menuCtaLabel}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </Reveal>
          )}

          {/* ── ⑨実績・事例・口コミ ── */}
          {(cases?.length > 0 || stories?.length > 0) && (
            <Reveal>
              <Section eyebrow="Proof" title="実際の変化・お客様の声">
                {cases?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: stories?.length > 0 ? 14 : 0 }}>
                    {cases.map(c => (
                      <div key={c.id} className="card lp-hover" style={{ overflow: 'hidden' }}>
                        {c.image_url && <img src={c.image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                        <div style={{ padding: 16 }}>
                          {c.user_type && <p className="muted" style={{ fontSize: 11, margin: '0 0 8px', textAlign: 'center' }}>{c.user_type}タイプ</p>}
                          <ScoreGauge before={c.before_score} after={c.after_score} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {stories?.length > 0 && (
                  <div className="stack" style={{ gap: 10 }}>
                    {stories.map(s => (
                      <div key={s.id} className="card lp-hover" style={{ padding: 16 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--color-muted)' }}>Before: {s.concern_before}</p>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-fg)', fontWeight: 600 }}>「{s.change_after}」</p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </Reveal>
          )}

          {staff?.length > 0 && (
            <Reveal>
              <Section title="スタッフ紹介">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
                  {staff.map(s => (
                    <div key={s.id} className="card lp-hover" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
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
              </Section>
            </Reveal>
          )}

          {/* ── 相談の流れ ── */}
          <Reveal>
            <Section title="相談から施術までの流れ">
              <RouteStrip />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                {CONSULT_STEPS.map(s => (
                  <div key={s.step} className="card lp-hover" style={{ padding: '16px 14px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: 'var(--color-gold)', letterSpacing: 1 }}>STEP {s.step}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-fg)', fontWeight: 600 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </Section>
          </Reveal>

          {/* ── ⑩よくある不安・反論を潰す ── */}
          {faqs.length > 0 && (
            <Reveal>
              <Section title="よくある質問">
                <div className="stack" style={{ gap: 10 }}>
                  {faqs.map((f, i) => (
                    <div key={i} className="card lp-hover" style={{ padding: 16 }}>
                      <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 14, color: 'var(--color-gold)' }}>Q. {f.q}</p>
                      <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>{f.a}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </Reveal>
          )}

          {/* ── ⑪オファー・価格・特典 ── */}
          <Reveal>
            <section className="card stack" style={{ marginTop: 40, padding: '24px 24px', gap: 12 }}>
              <h2 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 18, margin: 0, color: 'var(--color-fg)' }}>今、ここから始められること</h2>
              <div className="stack" style={{ gap: 8 }}>
                {[
                  'お問い合わせは無料',
                  provider.price_from ? `施術・セッションは¥${Number(provider.price_from).toLocaleString()}〜` : null,
                  provider.trial_available ? (provider.trial_desc || 'お試し・体験からのスタートが可能') : null,
                  !hasExternalBooking ? '店舗からの返信までお時間をいただく場合があります' : null,
                ].filter(Boolean).map((line, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ flexShrink: 0, color: 'var(--color-gold)', fontWeight: 800, fontSize: 14, marginTop: 1 }}>✓</span>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--color-fg)', lineHeight: 1.6 }}>{line}</p>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          {/* ── ⑫CTA ── */}
          <Reveal>
            <section className="card stack" style={{ marginTop: 20, padding: '28px 24px', gap: 14, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}><CompassGlyph /></div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--color-fg)' }}>{closingLine}</p>
              <a className="btn btn--primary lp-cta-pulse" href={consultHref} {...consultLinkProps} onClick={() => trackCta('final_consult')} style={{ fontSize: 15, padding: '13px 28px' }}>
                {ctaLabel}
              </a>
              <a href={`/provider/${slug}`} onClick={() => trackCta('view_profile')} style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                店舗の詳細プロフィールを見る
              </a>
            </section>
          </Reveal>
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
        <a href={consultHref} {...consultLinkProps} onClick={() => trackCta('sticky_consult')} className="btn btn--primary lp-cta-pulse" style={{ width: '100%', maxWidth: 420, textAlign: 'center', fontSize: 15, padding: '13px 0' }}>
          {provider.name}に{ctaLabel}
        </a>
      </div>

      <style>{`
        @media (min-width: 860px) { .lp-sticky-cta { display: none; } }

        .lp-reveal { opacity: 0; transform: translateY(18px); transition: opacity .6s ease, transform .6s ease; }
        .lp-reveal-in { opacity: 1; transform: translateY(0); }

        .lp-hover { transition: transform .2s ease, box-shadow .2s ease; }
        .lp-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.28); }

        .lp-gauge-fill { animation: lp-gauge-grow 1s ease-out; }
        @keyframes lp-gauge-grow { from { width: 0; } }

        .lp-badge-shimmer {
          background: linear-gradient(110deg, #c9a84c 30%, #f0dfa0 45%, #c9a84c 60%);
          background-size: 200% 100%;
          animation: lp-shimmer 2.8s ease-in-out infinite;
        }
        @keyframes lp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .lp-dot-grid {
          background-image: radial-gradient(rgba(201,168,76,0.35) 1px, transparent 1.4px);
          background-size: 14px 14px;
        }

        .lp-cta-pulse { animation: lp-pulse 2.4s ease-in-out infinite; }
        @keyframes lp-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.45); }
          50% { box-shadow: 0 0 0 8px rgba(201,168,76,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-reveal { opacity: 1; transform: none; transition: none; }
          .lp-cta-pulse, .lp-badge-shimmer, .lp-gauge-fill { animation: none; }
        }
      `}</style>
    </main>
  );
}
