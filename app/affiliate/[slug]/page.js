'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// ── 定数 ────────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  gym:'パーソナルジム', eyebrow:'眉毛サロン', hair:'美容院・ヘア',
  skin:'肌・エステ', fashion:'ファッション', photo:'写真撮影',
  consulting:'外見トータルサポート', makeup:'メイク', nail:'ネイル',
  hairremoval:'脱毛', whitening:'ホワイトニング', orthodontics:'歯科矯正',
  aga:'AGA', marriage:'結婚関連サービス', diagnosis:'骨格診断',
};
const CAT_TO_AXIS = {
  gym:'body', eyebrow:'eyebrow', fashion:'fashion',
  hair:'hair', aga:'hair',
  makeup:'skin', hairremoval:'skin', esthetic:'skin',
  whitening:'teeth', orthodontics:'teeth',
  nail:'nail',
};
const AXIS_LABELS = { body:'体型', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
const TRIGGER_PERSON = {
  matching_app:'マッチングアプリの写真を良くしたい方',
  love:'恋愛・告白前に外見を整えたい方',
  career:'就職・転職前に印象を変えたい方',
  word:'誰かの一言が刺さって変わろうと思った方',
  vague:'ずっと気になっていたが踏み出せなかった方',
};
const FAILURE_PERSON = {
  lost_direction:'一度やめてしまったが、また変わりたい方',
  no_continuation:'始めても続かなかった経験がある方',
  no_result:'自己流でやっているが、客観的な視点がほしい方',
  cost:'コストが気になって踏み出せなかった方',
  awkward:'担当者との関係性に悩んだ経験がある方',
};
const STYLE_LABELS = {
  explanation:'「なぜそうするのか」を丁寧に説明するスタイル',
  consultation:'一緒に相談しながら進めるスタイル',
  delegate:'任せてもらって結果を出すスタイル',
  cautious:'小さく始めて様子を見ながら進めるスタイル',
};

// ── メインコンポーネント ─────────────────────────────────────────────────────
function AffiliatePageInner() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const [affiliate, setAffiliate] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Me Scan 診断結果（URLパラメーター）
  const diagnosisParam = searchParams.get('d');
  const diagnosis = (() => {
    try { return diagnosisParam ? JSON.parse(decodeURIComponent(diagnosisParam)) : null; } catch { return null; }
  })();

  useEffect(() => {
    async function fetchData() {
      try {
        const [affRes, svcRes] = await Promise.all([
          fetch(`/api/providers/${slug}`),
          fetch(`/api/providers/${slug}/services`),
        ]);
        if (!affRes.ok) { setError('このページは見つかりませんでした。'); setLoading(false); return; }
        const affData = await affRes.json();
        if (affData.entity_type !== 'affiliate') { setError('このページは見つかりませんでした。'); setLoading(false); return; }
        setAffiliate(affData);
        const svcData = svcRes.ok ? await svcRes.json() : [];
        setServices(svcData || []);
      } catch (e) {
        setError('読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  // ページビュートラッキング
  useEffect(() => {
    if (affiliate?.id) {
      fetch('/api/track/provider-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: affiliate.id }),
      }).catch(() => {});
    }
  }, [affiliate?.id]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(232,228,220,0.55)' }}>読み込み中…</p>
    </div>
  );
  if (error) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <p style={{ color: '#6b7280' }}>{error}</p>
      <a href="/" className="btn btn-ghost">トップへ戻る</a>
    </div>
  );
  if (!affiliate) return null;

  const coverBg = affiliate.cover_image_url
    ? `linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.7) 100%), url(${affiliate.cover_image_url}) center/cover no-repeat`
    : 'linear-gradient(135deg, #111827 0%, #1f2937 100%)';

  const catAxis = CAT_TO_AXIS[affiliate.main_category];
  const compassAxis = diagnosis?.compass_first ? (CAT_TO_AXIS[diagnosis.compass_first] || diagnosis.compass_first) : null;
  const isCompassMatch = compassAxis && catAxis && compassAxis === catAxis;

  const effectiveTriggers = affiliate.ai_match_profile?.suitable_triggers?.length
    ? affiliate.ai_match_profile.suitable_triggers : (affiliate.suitable_triggers || []);
  const effectiveFailures = affiliate.ai_match_profile?.handles_failure_patterns?.length
    ? affiliate.ai_match_profile.handles_failure_patterns : (affiliate.handles_failure_patterns || []);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 0 80px' }}>

      {/* ── ヒーローセクション ─────────────────────────────────────── */}
      <div style={{
        background: coverBg,
        borderRadius: '0 0 28px 28px',
        padding: '48px 28px 40px',
        color: '#fff',
        position: 'relative',
        marginBottom: '24px',
      }}>
        {/* PRバッジ（必須表示） */}
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '99px', padding: '3px 10px',
          fontSize: '11px', fontWeight: '800', color: '#fff', letterSpacing: '.08em',
        }}>PR</div>

        {/* マッチングバナー（Me Scan連携時） */}
        {isCompassMatch && (
          <div style={{
            background: 'rgba(99,102,241,0.85)', borderRadius: '10px', padding: '10px 14px',
            marginBottom: '20px', fontSize: '12px', fontWeight: '700',
          }}>
            🧭 あなたのFinemeコンパス（{AXIS_LABELS[compassAxis]}）と一致するガイドです
          </div>
        )}

        {/* アバター */}
        {affiliate.photo_url && (
          <div style={{ marginBottom: '16px' }}>
            <img
              src={affiliate.photo_url}
              alt={affiliate.name}
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.5)' }}
            />
          </div>
        )}

        {/* カテゴリバッジ */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{
            display: 'inline-block', fontSize: '11px', fontWeight: '800',
            padding: '3px 12px', background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)', borderRadius: '99px',
            letterSpacing: '.04em',
          }}>
            {CATEGORY_LABELS[affiliate.main_category] || affiliate.main_category}
          </span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '0 0 10px', lineHeight: '1.3' }}>
          {affiliate.name}
        </h1>
        {affiliate.catchphrase && (
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: '0', lineHeight: '1.7' }}>
            {affiliate.catchphrase}
          </p>
        )}

        {/* 価格目安 */}
        {affiliate.price_from && (
          <div style={{ marginTop: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            ¥{Number(affiliate.price_from).toLocaleString()}〜
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ── ガイドからのひと言 ────────────────────────────────────── */}
        {affiliate.guide_message && (
          <div style={{
            background: 'rgba(10,15,30,0.65)',
            border: '1px solid rgba(201,168,76,0.25)', borderRadius: '18px',
            padding: '22px 24px', marginBottom: '20px', backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#c9a84c', letterSpacing: '.12em', marginBottom: '10px', textTransform: 'uppercase' }}>
              ガイドからのひと言
            </div>
            <p style={{ fontSize: '15px', color: 'rgba(232,228,220,0.90)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
              「{affiliate.guide_message}」
            </p>
          </div>
        )}

        {/* ── このガイドにしかできないこと ─────────────────────────── */}
        {affiliate.unique_strengths && (
          <div style={{
            background: 'rgba(10,15,30,0.65)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '18px',
            padding: '22px 24px', marginBottom: '20px', backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#c9a84c', letterSpacing: '.12em', marginBottom: '12px', textTransform: 'uppercase' }}>
              このガイドにしかできないこと
            </div>
            <p style={{ fontSize: '15px', color: 'rgba(232,228,220,0.90)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap', fontWeight: '500' }}>
              {affiliate.unique_strengths}
            </p>
          </div>
        )}

        {/* ── ページ内画像①（unique_strengths後） ────────────────── */}
        {(affiliate.facility_photos || [])[0] && (
          <div style={{ margin: '4px -16px 20px', overflow: 'hidden' }}>
            <img src={affiliate.facility_photos[0]} alt="" style={{ width: '100%', display: 'block', maxHeight: '300px', objectFit: 'cover' }} loading="lazy" />
          </div>
        )}

        {/* ── こんな方に向いています ───────────────────────────────── */}
        {affiliate.target_desc && (() => {
          const lines = affiliate.target_desc.split('\n').map(l => l.trim()).filter(Boolean);
          return (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#9ca3af', letterSpacing: '.12em', marginBottom: '14px', textTransform: 'uppercase' }}>
                こんな方に向いています
              </div>
              {lines.length > 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lines.map((line, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '14px 16px', background: '#f9fafb',
                      border: '1px solid #f3f4f6', borderRadius: '12px',
                    }}>
                      <span style={{
                        flexShrink: 0, width: '22px', height: '22px', background: '#111',
                        color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '11px', fontWeight: '800',
                      }}>{i + 1}</span>
                      <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500', lineHeight: '1.6' }}>{line}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: 0 }}>{affiliate.target_desc}</p>
              )}
            </div>
          );
        })()}

        {/* ── 来る方のリアルなストーリー（AIフィールド）────────────── */}
        {(affiliate.ideal_client_desc || affiliate.client_before_state || affiliate.transformation_pattern || affiliate.best_fit_desc) && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#9ca3af', letterSpacing: '.12em', marginBottom: '14px', textTransform: 'uppercase' }}>
              来る方のリアルなストーリー
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {affiliate.ideal_client_desc && (
                <div style={{ padding: '16px 18px', background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#9ca3af', letterSpacing: '.08em', marginBottom: '6px' }}>よく来るお客様の状況・背景</div>
                  <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.75', margin: 0 }}>{affiliate.ideal_client_desc}</p>
                </div>
              )}
              {affiliate.client_before_state && (
                <div style={{ padding: '16px 18px', background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#9ca3af', letterSpacing: '.08em', marginBottom: '6px' }}>来る前の典型的な状態</div>
                  <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.75', margin: 0 }}>{affiliate.client_before_state}</p>
                </div>
              )}
              {affiliate.transformation_pattern && (
                <div style={{ padding: '16px 18px', background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#9ca3af', letterSpacing: '.08em', marginBottom: '6px' }}>よく起きる変化のパターン</div>
                  <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.75', margin: 0 }}>{affiliate.transformation_pattern}</p>
                </div>
              )}
              {affiliate.best_fit_desc && (
                <div style={{ padding: '16px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#15803d', letterSpacing: '.08em', marginBottom: '6px' }}>特に向いている人・状況</div>
                  <p style={{ fontSize: '14px', color: '#166534', lineHeight: '1.75', margin: 0 }}>{affiliate.best_fit_desc}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ページ内画像②（変容ストーリー後） ──────────────────── */}
        {(affiliate.facility_photos || [])[1] && (
          <div style={{ margin: '4px -16px 20px', overflow: 'hidden' }}>
            <img src={affiliate.facility_photos[1]} alt="" style={{ width: '100%', display: 'block', maxHeight: '300px', objectFit: 'cover' }} loading="lazy" />
          </div>
        )}

        {/* ── 哲学 ─────────────────────────────────────────────────── */}
        {affiliate.philosophy && (
          <div style={{
            background: '#111', borderRadius: '18px',
            padding: '28px 28px', marginBottom: '20px',
          }}>
            <p style={{ fontSize: '16px', color: '#fff', lineHeight: '1.9', margin: 0, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
              「{affiliate.philosophy}」
            </p>
          </div>
        )}

        {/* ── サービス/メニュー ─────────────────────────────────────── */}
        {services.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#9ca3af', letterSpacing: '.12em', marginBottom: '14px', textTransform: 'uppercase' }}>
              サービス・メニュー
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {services.map(svc => (
                <div key={svc.id} style={{
                  padding: '18px 20px', background: '#fff',
                  border: '1.5px solid #e5e7eb', borderRadius: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: svc.transformation_promise ? '10px' : '0' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#111', marginBottom: '4px' }}>{svc.name}</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {svc.price && <span style={{ fontSize: '13px', color: '#6b7280' }}>¥{Number(svc.price).toLocaleString()}</span>}
                        {svc.duration && <span style={{ fontSize: '13px', color: '#6b7280' }}>{svc.duration}</span>}
                      </div>
                    </div>
                    {svc.target_axis && (
                      <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: '700', padding: '3px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: '99px' }}>
                        {AXIS_LABELS[svc.target_axis] || svc.target_axis}軸
                      </span>
                    )}
                  </div>
                  {svc.transformation_promise && (
                    <p style={{ fontSize: '13px', color: '#059669', fontWeight: '600', margin: 0, lineHeight: '1.6' }}>
                      → {svc.transformation_promise}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── こんなきっかけ・来た道の方を得意とします ─────────────── */}
        {(effectiveTriggers.length > 0 || effectiveFailures.length > 0 || affiliate.provider_style) && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#9ca3af', letterSpacing: '.12em', marginBottom: '14px', textTransform: 'uppercase' }}>
              こんな方を得意としています
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {effectiveTriggers.map(t => TRIGGER_PERSON[t] && (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '10px' }}>
                  <span style={{ color: '#6366f1', fontWeight: '800', fontSize: '13px' }}>✓</span>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{TRIGGER_PERSON[t]}</span>
                </div>
              ))}
              {effectiveFailures.map(f => FAILURE_PERSON[f] && (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '10px' }}>
                  <span style={{ color: '#6366f1', fontWeight: '800', fontSize: '13px' }}>✓</span>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{FAILURE_PERSON[f]}</span>
                </div>
              ))}
              {affiliate.provider_style && STYLE_LABELS[affiliate.provider_style] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px' }}>
                  <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '13px' }}>🎯</span>
                  <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600' }}>{STYLE_LABELS[affiliate.provider_style]}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ページ内画像③（得意な方セクション後） ───────────────── */}
        {(affiliate.facility_photos || [])[2] && (
          <div style={{ margin: '4px -16px 20px', overflow: 'hidden' }}>
            <img src={affiliate.facility_photos[2]} alt="" style={{ width: '100%', display: 'block', maxHeight: '300px', objectFit: 'cover' }} loading="lazy" />
          </div>
        )}

        {/* ── CTAボタン（外部リンク） ──────────────────────────────── */}
        {affiliate.affiliate_url && (
          <div style={{
            position: 'sticky', bottom: '16px',
            background: '#fff', borderRadius: '18px',
            padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid #e5e7eb',
          }}>
            <a
              href={affiliate.affiliate_url}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="btn"
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                padding: '16px', fontSize: '16px', fontWeight: '800',
                borderRadius: '12px', boxSizing: 'border-box',
                textDecoration: 'none',
              }}
            >
              公式サイトで詳しく見る ↗
            </a>
            <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', margin: '8px 0 0' }}>
              ※ このリンクはPRリンクです。外部サイトに移動します。
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AffiliatePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#6b7280' }}>読み込み中…</p></div>}>
      <AffiliatePageInner />
    </Suspense>
  );
}
