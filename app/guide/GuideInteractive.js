'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function GuideInteractive({ axes, tierInfo }) {
  const [pathType, setPathType] = useState(null);
  const [compassAxis, setCompassAxis] = useState(null);
  const [hasDiagnosis, setHasDiagnosis] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fineme:diagnosis:latest');
      if (!raw) return;
      const p = JSON.parse(raw);
      if (!p?.compass_first) return;
      setCompassAxis(p.compass_first);
      const tv = p.transform_vectors || {};
      const pathT = tv[p.compass_first]?.path_type || null;
      setPathType(pathT);
      setHasDiagnosis(true);
    } catch {}
  }, []);

  const sortedAxes = [...axes].sort((a, b) => {
    if (a.id === compassAxis) return -1;
    if (b.id === compassAxis) return 1;
    return a.tier - b.tier;
  });

  return (
    <section className="guide-sec" style={{ marginTop: '36px' }}>
      {hasDiagnosis && compassAxis ? (
        <div className="compass-banner">
          <div className="compass-banner-icon">🧭</div>
          <div>
            <div className="compass-banner-title">
              あなたのFinemeコンパス: {axes.find(a => a.id === compassAxis)?.icon} {axes.find(a => a.id === compassAxis)?.label}
            </div>
            <p className="compass-banner-desc">
              Me Scanの結果に基づき、このカテゴリがあなたの最優先の一手です。下のリストで最上部に表示しています。
            </p>
          </div>
        </div>
      ) : (
        <div className="no-diag-banner">
          <p style={{ fontSize: '15px', fontWeight: '700', color: 'rgba(232,228,220,0.90)', margin: '0 0 8px' }}>
            🧬 Me Scanを受けると、あなた専用の優先順位が生成されます
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.60)', margin: '0 0 16px', lineHeight: '1.8' }}>
            今は一般的な順番（Tier順）で表示しています。<br />
            あなたの現在地・来た道・ゴールに合わせた地図が欲しい方は無料のMe Scanを。
          </p>
          <Link href="/diagnosis" className="guide-axis-cta">🧬 Me Scanを受ける（無料・約15分）</Link>
        </div>
      )}

      <div className="tier-legend">
        {Object.entries(tierInfo).map(([tier, info]) => (
          <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: info.color, background: info.bg, padding: '4px 12px', borderRadius: '99px', fontWeight: '700', border: `1px solid ${info.border}` }}>
            Tier {tier}
          </div>
        ))}
        <span style={{ fontSize: '11px', color: 'var(--color-muted)', alignSelf: 'center' }}>← 数字が小さいほど即効性・コスパが高い</span>
      </div>

      <div>
        {sortedAxes.map(axis => {
          const isCompass = axis.id === compassAxis;
          const info = tierInfo[axis.tier];
          const pathMsg = pathType && axis.paths[pathType];
          return (
            <div key={axis.id} className={`guide-axis-card${isCompass ? ' is-compass' : ''}`}>
              <div className="guide-axis-header">
                <div className="guide-axis-icon">{axis.icon}</div>
                <div className="guide-axis-label">
                  {axis.label}
                  {isCompass && <span className="compass-crown" style={{ marginLeft: '8px' }}>🧭 あなたの最優先</span>}
                </div>
                <span className="guide-axis-tier-badge" style={{ background: info.bg, color: info.color, border: `1px solid ${info.border}` }}>
                  Tier {axis.tier}
                </span>
              </div>
              <div className="guide-axis-body">
                <p className="guide-axis-quick">{axis.quick_win}</p>
                <div className="guide-axis-meta">
                  <span className="guide-axis-chip">🎯 {axis.start}</span>
                  <span className="guide-axis-chip">✨ {axis.effect}</span>
                </div>
                {pathMsg && (
                  <div className="guide-axis-path">
                    <div className="guide-axis-path-label">あなたの来た道（{pathType === 'virgin' ? '初めて' : pathType === 'quit' ? '続かなかった' : pathType === 'blind' ? '客観評価なし' : '以前やっていた'}）へのアドバイス</div>
                    {pathMsg}
                  </div>
                )}
                <Link href={axis.href} className="guide-axis-cta">ガイドを探す →</Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="guide-scan-cta">
        <h2>あなただけの変容プロファイルを作る</h2>
        <p>
          このガイドは一般的な情報です。<br />
          Me Scanを受けると、あなたの現在地・ギャップ・来た道に合わせた<br />
          7軸の変容ナビ（New Me Navi）と変容マップ（New Me Map）が生成されます。
        </p>
        <Link href="/diagnosis" className="guide-scan-btn">🧬 Me Scanを受ける（無料）</Link>
      </div>
    </section>
  );
}
