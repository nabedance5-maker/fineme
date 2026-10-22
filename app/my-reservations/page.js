'use client';
import { useEffect, useState, Suspense } from 'react';
import { customerAccessToken } from '@/lib/browser-auth';
import Link from 'next/link';
import MypageSideNav from '@/app/mypage/_components/MypageSideNav';
import { STATUS, RES_CSS, splitReservations, fmtDay, fmtUntil, hhmm } from '@/app/mypage/_components/reservation-format';

// 予約（2026-10-22 UI刷新）。
// ・ログイン中はアカウントの予約をそのまま出す（以前はログインしていてもメールアドレスで検索させていた）
// ・「これからの予約」と「これまで」に分け、日時を一番大きく出す
// ・返事・キャンセルはこの画面の中で確認する（ブラウザの確認ダイアログは使わない）
// ログインしていない方だけ、予約時のメールアドレスで確認できる（見るだけ。返事・キャンセルはログイン後）。

// メールで検索した予約（ゲスト）を、/api/me/reservations と同じ形にそろえる
const normalizeGuest = r => ({
  ...r,
  user_id: null,
  menu_name: (r.note || '').match(/【メニュー】([^\n]+)/)?.[1] || null,
  date: r.confirmed_date || r.reserved_date || null,
  time: hhmm(r.confirmed_time || r.start_time) || null,
});

function counterLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return { text: '返事の期限が過ぎました', urgent: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { text: `あと${h >= 1 ? `${h}時間${m > 0 ? `${m}分` : ''}` : `${m}分`}で自動的にキャンセルされます`, urgent: diff < 3 * 3600000 };
}

function ReservationCard({ r, token, onDone, compact }) {
  const [busy, setBusy] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [err, setErr] = useState('');
  const st = STATUS[r.status] || { label: r.status, tone: 'done' };
  const canAct = !!token && !!r.user_id;
  const isProposal = r.status === 'counter_proposed';
  const day = isProposal ? r.counter_date : r.date;
  const time = isProposal ? hhmm(r.counter_time) : hhmm(r.time);
  const left = isProposal ? counterLeft(r.counter_expires_at) : null;

  async function patch(status, extra = {}) {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/reservations/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setErr(e?.error || '処理できませんでした。時間をおいてもう一度お試しください。'); return; }
      setAskCancel(false);
      onDone();
    } catch {
      setErr('通信できませんでした。電波の良い所でもう一度お試しください。');
    } finally { setBusy(false); }
  }

  return (
    <article className={`mr-card${isProposal ? ' mr-card--act' : ''}${compact ? ' mr-card--past' : ''}`}>
      <div className="mr-top">
        <span className={`rs-chip rs-chip--${st.tone}`}>{st.label}</span>
        {!compact && fmtUntil(day) && <span className="mr-until">{fmtUntil(day)}</span>}
      </div>
      <p className="mr-when">
        <span className="mr-day">{fmtDay(day)}</span>
        {time && <span className="mr-time">{time}</span>}
      </p>
      {isProposal && <p className="mr-note">お店から、この日時でどうかと提案が届いています。{r.date ? `（ご希望は${fmtDay(r.date)} ${hhmm(r.time)}）` : ''}</p>}
      {r.status === 'pending' && <p className="mr-note">お店の返事を待っています。確定するとお知らせします。</p>}
      <div className="mr-store">
        {r.provider_slug ? <Link href={`/provider/${encodeURIComponent(r.provider_slug)}`}>{r.provider_name || 'お店'}</Link> : <span>{r.provider_name || 'お店'}</span>}
        {r.menu_name && <span className="mr-menu">{r.menu_name}{r.is_lesson ? '（グループレッスン）' : ''}{r.tickets_used ? `・チケット${r.tickets_used}枚` : ''}</span>}
      </div>
      {r.provider_comment && (isProposal || r.status === 'rejected') && (
        <p className="mr-comment"><span>お店から</span>{r.provider_comment}</p>
      )}
      {left && <p className={`mr-left${left.urgent ? ' is-urgent' : ''}`}>{left.text}</p>}

      {!compact && ['pending', 'counter_proposed', 'approved'].includes(r.status) && (
        canAct ? (
          askCancel ? (
            <div className="mr-confirm" role="group" aria-label="キャンセルの確認">
              <p>この予約をキャンセルしますか？{r.tickets_used ? '使ったチケットは戻ります。' : ''}</p>
              <div className="mr-actions">
                <button type="button" className="rs-btn mr-danger" disabled={busy} onClick={() => patch('cancelled')}>{busy ? '処理中…' : 'キャンセルする'}</button>
                <button type="button" className="rs-btn rs-btn--quiet" disabled={busy} onClick={() => setAskCancel(false)}>やめる</button>
              </div>
            </div>
          ) : (
            <div className="mr-actions">
              {isProposal && (
                <button type="button" className="rs-btn rs-btn--primary" disabled={busy} onClick={() => patch('approved', { confirmed_date: r.counter_date, confirmed_time: r.counter_time })}>
                  {busy ? '処理中…' : 'この日時で予約する'}
                </button>
              )}
              <button type="button" className="rs-btn rs-btn--quiet" disabled={busy} onClick={() => setAskCancel(true)}>
                {isProposal ? 'お断りしてキャンセル' : r.status === 'pending' ? 'リクエストを取り消す' : '予約をキャンセル'}
              </button>
            </div>
          )
        ) : (
          <p className="mr-hint">{token ? 'この予約の返事・キャンセルは、お店に直接ご連絡ください。' : '返事・キャンセルは、ログインするとこの画面からできます。'}</p>
        )
      )}
      {err && <p className="mr-err" role="alert">{err}</p>}
    </article>
  );
}

