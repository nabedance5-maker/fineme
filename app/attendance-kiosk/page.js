'use client';

// 店頭タブレットの打刻画面（でお要望2026-10-14：不正防止のため、打刻は店頭の端末1台だけ）。
// 管理画面「勤怠」タブで発行した6桁の登録コードを入れた端末だけが打刻できる。スタッフは
// 名前を選んで自分の暗証番号を入れ、今の状態で押せる打刻（出勤・休憩開始・休憩終了・退勤）を選ぶ。
// 時刻はサーバーの時刻で記録する。
import { useCallback, useEffect, useRef, useState } from 'react';

const TOKEN_KEY = 'fineme:attendance:kiosk-token';
const STATUS_LABEL = { working: '勤務中', break: '休憩中', off: '勤務外' };
const KIND_LABEL = { in: '出勤', break_start: '休憩開始', break_end: '休憩終了', out: '退勤' };
const KIND_COLOR = { in: '#1f8a54', break_start: '#b26b00', break_end: '#1f6fb2', out: '#8a2a2a' };

function readToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } }

export default function AttendanceKiosk() {
  const [token, setToken] = useState(null);
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState(null); // スタッフ
  const [pin, setPin] = useState('');
  const [verified, setVerified] = useState(null); // {allowed, status}
  const [done, setDone] = useState(null);
  const resetTimer = useRef(null);

  useEffect(() => { setToken(readToken()); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => {
    const t = readToken();
    if (!t) return;
    try {
      const res = await fetch('/api/attendance-kiosk/state', { headers: { 'x-kiosk-token': t } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.code === 'not_paired') { try { localStorage.removeItem(TOKEN_KEY); } catch {} setToken(''); }
        setError(d.error || '読み込めませんでした');
        return;
      }
      setError('');
      setState(d);
      setOffset(new Date(d.server_time).getTime() - Date.now());
    } catch { setError('通信できません。ネットワークを確認してください'); }
  }, []);

  useEffect(() => {
    if (!token) return;
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [token, load]);

  function backToList() {
    clearTimeout(resetTimer.current);
    setPicked(null); setPin(''); setVerified(null); setDone(null); setError('');
  }

  async function pair() {
    setBusy(true); setError('');
    const res = await fetch('/api/attendance-kiosk/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || '登録できませんでした'); return; }
    try { localStorage.setItem(TOKEN_KEY, d.token); } catch {}
    setToken(d.token); setCode('');
  }

  async function verifyPin(p) {
    setBusy(true); setError('');
    const res = await fetch('/api/attendance-kiosk/punch', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-kiosk-token': readToken() }, body: JSON.stringify({ staff_id: picked.id, pin: p }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || '確認できませんでした'); setPin(''); return; }
    setVerified(d);
  }

  async function punch(kind) {
    setBusy(true); setError('');
    const res = await fetch('/api/attendance-kiosk/punch', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-kiosk-token': readToken() }, body: JSON.stringify({ staff_id: picked.id, pin, kind }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || '打刻できませんでした'); return; }
    setDone(d);
    load();
    resetTimer.current = setTimeout(backToList, 4000);
  }

  function press(digit) {
    if (busy) return;
    if (digit === 'del') { setPin(p => p.slice(0, -1)); return; }
    setPin(p => (p.length >= 6 ? p : p + digit));
  }

  const t = new Date(now + offset);
  const clock = t.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateLabel = t.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <main className="ak">
      <style>{CSS}</style>
      <header className="ak-head">
        <div>
          <div className="ak-store">{state?.provider?.name || 'Fineme'}</div>
          <div className="ak-sub">勤怠の打刻</div>
        </div>
        <div className="ak-clock">
          <div className="ak-time">{clock}</div>
          <div className="ak-date">{dateLabel}</div>
        </div>
      </header>

      {token === null ? null : !token ? (
        <section className="ak-card ak-pair">
          <h1>この端末を打刻用に登録します</h1>
          <p>管理画面の「勤怠」タブで「打刻用の端末を追加」を押すと、6桁の登録コードが表示されます（10分間有効）。そのコードを入力してください。</p>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" aria-label="登録コード" />
          <button type="button" className="ak-primary" disabled={busy || code.length !== 6} onClick={pair}>{busy ? '登録中…' : 'この端末を登録する'}</button>
          {error && <p className="ak-error" role="alert">{error}</p>}
        </section>
      ) : !picked ? (
        <section>
          {error && <p className="ak-error" role="alert">{error}</p>}
          <p className="ak-lead">自分の名前を押してください</p>
          <div className="ak-grid">
            {(state?.staff || []).map(s => (
              <button key={s.id} type="button" className={`ak-staff is-${s.status}`} onClick={() => { setPicked(s); setError(''); }} disabled={!s.has_pin}>
                <span className="ak-staff-name">{s.name}</span>
                <span className="ak-staff-status">{s.has_pin ? STATUS_LABEL[s.status] : '暗証番号が未設定'}</span>
              </button>
            ))}
            {state && !state.staff.length && <p className="ak-lead">スタッフが登録されていません。管理画面の「スタッフ」タブから登録してください。</p>}
          </div>
        </section>
      ) : done ? (
        <section className="ak-card ak-done" style={{ borderColor: KIND_COLOR[done.kind] }}>
          <div className="ak-done-label" style={{ color: KIND_COLOR[done.kind] }}>{done.label}</div>
          <div className="ak-done-name">{done.staff_name} さん</div>
          <div className="ak-done-time">{done.time} に記録しました</div>
          <button type="button" className="ak-ghost" onClick={backToList}>戻る</button>
        </section>
      ) : !verified ? (
        <section className="ak-card ak-pin">
          <div className="ak-pin-name">{picked.name} さん</div>
          <p>暗証番号を入力して「次へ」を押してください</p>
          {/* 桁数を推測できる枠（空の丸など）は出さない。押した数字だけを●で表示する */}
          <div className="ak-pin-field" aria-label={pin ? '入力中' : '未入力'}>{pin ? '●'.repeat(pin.length) : <span>暗証番号</span>}</div>
          {error && <p className="ak-error" role="alert">{error}</p>}
          <div className="ak-pad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => <button key={n} type="button" onClick={() => press(n)}>{n}</button>)}
            <button type="button" className="ak-pad-sub" onClick={backToList}>やめる</button>
            <button type="button" onClick={() => press('0')}>0</button>
            <button type="button" className="ak-pad-sub" onClick={() => press('del')}>消す</button>
          </div>
          <button type="button" className="ak-primary" disabled={busy || pin.length < 4} onClick={() => verifyPin(pin)}>{busy ? '確認中…' : '次へ'}</button>
        </section>
      ) : (
        <section className="ak-card ak-actions">
          <div className="ak-pin-name">{picked.name} さん</div>
          <p>いまの状態：{STATUS_LABEL[verified.status]}</p>
          <div className="ak-action-grid">
            {verified.allowed.map(k => (
              <button key={k} type="button" disabled={busy} style={{ background: KIND_COLOR[k] }} onClick={() => punch(k)}>{KIND_LABEL[k]}</button>
            ))}
          </div>
          {error && <p className="ak-error" role="alert">{error}</p>}
          <button type="button" className="ak-ghost" onClick={backToList}>やめる</button>
        </section>
      )}
    </main>
  );
}

const CSS = `
.ak { min-height: 100vh; background: #f4f1ea; color: #1a1410; font-family: 'Noto Sans JP', system-ui, sans-serif; padding: 24px 28px 40px; box-sizing: border-box; }
.ak *, .ak *::before, .ak *::after { box-sizing: border-box; }
.ak-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.ak-store { font-family: 'Shippori Mincho', serif; font-size: 26px; font-weight: 800; }
.ak-sub { font-size: 14px; color: rgba(26,20,16,.6); }
.ak-clock { text-align: right; }
.ak-time { font-size: 44px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
.ak-date { font-size: 15px; color: rgba(26,20,16,.6); }
.ak-lead { font-size: 18px; font-weight: 700; margin: 0 0 14px; }
.ak-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.ak-staff { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 22px; border-radius: 18px; border: 2px solid rgba(26,20,16,.1); background: #fff; font: inherit; cursor: pointer; text-align: left; min-height: 110px; }
.ak-staff:active { transform: scale(.98); }
.ak-staff:disabled { opacity: .5; cursor: default; }
.ak-staff-name { font-size: 22px; font-weight: 800; color: #1a1410; }
.ak-staff-status { font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: #f1efe9; color: #6b645a; }
.ak-staff.is-working { border-color: #1f8a54; }
.ak-staff.is-working .ak-staff-status { background: #e3f4ea; color: #1f8a54; }
.ak-staff.is-break { border-color: #b26b00; }
.ak-staff.is-break .ak-staff-status { background: #fbefd9; color: #b26b00; }
.ak-card { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 22px; padding: 28px; border: 2px solid rgba(26,20,16,.08); text-align: center; display: flex; flex-direction: column; gap: 14px; }
.ak-card h1 { font-size: 22px; margin: 0; }
.ak-card p { margin: 0; font-size: 15px; line-height: 1.7; color: rgba(26,20,16,.7); }
.ak-pair input { font-size: 34px; letter-spacing: .3em; text-align: center; padding: 14px; border: 2px solid rgba(26,20,16,.2); border-radius: 14px; font-variant-numeric: tabular-nums; }
.ak-primary { font: inherit; font-size: 18px; font-weight: 800; padding: 16px; border: none; border-radius: 14px; background: #c9a84c; color: #1a1410; cursor: pointer; }
.ak-primary:disabled { opacity: .45; cursor: default; }
.ak-ghost { font: inherit; font-size: 15px; font-weight: 700; padding: 12px; border: 1.5px solid rgba(26,20,16,.2); border-radius: 12px; background: #fff; cursor: pointer; }
.ak-error { color: #b42318 !important; font-weight: 700; }
.ak-pin-name { font-size: 24px; font-weight: 800; }
.ak-pin-field { height: 56px; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(26,20,16,.2); border-radius: 14px; font-size: 22px; letter-spacing: .35em; color: #1a1410; background: #faf8f3; }
.ak-pin-field span { font-size: 15px; letter-spacing: 0; color: rgba(26,20,16,.4); }
.ak-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.ak-pad button { font: inherit; font-size: 28px; font-weight: 700; padding: 16px 0; border-radius: 14px; border: 1.5px solid rgba(26,20,16,.12); background: #faf8f3; cursor: pointer; }
.ak-pad button:active { background: #efe9dc; }
.ak-pad .ak-pad-sub { font-size: 16px; color: rgba(26,20,16,.7); }
.ak-action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ak-action-grid button { font: inherit; font-size: 24px; font-weight: 800; padding: 28px 0; border: none; border-radius: 16px; color: #fff; cursor: pointer; }
.ak-action-grid button:only-child { grid-column: 1 / -1; }
.ak-done { border-width: 3px; }
.ak-done-label { font-size: 40px; font-weight: 800; }
.ak-done-name { font-size: 24px; font-weight: 800; }
.ak-done-time { font-size: 18px; color: rgba(26,20,16,.7); }
`;
