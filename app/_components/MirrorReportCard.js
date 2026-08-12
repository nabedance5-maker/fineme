'use client';
// Mirror ビジュアルレポート表示カード。
// app/api/mirror/report が返す report_content（Claude Haiku生成のSTEP1-15相当の構造化JSON）と
// photo_url（署名付きURL）をHTML/CSSでレンダリングする。画像生成AIは使わない。
// app/mirror/page.js・app/belle/mirror/page.js・app/mypage/mirror/page.js から共有利用。

const SCORE_LABELS = {
  face_balance: '顔全体のバランス',
  parts_layout: 'パーツ配置',
  hair: '髪型',
  skin: '肌・清潔感',
  body_shaping: '体型の見せ方',
  posture: '姿勢',
  fashion: '服装',
  color_matching: '色合わせ',
  overall_cohesion: '全体の統一感',
  photo_impression: '写真映え',
};

const STEP_SECTIONS = [
  { key: 'face', label: '顔', icon: '👤' },
  { key: 'hair', label: '髪型・ヘアスタイル', icon: '💇' },
  { key: 'skin', label: '肌・清潔感', icon: '✨' },
  { key: 'neck_shoulders', label: '首・肩・上半身', icon: '📐' },
  { key: 'body', label: '体型・全身バランス', icon: '🧍' },
  { key: 'posture', label: '姿勢・ポージング', icon: '🧘' },
  { key: 'fashion', label: '服装・ファッション', icon: '👔' },
];

