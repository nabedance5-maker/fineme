'use client';
import useTrack from '@/app/_hooks/useTrack';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { customerAccessToken } from '@/lib/browser-auth';
import MypageSideNav from './_components/MypageSideNav';
import { mypageMenu } from './_components/menu';
import { STATUS, RES_CSS, splitReservations, fmtDay, fmtUntil, hhmm } from './_components/reservation-format';

const AXIS_LABELS = { body:'体型・ボディ', eyebrow:'眉毛', fashion:'服・コーデ', hair:'髪・ヘア', skin:'肌・エステ', teeth:'歯・口元', nail:'爪' };
const AXIS_ICONS  = { body:'体', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
const PATH_LABELS = { virgin:'初挑戦タイプ', quit:'リスタートタイプ', blind:'客観化タイプ', lapsed:'再開タイプ' };
const AXIS_TO_CATEGORY = { body:'gym', eyebrow:'eyebrow', fashion:'fashion', hair:'hair', skin:'esthetic', teeth:'whitening', nail:'nail' };
const TIER_LABEL = { 1:'基盤', 2:'深化', 3:'補完', 4:'仕上げ' };
// ゴール文（New Me Map の getOverallGoal と同じ言葉。診断データにはコードで入っている）
const VISION_MAP = {
  love_active: '恋愛で、躊躇せず動けるようになっている',
  no_give_up: '外見を理由に何かを諦めることが減っている',
  like_self: '自分のことを、もう少し好きになっている',
  natural_confident: '自信が「自然な状態」になっている',
};
const CHANGE_MAP = {
  others_perception: '他の人からの見られ方・評価が変わる',
  self_confidence: '自分の気持ち・自己肯定感が変わる',
  action_ease: '行動のしやすさ・動けるようになること',
  life_options: '外見を理由に諦めることが減ること',
};

// マイページのホーム（2026-10-22 UI刷新）。
// 以前は「変容ダッシュボード」として診断の情報が先頭を占め、予約は件数だけ、色も青・紫が混ざって読みにくかった。
// 上から「やること（日時の提案への返事）→次の予約→使えるチケット→あなたの変化→メニュー」の順に、1画面で今の状況が分かるようにした。
export default function MypagePage() {
  const { track, trackId } = useTrack();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState(null);
  const [packages, setPackages] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [name, setName] = useState('');

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    let ok = false;
    try { ok = !!JSON.parse(localStorage.getItem(sbKey))?.user?.id; } catch {}
    if (!ok) { window.location.href = '/login'; return; }
    setLoading(false);
    try {
      const raw = localStorage.getItem(track.storageKey);
      if (raw) setDiagnosis(JSON.parse(raw));
    } catch {}

    customerAccessToken().then(token => {
      if (!token) { setReservations([]); setPackages([]); return; }
      const headers = { Authorization: `Bearer ${token}` };
      // 診断結果はアカウントに保存されたものを正とする（この端末で診断していなくても出す）
      fetch(`/api/me/diagnosis?track=${trackId}`, { headers }).then(r => (r.ok ? r.json() : null)).then(d => {
        const female = d?.gender === 'female';
        if (d && female === (trackId === 'belle')) setDiagnosis(prev => (!prev || new Date(d.at || 0) >= new Date(prev.at || 0) ? d : prev));
      }).catch(() => {});
      fetch('/api/me/reservations', { headers }).then(r => (r.ok ? r.json() : [])).then(setReservations).catch(() => setReservations([]));
      fetch('/api/me/packages', { headers }).then(r => (r.ok ? r.json() : [])).then(setPackages).catch(() => setPackages([]));
      fetch('/api/me/profile', { headers }).then(r => (r.ok ? r.json() : null)).then(p => {
        const n = p?.display_name || [p?.last_name, p?.first_name].filter(Boolean).join(' ');
        if (n) setName(n);
      }).catch(() => {});
    });
  }, [trackId]);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>読み込み中...</div>;

  const { upcoming } = splitReservations(reservations || []);
  const proposals = upcoming.filter(r => r.status === 'counter_proposed');
  const next = upcoming.find(r => r.status !== 'counter_proposed');
  const moreCount = upcoming.length - (next ? 1 : 0) - proposals.length;
  const usable = (packages || []).filter(p => !p.expired && (p.remaining_sessions === null || p.remaining_sessions > 0));

  // transform_vectors はobject形式 {body:{...}, eyebrow:{...}} で保存されるため配列に変換
  const tvRaw = diagnosis?.transform_vectors || {};
  const vectors = Array.isArray(tvRaw) ? tvRaw : Object.entries(tvRaw).map(([id, v]) => ({ id, ...v }));
  const compass = diagnosis?.compass_first || null;
  const compassVec = vectors.find(v => v.id === compass);
  // ギャップあり軸をティア→ギャップ降順でソート
  const gapAxes = vectors.filter(v => v.gap > 0).sort((a, b) => (a.tier !== b.tier ? a.tier - b.tier : b.gap - a.gap));
  const scanDate = diagnosis?.at ? new Date(diagnosis.at).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }) : null;
  const goal = VISION_MAP[diagnosis?.goal_vision] || CHANGE_MAP[diagnosis?.goal_change] || '';

  return (
    <main className="section">
      <div className="container mypage-layout">
        <MypageSideNav />

        <section className="mypage-content mh">
          <header className="mh-head">
            <h1 className="section-title">マイページ</h1>
            {name && <p className="mh-hello">{name}さん</p>}
          </header>

          {/* 返事が必要なもの */}
          {proposals.map(r => (
            <Link key={r.id} href="/my-reservations" className="mh-alert">
              <span className="mh-alert-body">
                <strong>{r.provider_name || 'お店'}から日時の提案が届いています</strong>
                <span>{fmtDay(r.counter_date)} {hhmm(r.counter_time)}　返事をする</span>
              </span>
              <span aria-hidden="true" className="mh-chev">›</span>
            </Link>
          ))}

          {/* 次の予約 */}
          <section className="mh-block" aria-labelledby="mh-next">
            <div className="mh-block-head">
              <h2 id="mh-next" className="mh-h2">次のご予約</h2>
              {reservations?.length > 0 && <Link href="/my-reservations" className="rs-link">予約をすべて見る</Link>}
            </div>
            {reservations === null ? (
              <div className="mh-card mh-skel" aria-busy="true" />
            ) : next ? (
              <Link href="/my-reservations" className="mh-card mh-next">
                <div className="mh-next-when">
                  <span className="mh-next-day">{fmtDay(next.date)}</span>
                  {next.time && <span className="mh-next-time">{hhmm(next.time)}</span>}
                </div>
                <div className="mh-next-meta">
                  <span className={`rs-chip rs-chip--${STATUS[next.status]?.tone || 'done'}`}>{STATUS[next.status]?.label || next.status}</span>
                  {fmtUntil(next.date) && <span className="mh-until">{fmtUntil(next.date)}</span>}
                </div>
                <p className="mh-next-store">{next.provider_name || 'お店'}</p>
                {next.menu_name && <p className="mh-next-menu">{next.menu_name}</p>}
                {moreCount > 0 && <p className="mh-next-more">ほかに{moreCount}件の予約があります</p>}
              </Link>
            ) : (
              <div className="mh-card mh-empty">
                <p>これからの予約はありません。</p>
                <Link href={compass && AXIS_TO_CATEGORY[compass] ? `/search?category=${AXIS_TO_CATEGORY[compass]}` : '/search'} className="rs-btn">お店を探す</Link>
              </div>
            )}
          </section>

          {/* 使えるチケット */}
          {usable.length > 0 && (
            <section className="mh-block" aria-labelledby="mh-tk">
              <div className="mh-block-head">
                <h2 id="mh-tk" className="mh-h2">使える回数券・チケット</h2>
                <Link href="/mypage/packages" className="rs-link">すべて見る</Link>
              </div>
              <ul className="mh-list">
                {usable.slice(0, 3).map(p => (
                  <li key={p.id}>
                    <Link href={p.book_href || '/mypage/packages'} className="mh-row">
                      <span className="mh-row-main">
                        <strong>{p.package_name}</strong>
                        <span>{p.provider_name}{p.expires_at ? `・${new Date(p.expires_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}まで` : ''}</span>
                      </span>
                      <span className="mh-row-num">{p.remaining_sessions === null ? '通い放題' : <>残り<b>{p.remaining_sessions}</b>回</>}</span>
                      <span aria-hidden="true" className="mh-chev">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* あなたの変化（New Me Navi / Map） */}
          <section className="mh-block" aria-labelledby="mh-me">
            <div className="mh-block-head">
              <h2 id="mh-me" className="mh-h2">New Me Navi</h2>
              {diagnosis && <Link href="/mypage/navi" className="rs-link">New Me Mapを開く</Link>}
            </div>
            {diagnosis ? (
              <div className="mh-card mh-me">
                {goal && (
                  <div className="mh-goal">
                    <p className="mh-label">あなたのゴール</p>
                    <p className="mh-goal-text">{goal}</p>
                  </div>
                )}
                {compass && (
                  <div className="mh-compass">
                    <span className="mh-glyph mh-glyph--gold" aria-hidden="true">{AXIS_ICONS[compass]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="mh-label">最初の一手</p>
                      <p className="mh-compass-axis">{AXIS_LABELS[compass]}{compassVec?.path_type && <span className="mh-compass-path">{PATH_LABELS[compassVec.path_type]}</span>}</p>
                    </div>
                    {AXIS_TO_CATEGORY[compass] && <Link href={`/search?category=${AXIS_TO_CATEGORY[compass]}`} className="rs-btn">お店を探す</Link>}
                  </div>
                )}
                {gapAxes.length > 0 && (
                  <ul className="mh-axes">
                    {gapAxes.slice(0, 3).map(v => {
                      // 現在地はTierで表現: Tier1=25%, Tier2=50%, Tier3=75%, Tier4=100%
                      const progress = Math.max(5, ((4 - (v.tier || 4)) / 4) * 100);
                      return (
                        <li key={v.id} className="mh-axis">
                          <span className="mh-glyph" aria-hidden="true">{AXIS_ICONS[v.id]}</span>
                          <span className="mh-axis-name">{AXIS_LABELS[v.id]}</span>
                          <span className="mh-bar" role="img" aria-label={`段階 ${TIER_LABEL[v.tier] || '仕上げ'}`}><span style={{ width: `${progress}%` }} className={v.id === compass ? 'is-gold' : ''} /></span>
                          <span className="mh-axis-tier">{TIER_LABEL[v.tier] || '仕上げ'}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="mh-me-foot">
                  <Link href={track.diagnosisResult} className="rs-link">診断結果を見る</Link>
                  <span className="mh-muted">{scanDate ? `${scanDate}に診断` : ''}　<Link href={track.diagnosis} className="mh-muted-link">もう一度診断する</Link></span>
                </div>
              </div>
            ) : (
              <div className="mh-card mh-empty">
                <p>Me Scan（約3分）を受けると、あなたのゴールと最初の一手がここに出ます。</p>
                <Link href={track.diagnosis} className="rs-btn rs-btn--primary">Me Scanをはじめる</Link>
              </div>
            )}
            <a href={track.lpMirror} className="mh-row mh-mirror">
              <span className="mh-row-main">
                <strong>Fineme Mirror</strong>
                <span>写真1枚から、最初に変えるとよい場所をAIが見つけます（¥500）</span>
              </span>
              <span aria-hidden="true" className="mh-chev">›</span>
            </a>
          </section>

          {/* メニュー（スマホではここがメニューになる。PCは左に同じものがある） */}
          <nav className="mh-menu" aria-label="マイページのメニュー">
            {mypageMenu(track).map(g => (
              <div key={g.label} className="mh-block">
                <h2 className="mh-h2">{g.label}</h2>
                <ul className="mh-list">
                  {g.items.map(it => (
                    <li key={it.href}><Link href={it.href} className="mh-row mh-row--menu"><span className="mh-row-main"><strong>{it.label}</strong></span><span aria-hidden="true" className="mh-chev">›</span></Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </section>
      </div>

      <style>{RES_CSS + `
        .mh { display: flex; flex-direction: column; gap: 28px; max-width: 720px; }
        .mh-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .mh-hello { margin: 0; font-size: 14px; color: rgba(232,228,220,0.72); }
        .mh-block { display: flex; flex-direction: column; gap: 12px; }
        .mh-block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
        .mh-h2 { margin: 0; font-size: 13px; font-weight: 700; letter-spacing: .08em; color: rgba(232,228,220,0.72); }
        .mh-card { display: block; padding: 20px; border-radius: 16px; background: #151b24; border: 1px solid rgba(232,228,220,0.12); color: #e8e4dc; text-decoration: none; }
        a.mh-card { transition: border-color .15s; }
        a.mh-card:hover { border-color: rgba(200,164,90,0.55); }
        .mh-card:focus-visible, .mh-row:focus-visible, .mh-alert:focus-visible { outline: 2px solid #c8a45a; outline-offset: 2px; }
        .mh-skel { min-height: 132px; background: linear-gradient(90deg, #151b24, #1b2230, #151b24); background-size: 200% 100%; animation: mh-sh 1.4s ease-in-out infinite; }
        @keyframes mh-sh { from { background-position: 100% 0; } to { background-position: -100% 0; } }
        @media (prefers-reduced-motion: reduce) { .mh-skel { animation: none; } }
        .mh-empty { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
        .mh-empty p { margin: 0; font-size: 14px; line-height: 1.7; color: rgba(232,228,220,0.8); flex: 1 1 240px; }

        .mh-alert { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-radius: 14px; background: #e8e4dc; color: #0d1117; text-decoration: none; }
        .mh-alert-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .mh-alert-body strong { font-size: 15px; }
        .mh-alert-body span { font-size: 13px; }
        .mh-chev { font-size: 22px; line-height: 1; opacity: .6; flex-shrink: 0; }

        .mh-next { box-shadow: inset 3px 0 0 #c8a45a; }
        .mh-next-when { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
        .mh-next-day { font-family: var(--font-serif-ja); font-size: clamp(22px, 5vw, 28px); font-weight: 700; color: #fff; }
        .mh-next-time { font-size: 22px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
        .mh-next-meta { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
        .mh-until { font-size: 13px; color: rgba(232,228,220,0.72); }
        .mh-next-store { margin: 14px 0 0; font-size: 16px; font-weight: 700; }
        .mh-next-menu { margin: 4px 0 0; font-size: 14px; color: rgba(232,228,220,0.75); }
        .mh-next-more { margin: 12px 0 0; padding-top: 12px; border-top: 1px solid rgba(232,228,220,0.1); font-size: 13px; color: rgba(232,228,220,0.72); }

        .mh-list { list-style: none; margin: 0; padding: 0; border-radius: 16px; overflow: hidden; border: 1px solid rgba(232,228,220,0.12); background: #151b24; }
        .mh-list li + li { border-top: 1px solid rgba(232,228,220,0.08); }
        .mh-row { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 12px 16px; color: #e8e4dc; text-decoration: none; transition: background .15s; }
        .mh-row:hover { background: rgba(232,228,220,0.04); }
        .mh-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .mh-row-main strong { font-size: 15px; font-weight: 700; }
        .mh-row-main span { font-size: 12.5px; color: rgba(232,228,220,0.65); }
        .mh-row-num { font-size: 13px; color: rgba(232,228,220,0.8); white-space: nowrap; font-variant-numeric: tabular-nums; }
        .mh-row-num b { font-size: 20px; color: #fff; margin: 0 2px; }
        .mh-row--menu { min-height: 52px; }
        .mh-mirror { border-radius: 16px; border: 1px solid rgba(200,164,90,0.35); background: rgba(200,164,90,0.06); }

        .mh-me { display: flex; flex-direction: column; gap: 18px; }
        .mh-label { margin: 0 0 4px; font-size: 12px; font-weight: 700; letter-spacing: .06em; color: rgba(232,228,220,0.62); }
        .mh-goal-text { margin: 0; font-family: var(--font-serif-ja); font-size: 17px; line-height: 1.6; color: #fff; }
        .mh-compass { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 14px; border-radius: 12px; background: rgba(232,228,220,0.04); }
        .mh-compass-axis { margin: 0; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .mh-compass-path { white-space: nowrap; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 99px; border: 1px solid rgba(232,228,220,0.22); color: rgba(232,228,220,0.85); }
        .mh-glyph { width: 36px; height: 36px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid rgba(232,228,220,0.18); font-family: var(--font-serif-ja); font-size: 16px; font-weight: 700; color: #e8e4dc; }
        .mh-glyph--gold { background: #c8a45a; border-color: #c8a45a; color: #0d1117; }
        .mh-axes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .mh-axis { display: grid; grid-template-columns: 36px minmax(0, 7.5em) minmax(0, 1fr) 3.5em; align-items: center; gap: 12px; }
        .mh-axis .mh-glyph { width: 32px; height: 32px; font-size: 14px; }
        .mh-axis-name { font-size: 14px; font-weight: 600; }
        .mh-axis-tier { font-size: 12px; color: rgba(232,228,220,0.65); text-align: right; }
        .mh-bar { height: 6px; border-radius: 99px; background: rgba(232,228,220,0.12); overflow: hidden; }
        .mh-bar span { display: block; height: 100%; border-radius: 99px; background: rgba(232,228,220,0.55); }
        .mh-bar span.is-gold { background: #c8a45a; }
        .mh-me-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-top: 14px; border-top: 1px solid rgba(232,228,220,0.1); }
        .mh-muted { font-size: 12px; color: rgba(232,228,220,0.62); }
        .mh-muted-link { color: rgba(232,228,220,0.85); text-decoration: underline; text-underline-offset: 3px; }

        .mh-menu { display: none; flex-direction: column; gap: 24px; }
        @media (max-width: 760px) {
          .mh { gap: 24px; }
          .mh-menu { display: flex; }
          .mh-card { padding: 18px; }
          .mh-compass .rs-btn { flex: 1 1 100%; }
        }
      `}</style>
    </main>
  );
}