function MyReservationsContent() {
  const [items, setItems] = useState(null);
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [guestSearched, setGuestSearched] = useState(false);
  const [showPast, setShowPast] = useState(false);

  async function loadMine(tk) {
    const res = await fetch('/api/me/reservations', { headers: { Authorization: `Bearer ${tk}` } }).catch(() => null);
    setItems(res?.ok ? await res.json() : []);
  }

  useEffect(() => {
    customerAccessToken().then(tk => {
      if (tk) { setToken(tk); loadMine(tk); }
      setAuthChecked(true);
    });
  }, []);

  async function searchGuest(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setItems(null);
    const res = await fetch(`/api/reservations/by-contact?contact=${encodeURIComponent(email.trim())}`).catch(() => null);
    setItems(res?.ok ? (await res.json()).map(normalizeGuest) : []);
    setGuestSearched(true);
  }

  const { upcoming, past } = splitReservations(items || []);
  const loggedOut = authChecked && !token;

  return (
    <main className="section">
      <div className="container mypage-layout">
        <MypageSideNav />
        <section className="mypage-content mr">
          <header>
            <h1 className="section-title">予約</h1>
          </header>

          {loggedOut && (
            <form onSubmit={searchGuest} className="mr-guest">
              <label htmlFor="mr-email">予約の時に入力したメールアドレス</label>
              <div className="mr-guest-row">
                <input id="mr-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@mail.com" required />
                <button type="submit" className="rs-btn rs-btn--primary">確認する</button>
              </div>
              <p className="mr-hint"><Link href="/login" className="rs-link">ログイン</Link>すると、メールアドレスを入れなくても予約が表示され、返事やキャンセルもできます。</p>
            </form>
          )}

          {!authChecked || (token && items === null) || (loggedOut && guestSearched && items === null) ? (
            <div className="mr-skel" aria-busy="true" />
          ) : (token || guestSearched) && (
            <>
              <section className="mr-block" aria-labelledby="mr-up">
                <h2 id="mr-up" className="mr-h2">これからの予約{upcoming.length > 0 && <span>{upcoming.length}件</span>}</h2>
                {upcoming.length ? (
                  <div className="mr-cards">
                    {upcoming.map(r => <ReservationCard key={r.id} r={r} token={token} onDone={() => loadMine(token)} />)}
                  </div>
                ) : (
                  <div className="mr-empty">
                    <p>これからの予約はありません。</p>
                    <Link href="/search" className="rs-btn">お店を探す</Link>
                  </div>
                )}
              </section>

              {past.length > 0 && (
                <section className="mr-block" aria-labelledby="mr-past">
                  <h2 id="mr-past" className="mr-h2">これまで<span>{past.length}件</span></h2>
                  <div className="mr-cards">
                    {(showPast ? past : past.slice(0, 5)).map(r => <ReservationCard key={r.id} r={r} token={token} compact onDone={() => loadMine(token)} />)}
                  </div>
                  {past.length > 5 && !showPast && (
                    <button type="button" className="rs-btn" onClick={() => setShowPast(true)}>残り{past.length - 5}件を表示</button>
                  )}
                </section>
              )}
            </>
          )}
        </section>
      </div>

      <style>{RES_CSS + `
        .mr { display: flex; flex-direction: column; gap: 28px; max-width: 680px; }
        .mr-block { display: flex; flex-direction: column; gap: 12px; }
        .mr-h2 { margin: 0; font-size: 13px; font-weight: 700; letter-spacing: .08em; color: rgba(232,228,220,0.72); display: flex; gap: 8px; align-items: baseline; }
        .mr-h2 span { font-weight: 500; letter-spacing: 0; }
        .mr-cards { display: flex; flex-direction: column; gap: 12px; }
        .mr-card { padding: 18px 20px; border-radius: 16px; background: #151b24; border: 1px solid rgba(232,228,220,0.12); display: flex; flex-direction: column; gap: 10px; }
        .mr-card--act { border-color: #e8e4dc; }
        .mr-card--past { padding: 14px 18px; gap: 6px; background: transparent; }
        .mr-card--past .mr-day { font-size: 16px; }
        .mr-card--past .mr-time { font-size: 15px; }
        .mr-top { display: flex; align-items: center; gap: 10px; }
        .mr-until { font-size: 13px; color: rgba(232,228,220,0.72); }
        .mr-when { margin: 0; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
        .mr-day { font-family: var(--font-serif-ja); font-size: clamp(20px, 5vw, 24px); font-weight: 700; color: #fff; }
        .mr-time { font-size: 20px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
        .mr-note { margin: 0; font-size: 13px; line-height: 1.7; color: rgba(232,228,220,0.8); }
        .mr-store { display: flex; flex-direction: column; gap: 2px; }
        .mr-store a, .mr-store > span:first-child { font-size: 15px; font-weight: 700; color: #e8e4dc; text-decoration: none; }
        .mr-store a:hover { text-decoration: underline; text-underline-offset: 3px; }
        .mr-menu { font-size: 13px; color: rgba(232,228,220,0.72); }
        .mr-comment { margin: 0; padding: 10px 12px; border-radius: 10px; background: rgba(232,228,220,0.05); font-size: 13px; line-height: 1.7; color: #e8e4dc; }
        .mr-comment span { display: block; font-size: 11.5px; font-weight: 700; color: rgba(232,228,220,0.62); margin-bottom: 2px; }
        .mr-left { margin: 0; font-size: 12.5px; color: rgba(232,228,220,0.72); }
        .mr-left.is-urgent { color: #fff; font-weight: 700; }
        .mr-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .mr-actions .rs-btn--primary { flex: 1 1 200px; }
        .mr-confirm { padding: 12px; border-radius: 12px; border: 1px solid rgba(232,228,220,0.22); display: flex; flex-direction: column; gap: 10px; }
        .mr-confirm p { margin: 0; font-size: 14px; }
        .mr-danger { border-color: #e8e4dc; }
        .mr-hint { margin: 0; font-size: 12.5px; line-height: 1.7; color: rgba(232,228,220,0.65); }
        .mr-err { margin: 0; font-size: 13px; color: #fff; font-weight: 700; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(232,228,220,0.4); }
        .mr-empty { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 20px; border-radius: 16px; border: 1px dashed rgba(232,228,220,0.2); }
        .mr-empty p { margin: 0; font-size: 14px; color: rgba(232,228,220,0.8); }
        .mr-skel { min-height: 180px; border-radius: 16px; background: linear-gradient(90deg, #151b24, #1b2230, #151b24); background-size: 200% 100%; animation: mr-sh 1.4s ease-in-out infinite; }
        @keyframes mr-sh { from { background-position: 100% 0; } to { background-position: -100% 0; } }
        @media (prefers-reduced-motion: reduce) { .mr-skel { animation: none; } }
        .mr-guest { display: flex; flex-direction: column; gap: 8px; padding: 18px; border-radius: 16px; background: #151b24; border: 1px solid rgba(232,228,220,0.12); }
        .mr-guest label { font-size: 13px; font-weight: 700; }
        .mr-guest-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .mr-guest-row input { flex: 1 1 220px; min-height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(232,228,220,0.25); background: #0d1117; color: #e8e4dc; font-size: 16px; }
        .mr-guest-row input:focus { outline: 2px solid #c8a45a; outline-offset: 1px; }
      `}</style>
    </main>
  );
}

export default function MyReservationsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(232,228,220,0.7)' }}>読み込み中…</div>}>
      <MyReservationsContent />
    </Suspense>
  );
}