export default function MirrorReportCard({ reportContent, photoUrl, gender }) {
  if (!reportContent) return null;

  const accent = gender === 'female' ? '#E0A6C4' : '#C9A84C';
  const accentSoft = gender === 'female' ? 'rgba(224,166,196,0.12)' : 'rgba(201,168,76,0.12)';
  const accentBorder = gender === 'female' ? 'rgba(224,166,196,0.4)' : 'rgba(201,168,76,0.4)';

  const visibleSteps = STEP_SECTIONS.filter(s => reportContent[s.key]?.summary || reportContent[s.key]?.features_summary);
  const scoreEntries = Object.entries(reportContent.scores || {}).filter(([, v]) => v != null);
  const topWeightKey = scoreEntries.length
    ? scoreEntries.reduce((top, [key]) => {
        const w = reportContent.score_weights?.[key] || 0;
        const topW = reportContent.score_weights?.[top] || 0;
        return w > topW ? key : top;
      }, scoreEntries[0][0])
    : null;

  return (
    <div style={{ background: '#05080F', borderRadius: '20px', overflow: 'hidden', border: `1px solid ${accentBorder}`, marginTop: '28px', boxShadow: '0 24px 60px rgba(0,0,0,0.8)' }}>
      <div style={{ padding: '22px 22px 0' }}>
        <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.28em', color: accent, textTransform: 'uppercase' }}>Visual Analysis Report</span>
      </div>

      {photoUrl && (
        <div style={{ padding: '16px 22px 0', textAlign: 'center' }}>
          <img
            src={photoUrl}
            alt="診断写真"
            style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '14px', border: `1px solid ${accentBorder}`, objectFit: 'cover' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '6px', padding: '20px 22px 4px' }}>
        <span style={{ fontSize: '44px', fontWeight: 800, color: accent, lineHeight: 1 }}>{reportContent.visual_score}</span>
        <span style={{ fontSize: '14px', color: 'rgba(232,228,220,0.4)' }}>/ {reportContent.visual_score_max || 888} VISUAL SCORE</span>
      </div>

      {reportContent.visual_type_keywords?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', padding: '4px 22px 16px' }}>
          {reportContent.visual_type_keywords.map((kw, i) => (
            <span key={i} style={{ fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '99px', background: accentSoft, border: `1px solid ${accentBorder}`, color: accent }}>
              {kw}
            </span>
          ))}
        </div>
      )}

      {reportContent.visual_type_description && (
        <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', textAlign: 'center', padding: '0 24px 8px', lineHeight: 1.7 }}>
          {reportContent.visual_type_description}
        </p>
      )}

      {reportContent.first_impression && (
        <div style={{ margin: '12px 22px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(232,228,220,0.08)' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: accent, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>First Impression</p>
          <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.8)', lineHeight: 1.7, margin: 0 }}>{reportContent.first_impression}</p>
        </div>
      )}

      {visibleSteps.length > 0 && (
        <div style={{ margin: '20px 22px 8px' }}>
          {visibleSteps.map(s => {
            const item = reportContent[s.key];
            const text = item.summary || item.features_summary;
            return (
              <div key={s.key} style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(232,228,220,0.85)', marginBottom: '4px' }}>
                  {s.icon} {s.label}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.6)', lineHeight: 1.7, margin: 0 }}>{text}</p>
              </div>
            );
          })}
          {reportContent.visual_cohesion?.summary && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(232,228,220,0.85)', marginBottom: '4px' }}>🎨 全体の統一感</p>
              <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.6)', lineHeight: 1.7, margin: 0 }}>{reportContent.visual_cohesion.summary}</p>
            </div>
          )}
          {reportContent.photo_quality?.summary && (
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(232,228,220,0.85)', marginBottom: '4px' }}>📷 写真写り</p>
              <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.6)', lineHeight: 1.7, margin: '0 0 4px' }}>{reportContent.photo_quality.summary}</p>
              {reportContent.photo_quality.retake_advice && (
                <p style={{ fontSize: '11px', color: accent, lineHeight: 1.6, margin: 0 }}>撮り直しアドバイス: {reportContent.photo_quality.retake_advice}</p>
              )}
            </div>
          )}
        </div>
      )}

      {scoreEntries.length > 0 && (
        <div style={{ margin: '8px 22px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: accent, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>Scoring</p>
            <a href="/mirror/scoring" style={{ fontSize: '10px', color: 'rgba(232,228,220,0.35)', textDecoration: 'underline' }}>採点方法について</a>
          </div>
          {scoreEntries.map(([key, val]) => (
            <div key={key} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'rgba(232,228,220,0.6)', marginBottom: '3px' }}>
                <span>
                  {SCORE_LABELS[key] || key}
                  {key === topWeightKey && (
                    <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: 800, padding: '1px 7px', borderRadius: '99px', background: accentSoft, border: `1px solid ${accentBorder}`, color: accent }}>
                      この写真で最も効いている要素
                    </span>
                  )}
                </span>
                <span>{val}</span>
              </div>
              <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(232,228,220,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${val}%`, height: '100%', background: accent, borderRadius: '99px' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {(reportContent.strengths_top?.length > 0 || reportContent.improvements_top?.length > 0) && (
        <div style={{ display: 'flex', gap: '12px', margin: '0 22px 20px', flexWrap: 'wrap' }}>
          {reportContent.strengths_top?.length > 0 && (
            <div style={{ flex: '1 1 200px' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#50c88c', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>魅力の強み</p>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {reportContent.strengths_top.map((s, i) => (
                  <li key={i} style={{ fontSize: '11px', color: 'rgba(232,228,220,0.65)', lineHeight: 1.8 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {reportContent.improvements_top?.length > 0 && (
            <div style={{ flex: '1 1 200px' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#7aadff', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>改善ポイント</p>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {reportContent.improvements_top.map((s, i) => (
                  <li key={i} style={{ fontSize: '11px', color: 'rgba(232,228,220,0.65)', lineHeight: 1.8 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {reportContent.final_profile && (
        <div style={{ margin: '0 22px 22px', padding: '16px', borderRadius: '12px', background: accentSoft, border: `1px solid ${accentBorder}` }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: accent, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>My Visual Profile</p>
          {[
            ['VISUAL TYPE', reportContent.final_profile.visual_type],
            ['最大の強み', reportContent.final_profile.biggest_strength],
            ['最も改善効果が大きいポイント', reportContent.final_profile.top_improvement],
            ['似合いやすいスタイル', reportContent.final_profile.recommended_style],
            ['似合いやすい髪型', reportContent.final_profile.recommended_hair],
            ['おすすめの写真アングル', reportContent.final_profile.recommended_angle],
            ['おすすめのポージング', reportContent.final_profile.recommended_pose],
          ].filter(([, v]) => v).map(([label, val], i) => (
            <p key={i} style={{ fontSize: '11px', color: 'rgba(232,228,220,0.75)', margin: '0 0 6px', lineHeight: 1.6 }}>
              <span style={{ color: accent, fontWeight: 700 }}>{label}: </span>{val}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
