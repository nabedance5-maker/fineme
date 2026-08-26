'use client';
import useTrack from '@/app/_hooks/useTrack';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import MirrorReportCard from '@/app/_components/MirrorReportCard';
import MypageSideNav from '../_components/MypageSideNav';

const DIR_ICON  = { improved: '↑', stable: '→' };
const DIR_COLOR = { improved: '#50c88c', stable: 'rgba(232,228,220,0.35)' };
const POT_COLOR_COMP = { '高': '#c9a84c', '中': '#7aadff', '低': '#50c88c' };

function ComparisonCard({ data }) {
  if (!data?.has_comparison) return null;
  const total = data.changes.length;
  const improved = data.improved_count;
  const rate = total > 0 ? Math.round(improved / total * 100) : 0;
  const hasBigImprovement = data.changes.some(c => c.from === '高' && c.to === '低');

  return (
    <div style={{ background: improved > 0 ? 'rgba(10,30,20,0.7)' : 'rgba(10,15,30,0.6)', border: `1px solid ${improved > 0 ? 'rgba(80,200,140,0.35)' : 'rgba(201,168,76,0.22)'}`, borderRadius: '14px', padding: '18px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.12em', color: improved > 0 ? 'rgba(80,200,140,0.6)' : 'rgba(201,168,76,0.55)', textTransform: 'uppercase', margin: 0 }}>変容の軌跡</p>
        <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.35)', margin: 0 }}>{data.prev_month} → {data.new_month}</p>
      </div>

      {improved > 0 ? (
        <div style={{ background: 'rgba(80,200,140,0.1)', border: '1px solid rgba(80,200,140,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '14px', color: '#50c88c', margin: 0, fontWeight: 800 }}>
            🎉 {total}軸中{improved}軸が整いました
          </p>
          <span style={{ fontSize: '12px', color: '#50c88c', fontWeight: 700, opacity: 0.8 }}>{rate}%</span>
        </div>
      ) : (
        <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.4)', margin: '0 0 12px' }}>変容の軌跡を記録中</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.changes.map(c => {
          const isBig = c.from === '高' && c.to === '低';
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ width: '20px', textAlign: 'center' }}>{c.icon}</span>
              <span style={{ flex: 1, color: 'rgba(232,228,220,0.75)', fontWeight: 600 }}>{c.name}</span>
              {isBig && <span style={{ fontSize: '11px' }}>✨</span>}
              <span style={{ color: POT_COLOR_COMP[c.from], fontSize: '12px', fontWeight: 700, minWidth: '20px' }}>{c.from}</span>
              <span style={{ color: 'rgba(232,228,220,0.25)', fontSize: '11px' }}>━▶</span>
              <span style={{ color: POT_COLOR_COMP[c.to], fontSize: '12px', fontWeight: 700, minWidth: '20px' }}>{c.to}</span>
              <span style={{ color: DIR_COLOR[c.direction], fontWeight: 800, minWidth: '16px', textAlign: 'right' }}>
                {DIR_ICON[c.direction]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FREE_LIMIT = 5; // 非会員が閲覧できるセッション数

export default function MirrorHistoryPage() {
  const { track, trackId } = useTrack();
  const [userId, setUserId]       = useState(null);
  const [sessions, setSessions]   = useState([]);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId]           = useState(null);
  const [error, setError]         = useState('');
  const [comparison, setComparison] = useState(null);
  const [reportBySession, setReportBySession] = useState({});
  const [reportLoadingId, setReportLoadingId] = useState(null);

  async function loadReport(sessionId) {
    if (reportBySession[sessionId]) return;
    setReportLoadingId(sessionId);
    try {
      const res = await fetch('/api/mirror/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'ready') {
        setReportBySession(prev => ({ ...prev, [sessionId]: { content: data.report_content, photoUrl: data.photo_url, tierComparison: data.tier_comparison || null } }));
      }
    } catch {} finally {
      setReportLoadingId(null);
    }
  }

  useEffect(() => {
    let uid = null;
    let tok = null;
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) {
        const obj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        uid = obj?.user?.id || null;
        tok = obj?.access_token || null;
      }
    } catch {}

    if (!uid) {
      window.location.href = '/login';
      return;
    }
    setUserId(uid);

    // セッション一覧・サブスク状態・月次比較を並行取得
    Promise.all([
      fetch(`/api/mirror/sessions?user_id=${uid}`).then(r => r.json()),
      tok ? fetch('/api/subscription/status', { headers: { Authorization: `Bearer ${tok}` } }).then(r => r.json()) : Promise.resolve(null),
      tok ? fetch('/api/me/mirror-comparison', { headers: { Authorization: `Bearer ${tok}` } }).then(r => r.json()) : Promise.resolve(null),
    ]).then(([sessionData, subData, compData]) => {
      setSessions(sessionData.sessions || []);
      setIsSubscriber(subData?.isActive === true);
      setComparison(compData);
      setLoading(false);
    }).catch(() => { setError('データの読み込みに失敗しました。'); setLoading(false); });
  }, []);

  function toggleSession(session) {
    if (expandedId === session.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(session.id);
    // ビジュアルレポート（新Mirror）はpaid確定済みセッションのみ生成対象。
    // /api/mirror/report側でもpaid確認するため、ここでは呼ぶだけでよい
    // （旧AnalysisView用の/api/mirror/result呼び出しは廃止 — でお指摘:
    // 履歴ページだけ旧表示が先頭に残っていた。新レポートのみを表示する）。
    if (session.paid) loadReport(session.id);
  }

  const SIDENAV = (
    <MypageSideNav />
  );

  return (
    <main className="section">
      <div className="container mypage-layout">
        {SIDENAV}

        <section>
          <div style={{ background: 'linear-gradient(rgba(10,15,30,0.82), rgba(10,15,30,0.92)), url(/assets/images/hero-bg.webp) center/cover no-repeat', borderRadius: '14px', padding: '22px', marginBottom: '24px', border: '1px solid rgba(201,168,76,0.2)' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.18em', color: 'rgba(201,168,76,0.55)', margin: '0 0 6px', textTransform: 'uppercase' }}>Fineme Mirror</p>
            <h1 style={{ fontFamily: "'Noto Serif JP', Georgia, serif", fontSize: 'clamp(18px,4vw,24px)', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
              Mirror <span style={{ color: '#c9a84c' }}>分析履歴</span>
            </h1>
            <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.45)', margin: 0, lineHeight: 1.6 }}>
              購入済みの分析はいつでも見返せます。
            </p>
          </div>

          <Link href={track.mirror} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'rgba(201,168,76,0.08)', border: '1.5px dashed rgba(201,168,76,0.4)', borderRadius: '12px', color: '#c9a84c', fontSize: '14px', fontWeight: 700, textDecoration: 'none', marginBottom: '24px', transition: 'all .15s' }}>
            🪞 新しい写真を分析する
          </Link>

          <ComparisonCard data={comparison} />

          {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

          {loading ? (
            <p style={{ color: 'rgba(232,228,220,0.35)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>読み込み中...</p>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(232,228,220,0.35)' }}>
              <p style={{ fontSize: '40px', marginBottom: '12px' }}>🪞</p>
              <p style={{ fontSize: '13px', lineHeight: 1.7 }}>
                まだ分析履歴がありません。<br />
                写真をアップロードして、変容余地を確認しましょう。
              </p>
            </div>
          ) : (
            <div>
              {/* 非会員: 5件超えた分はCTAで隠す */}
              {!isSubscriber && sessions.length > FREE_LIMIT && (
                <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '14px', padding: '20px 24px', marginBottom: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.7)', margin: '0 0 4px', lineHeight: 1.7 }}>
                    {sessions.length}件の分析履歴があります。
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.5)', margin: '0 0 16px', lineHeight: 1.7 }}>
                    サブスク会員になると全件いつでも見返せます。
                  </p>
                  <Link href="/mypage/subscription" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 24px', background: 'linear-gradient(135deg,#c9a84c,#e8c97a)', borderRadius: '10px', fontSize: '13px', fontWeight: 800, color: '#0a0f1e', textDecoration: 'none' }}>
                    月額780円で無制限に →
                  </Link>
                </div>
              )}

              {(isSubscriber ? sessions : sessions.slice(0, FREE_LIMIT)).map(s => {
                const isExpanded = expandedId === s.id;

                return (
                  <div key={s.id} style={{ background: 'rgba(10,15,30,0.65)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden', transition: 'border-color .2s', ...(isExpanded ? { borderColor: 'rgba(201,168,76,0.35)' } : {}) }}>
                    <button
                      onClick={() => toggleSession(s)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: '16px 18px', cursor: 'pointer', textAlign: 'left', gap: '12px' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.4)', margin: '0 0 4px' }}>
                          {new Date(s.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                          {' — '}
                          {s.axes_count}軸分析
                        </p>
                        <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.8)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {s.first_impression || '（分析内容なし）'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px',
                          color: s.paid ? '#50c88c' : 'rgba(201,168,76,0.6)',
                          background: s.paid ? 'rgba(80,200,140,0.1)' : 'rgba(201,168,76,0.08)',
                          border: `1px solid ${s.paid ? 'rgba(80,200,140,0.3)' : 'rgba(201,168,76,0.2)'}` }}>
                          {s.paid ? '購入済み' : '無料版'}
                        </span>
                        <span style={{ color: 'rgba(232,228,220,0.4)', fontSize: '12px' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div style={{ padding: '0 18px 20px', borderTop: '1px solid rgba(232,228,220,0.08)' }}>
                        {s.paid ? (
                          reportBySession[s.id] ? (
                            <MirrorReportCard
                              reportContent={reportBySession[s.id].content}
                              photoUrl={reportBySession[s.id].photoUrl}
                              gender={trackId === 'belle' ? 'female' : 'male'}
                              tierComparison={reportBySession[s.id].tierComparison}
                            />
                          ) : (
                            <div className="report-loading-wrap" style={{ margin: '20px auto' }}>
                              <div className="report-loading-spinner" />
                              <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(232,228,220,0.8)', margin: '0 0 4px' }}>
                                ビジュアルレポートを作成中…
                              </p>
                              <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.45)', margin: 0, lineHeight: 1.6 }}>
                                情報量が多いため1〜2分ほどかかります。このままお待ちください。
                              </p>
                              <div className="report-progress-track">
                                <div className="report-progress-bar" />
                              </div>
                            </div>
                          )
                        ) : (
                          <div style={{ padding: '20px 0', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.55)', marginBottom: '16px', lineHeight: 1.7 }}>
                              この分析は無料プレビュー版です。<br />
                              詳細な地図を見るには購入が必要です。
                            </p>
                            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '16px', fontSize: '13px', color: 'rgba(232,228,220,0.75)', lineHeight: 1.75, textAlign: 'left' }}>
                              <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(201,168,76,0.6)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>First Impression</p>
                              {s.first_impression}
                            </div>
                            <Link href={track.mirror} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'linear-gradient(135deg,#c9a84c,#e8c97a)', borderRadius: '10px', fontSize: '14px', fontWeight: 800, color: '#0a0f1e', textDecoration: 'none' }}>
                              🪞 Mirrorページで購入する
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav > * { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(201,168,76,0.1); }
        .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #c9a84c; border-left: 3px solid #c9a84c; padding-left: 9px; }
        .report-loading-wrap { max-width: 480px; text-align: center; padding: 28px 24px; background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.2); border-radius: 16px; }
        .report-loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(201,168,76,0.2); border-top-color: #c9a84c; border-radius: 50%; animation: mirrorSpin 1s linear infinite; margin: 0 auto 14px; }
        @keyframes mirrorSpin { to { transform: rotate(360deg); } }
        .report-progress-track { width: 100%; height: 6px; border-radius: 99px; background: rgba(232,228,220,0.08); overflow: hidden; margin-top: 16px; }
        .report-progress-bar { width: 35%; height: 100%; border-radius: 99px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); animation: mirrorProgress 1.7s ease-in-out infinite; }
        @keyframes mirrorProgress { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
      `}</style>
    </main>
  );
}
