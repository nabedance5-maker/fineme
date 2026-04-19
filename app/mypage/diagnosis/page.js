'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const LEVEL_TEXT = ['全然', '少し', 'そこそこ', 'かなり', 'すごく'];
const CONCERN_ICONS = {
  hair: '💇‍♂️', skin: '✨', eyebrow: '✂️', body: '💪', fashion: '👔',
  beard: '💈', teeth_whitening: '🦷', teeth_alignment: '😬', teeth_odor: '💨',
  posture: '🚶', overall: '🪞',
};
const CONCERN_NAMES = {
  hair: '髪型・髪', skin: '肌・ニキビ', eyebrow: '眉毛', body: '体型・体', fashion: '服・コーデ',
  beard: 'ひげ', teeth_whitening: '歯の黄ばみ', teeth_alignment: '歯並び', teeth_odor: '口臭',
  posture: '姿勢', overall: 'トータルで整えたい',
};

function levelColor(l) {
  return ['#e5e7eb', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'][l] || '#e5e7eb';
}

function careLevelsToConcernAreas(careLevels) {
  const map = { concerned: 4, self: 3, pro: 2 };
  const out = {};
  Object.entries(careLevels || {}).forEach(([id, lv]) => {
    if (map[lv]) out[id] = map[lv];
  });
  return out;
}

function getConcernType(areas) {
  const high = Object.entries(areas).filter(([, v]) => v >= 3);
  const facial = ['eyebrow', 'skin', 'photo'].filter(k => (areas[k] || 0) >= 3);
  const bodyStyle = ['body', 'fashion'].filter(k => (areas[k] || 0) >= 3);
  const hasOverall = (areas.overall || 0) >= 2;
  const topArea = [...Object.entries(areas)].sort(([, a], [, b]) => b - a)[0];
  if (high.length === 0 && Object.values(areas).every(v => v <= 1)) return { type: 'メンテナンス型', color: '#059669' };
  if (hasOverall && high.length >= 3) return { type: '全面リニューアル型', color: '#7c3aed' };
  if (facial.length >= 2) return { type: '第一印象・顔まわり集中型', color: '#2563eb' };
  if (bodyStyle.length >= 2) return { type: 'ボディ×スタイル型', color: '#d97706' };
  if ((areas.hair || 0) >= 3 && facial.length >= 1) return { type: '清潔感底上げ型', color: '#0891b2' };
  if (topArea && topArea[1] >= 3) {
    const typeMap = {
      hair: { type: '髪型特化型', color: '#2563eb' }, skin: { type: '肌ケア特化型', color: '#0891b2' },
      eyebrow: { type: '眉毛特化型', color: '#2563eb' }, body: { type: 'ボディメイク型', color: '#d97706' },
      fashion: { type: 'スタイリング型', color: '#7c3aed' }, photo: { type: '写真映り特化型', color: '#0891b2' },
      overall: { type: '全体印象型', color: '#7c3aed' },
    };
    return typeMap[topArea[0]] || { type: '変容準備型', color: '#2563eb' };
  }
  return { type: '変容準備型', color: '#2563eb' };
}

function getTriggerLabel(t) {
  return {
    matching_app: 'マッチングアプリで結果を出したい',
    matching_photo: 'マッチングアプリで写真が原因で損している',
    matching_date: 'マッチングはできるが会うと続かない',
    love: '好きな人ができた', love_now: '好きな人ができた・次に会う時に印象を変えたい',
    career: '就職・転職・大事な場面', mirror: '毎朝鏡を見るたびに気分が上がらない',
    word: '誰かの一言が頭から離れない', comparison: '同世代と並んだとき差を感じた',
    vague: 'ずっと気になっていた',
  }[t] || t || '—';
}
function getStyleLabel(s) {
  return { explanation: '納得してから動くタイプ', consultation: '相談しながら進めるタイプ', delegate: '任せて結果を出してほしいタイプ', cautious: '小さく試してから続けるタイプ' }[s] || s || '—';
}
function getUrgencyLabel(u) {
  return { high: '1ヶ月以内に変化を感じたい', mid: '2〜3ヶ月で', low: '半年〜1年で', continuous: '継続できるものがいい' }[u] || u || '—';
}
function getFailureLabel(f) {
  return { lost_direction: '方向がわからなくなった', no_continuation: '続かなかった', cost: 'コストが続かなかった', awkward: '関係性がうまくいかなかった', no_result: '変化が感じられなかった', ongoing: '今も継続中' }[f] || f || '—';
}
function fmtDate(ts) {
  try { return new Date(ts).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

export default function MypageDiagnosisPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diagProfile, setDiagProfile] = useState(null);
  const [diagHistory, setDiagHistory] = useState([]);
  const [diagStatus, setDiagStatus] = useState('loading'); // loading | v4 | v8 | old | empty
  const [stageDoneCount, setStageDoneCount] = useState(0);

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (sbKey) {
      try {
        const obj = JSON.parse(localStorage.getItem(sbKey));
        if (obj?.user?.id) {
          setSession(obj);
          setLoading(false);
          // 診断データ読み込み
          try {
            // stepDone カウント
            try {
              const sd = JSON.parse(localStorage.getItem('fineme:step:done') || '{}');
              setStageDoneCount(Object.values(sd).filter(Boolean).length);
            } catch {}
            const raw = localStorage.getItem('fineme:diagnosis:latest');
            const histRaw = localStorage.getItem('fineme:diagnosis:history');
            const hist = histRaw ? JSON.parse(histRaw) : [];
            if (Array.isArray(hist) && hist.length >= 2) setDiagHistory(hist.slice().reverse().slice(0, 10));
            if (!raw) { setDiagStatus('empty'); return; }
            const p = JSON.parse(raw);
            if (['v5', 'v6', 'v7', 'v8'].includes(p.version)) {
              if (!p.concern_areas || Object.keys(p.concern_areas).length === 0) {
                p.concern_areas = careLevelsToConcernAreas(p.care_levels);
              }
              setDiagProfile(p); setDiagStatus('v4');
            } else if (p.version === 'v4') {
              setDiagProfile(p); setDiagStatus('v4');
            } else {
              setDiagProfile(p); setDiagStatus('old');
            }
          } catch { setDiagStatus('empty'); }
          return;
        }
      } catch {}
    }
    window.location.href = '/login';
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>読み込み中...</div>;

  const p = diagProfile;
  const areas = p?.concern_areas || {};
  const concernType = p ? getConcernType(areas) : null;
  const concernSorted = Object.entries(areas).sort(([, a], [, b]) => b - a);

  const profileRows = p ? [
    p.trigger && ['きっかけ', getTriggerLabel(p.trigger)],
    p.style && ['進め方', getStyleLabel(p.style)],
    p.urgency && ['タイムライン', getUrgencyLabel(p.urgency)],
    p.failure_pattern && ['過去のパターン', getFailureLabel(p.failure_pattern)],
  ].filter(Boolean) : [];

  return (
    <main className="section">
      <div className="container mypage-layout">
        <aside className="mypage-sidenav">
          <nav className="stack" style={{ gap: '4px' }}>
            <Link href="/mypage" className="sidenav-link">ホーム</Link>
            <Link href="/mypage/diagnosis" className="sidenav-link sidenav-link--active">診断結果</Link>
            <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
            <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
            <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
            <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
          </nav>
        </aside>

        <section className="stack">
          <h1 className="section-title">診断結果</h1>

          {diagStatus === 'empty' && (
            <div className="card" style={{ padding: '20px' }}>
              <p className="muted">診断結果がまだありません。</p>
              <div className="action-grid" style={{ marginTop: '14px' }}>
                <Link href="/diagnosis" className="action-btn action-btn-primary">診断する（5〜8分）</Link>
                <Link href="/search" className="action-btn action-btn-secondary">診断せずに探す</Link>
              </div>
            </div>
          )}

          {diagStatus === 'old' && (
            <div className="card" style={{ padding: '20px' }}>
              <p style={{ fontWeight: 700, margin: '0 0 8px' }}>診断データを更新してください</p>
              <p className="muted" style={{ margin: '0 0 14px' }}>新しい変容プロファイル診断を受けると、より詳細な分析が表示されます。</p>
              <Link href="/diagnosis" className="action-btn action-btn-primary" style={{ display: 'inline-block', padding: '12px 24px' }}>新しい診断を受ける</Link>
            </div>
          )}

          {diagStatus === 'v4' && p && (
            <>
              {/* ヒーロー */}
              <div className="result-hero">
                <div className="result-badge">最新の診断結果</div>
                <div><span className="type-badge" style={{ background: concernType.color }}>{concernType.type}</span></div>
                <p>{fmtDate(p.at)} 実施 {p.stage2_completed ? '（詳細版）' : '（簡易版）'}</p>
              </div>

              {/* 気になり度マップ */}
              {concernSorted.filter(([, v]) => v > 0).length > 0 && (
                <div className="card" style={{ padding: '20px' }}>
                  <h2 style={{ margin: '0 0 14px' }}>気になり度マップ</h2>
                  {concernSorted.map(([id, level]) => (
                    <div key={id} className="concern-bar-row">
                      <div className="concern-bar-label">{CONCERN_ICONS[id] || ''} {CONCERN_NAMES[id] || id}</div>
                      <div className="concern-bar-track">
                        <div className="concern-bar-fill" style={{ width: `${Math.round((level / 4) * 100)}%`, background: levelColor(level) }} />
                      </div>
                      <div className="concern-bar-value" style={{ color: levelColor(level) }}>{LEVEL_TEXT[level] || ''}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* プロファイル */}
              {profileRows.length > 0 && (
                <div className="card" style={{ padding: '20px' }}>
                  <h2 style={{ margin: '0 0 14px' }}>あなたのプロファイル</h2>
                  {profileRows.map(([label, value]) => (
                    <div key={label} className="analysis-block">
                      <div className="analysis-label">{label}</div>
                      <div className="analysis-text">{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* アクション */}
              <div className="card" style={{ padding: '20px' }}>
                <div className="action-grid">
                  <Link href="/?scrollTo=roadmap" className="action-btn action-btn-primary">変容ロードマップを見る</Link>
                  <Link href="/search?diag=1" className="action-btn action-btn-secondary">サービスを探す</Link>
                  <Link href="/diagnosis" className="action-btn action-btn-secondary">再診断する</Link>
                  <Link href="/diagnosis-result" className="action-btn action-btn-secondary">詳細な結果を見る</Link>
                </div>
              </div>

              {/* 発揮ステージ */}
              {(() => {
                const isReady      = stageDoneCount >= 5;
                const isApproaching = stageDoneCount >= 2;
                const cardBg     = isApproaching ? 'linear-gradient(135deg,rgba(201,168,76,0.07),rgba(10,15,30,0.03))' : '#f9fafb';
                const cardBorder = isApproaching ? '1.5px solid rgba(201,168,76,0.3)' : '1.5px solid #e5e7eb';
                const stageStages = [
                  { icon: '📸', title: '写真撮影', sub: 'マッチングアプリ・プロフィール写真', href: '/search?category=photo' },
                  { icon: '💍', title: '婚活サポート', sub: '自信を持った自分で、真剣な出会いへ', href: '/search?category=marriage' },
                ];
                return (
                  <div className="card" style={{ padding: '20px', background: cardBg, border: cardBorder }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', color: 'rgba(201,168,76,0.8)', textTransform: 'uppercase' }}>Next Stage</span>
                    </div>
                    <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 6px', color: '#111' }}>変わった自分を、世界へ発揮するステージ</h2>
                    {isReady ? (
                      <p style={{ fontSize: '13px', color: '#059669', fontWeight: 700, margin: '0 0 16px' }}>
                        ✦ 準備が整いました。次のステージへ進みましょう。
                      </p>
                    ) : isApproaching ? (
                      <p style={{ fontSize: '13px', color: 'rgba(201,168,76,0.85)', fontWeight: 700, margin: '0 0 16px' }}>
                        ◎ もうすぐ発揮のタイミング。あと少しで解放されます。
                      </p>
                    ) : (
                      <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px' }}>
                        🔒 New Me Mapのステップを進めると、このステージが開放されます。
                      </p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {stageStages.map(({ icon, title, sub, href }) => (
                        isApproaching ? (
                          <Link key={title} href={href} style={{ display: 'block', textDecoration: 'none', padding: '14px', borderRadius: '12px', background: 'rgba(10,15,30,0.65)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(201,168,76,0.25)', transition: 'box-shadow .15s' }}>
                            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{icon}</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#e8e4dc', marginBottom: '3px' }}>{title}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', lineHeight: 1.5 }}>{sub}</div>
                          </Link>
                        ) : (
                          <div key={title} style={{ padding: '14px', borderRadius: '12px', background: 'rgba(10,15,30,0.45)', border: '1px solid rgba(232,228,220,0.15)', opacity: 0.6 }}>
                            <div style={{ fontSize: '22px', marginBottom: '6px', filter: 'grayscale(1)' }}>{icon}</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: 'rgba(232,228,220,0.40)', marginBottom: '3px' }}>{title}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(232,228,220,0.25)', lineHeight: 1.5 }}>{sub}</div>
                          </div>
                        )
                      ))}
                    </div>
                    {!isApproaching && (
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <Link href="/mypage/navi" style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1', textDecoration: 'none' }}>
                          → New Me Mapでステップを進める
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 診断履歴 */}
              {diagHistory.length >= 2 && (
                <div className="card" style={{ padding: '20px' }}>
                  <h2 style={{ margin: '0 0 14px' }}>診断履歴</h2>
                  {diagHistory.map((item, i) => {
                    const hp = item.profile || item;
                    const ha = hp.concern_areas || {};
                    const hct = getConcernType(ha);
                    return (
                      <div key={i} className="history-item">
                        <div>
                          <div className="history-type">{hct.type}</div>
                          <div className="history-date">{fmtDate(hp.at || item.at)}</div>
                        </div>
                        {i === 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '99px' }}>最新</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        {/* Fineme Mirror CTA（Coming soon） */}
        <div style={{ position: 'relative', opacity: 0.45, pointerEvents: 'none', userSelect: 'none', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', background: 'rgba(10,15,30,0.55)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '14px' }}>
            <span style={{ fontSize: '28px', flexShrink: 0 }}>🪞</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', margin: '0 0 4px' }}>Fineme Mirror — オプション</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(232,228,220,0.9)', margin: '0 0 3px' }}>写真でも変容余地を確認する</p>
              <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.5)', margin: 0, lineHeight: '1.5' }}>診断結果と照らし合わせて、AIが写真からNew Me Logを生成。</p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(232,228,220,0.6)', background: 'rgba(232,228,220,0.1)', border: '1px solid rgba(232,228,220,0.2)', borderRadius: '20px', padding: '4px 12px', flexShrink: 0, letterSpacing: '.06em' }}>Coming soon</span>
          </div>
        </div>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; margin-bottom: 8px; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(10,15,30,0.45); }
        .sidenav-link--active { background: rgba(10,15,30,0.45); font-weight: 700; color: #e8e4dc; }
        .result-hero { padding: 24px; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-radius: 16px; margin-bottom: 16px; }
        .result-hero h2 { font-size: 18px; font-weight: 800; color: #fff !important; margin: 0 0 6px; line-height: 1.4; }
        .result-hero p { font-size: 13px; color: rgba(255,255,255,.75) !important; margin: 0; line-height: 1.6; }
        .result-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 12px; background: rgba(255,255,255,.2); color: #fff !important; border-radius: 99px; margin-bottom: 10px; }
        .type-badge { display: inline-block; font-size: 13px; font-weight: 800; padding: 6px 16px; border-radius: 99px; margin-bottom: 10px; color: #fff !important; }
        .analysis-block { padding: 12px 0; border-bottom: 1px solid rgba(232,228,220,0.1); }
        .analysis-block:last-child { border-bottom: none; }
        .analysis-label { font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: .05em; margin: 0 0 4px; }
        .analysis-text { font-size: 14px; font-weight: 700; color: #e8e4dc; margin: 0 0 2px; line-height: 1.5; }
        .concern-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .concern-bar-label { font-size: 12px; width: 70px; flex-shrink: 0; color: rgba(232,228,220,0.75); }
        .concern-bar-track { flex: 1; height: 6px; background: rgba(10,15,30,0.45); border-radius: 99px; overflow: hidden; }
        .concern-bar-fill { height: 100%; border-radius: 99px; }
        .concern-bar-value { font-size: 11px; font-weight: 700; width: 40px; text-align: right; flex-shrink: 0; }
        .history-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(232,228,220,0.1); gap: 8px; }
        .history-item:last-child { border-bottom: none; }
        .history-date { font-size: 12px; color: rgba(232,228,220,0.40); }
        .history-type { font-size: 13px; font-weight: 700; color: rgba(232,228,220,0.75); }
        .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media(max-width:480px){ .action-grid { grid-template-columns: 1fr; } }
        .action-btn { display: block; text-align: center; padding: 13px 16px; border-radius: 12px; font-size: 14px; font-weight: 700; text-decoration: none; transition: opacity .15s; }
        .action-btn:hover { opacity: .85; }
        .action-btn-primary { background: #111; color: #fff !important; }
        .action-btn-secondary { background: rgba(10,15,30,0.65); color: #e8e4dc !important; border: 1px solid rgba(232,228,220,0.15); }
      `}</style>
    </main>
  );
}
