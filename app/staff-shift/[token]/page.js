'use client';

import { useState, useEffect, useMemo } from 'react';

// スタッフ本人が各自のスマホから出勤・休み希望を提出するページ（でお要望2026-09-13）。
// Finemeアカウント不要。provider_staff.shift_access_token（推測不可能なUUID）付きの
// このURLを店舗がLINE等で個別に送る想定。認証はこのトークンの知識のみに依存する。
//
// でお指摘2026-09-14：
// ①日付をtype="date"で1件ずつ手打ちするのは時間がかかる→カレンダーをタップして選び、
//   時間帯もプリセットからすぐ選べるように作り直した。
// ②「日付ごとに『提出する』ボタンを押す」のがネック→出勤/休み・時間帯を選んだ瞬間に
//   自動保存し、ページ全体の最後に「これで提出完了」ボタンを1つだけ用意する形にした。
// でお要望2026-10-02：1日ずつ全部入れるのが大変→「まとめて選ぶ」モードで複数日（曜日・
//   全日のショートカット付き）を選び、同じ出勤時間帯／休みを一括提出できるようにした。

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

const TIME_OPTIONS = (() => {
  const out = [];
  for (let m = 8 * 60; m <= 23 * 60; m += 30) {
    const h = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    out.push(`${h}:${mm}`);
  }
  return out;
})();

const PRESETS = [
  { label: '午前（10-13時）', start: '10:00', end: '13:00' },
  { label: '午後（13-18時）', start: '13:00', end: '18:00' },
  { label: '夜（18-22時）', start: '18:00', end: '22:00' },
  { label: '終日（10-22時）', start: '10:00', end: '22:00' },
];

function monthsInRange(start, end) {
  const months = [];
  let cur = new Date(start + 'T00:00:00Z');
  cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), 1));
  const last = new Date(end + 'T00:00:00Z');
  while (cur <= last) {
    months.push({ year: cur.getUTCFullYear(), month: cur.getUTCMonth() });
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
  }
  return months;
}
function buildMonthCells(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  return cells;
}

export default function StaffShiftPage({ params }) {
  const token = params.token;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editStart, setEditStart] = useState('10:00');
  const [editEnd, setEditEnd] = useState('18:00');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [submittingAll, setSubmittingAll] = useState(false);
  const [multiMode, setMultiMode] = useState(false);
  const [multiDates, setMultiDates] = useState([]);
  const [multiType, setMultiType] = useState('work');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff-shift/${token}`);
      if (!res.ok) { setError('リンクが無効です。店舗にご確認ください。'); setLoading(false); return; }
      setData(await res.json());
    } catch {
      setError('通信エラーが発生しました');
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [token]);

  const requestsByDate = useMemo(() => {
    const map = {};
    (data?.requests || []).forEach(r => {
      // 同じ日にwork/offが両方あるのは本来起きない想定だが、あれば休み希望を優先表示
      if (!map[r.date] || r.type === 'off') map[r.date] = r;
    });
    return map;
  }, [data]);

  function toggleMultiDate(date) {
    setMultiDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  }
  function datesInPeriod() {
    const out = [];
    const cur = new Date(data.period.period_start + 'T00:00:00Z');
    const last = new Date(data.period.period_end + 'T00:00:00Z');
    while (cur <= last) { out.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
    return out;
  }
  function toggleWeekday(wd) {
    const target = datesInPeriod().filter(d => new Date(d + 'T00:00:00Z').getUTCDay() === wd);
    setMultiDates(prev => {
      const allOn = target.every(d => prev.includes(d));
      return allOn ? prev.filter(d => !target.includes(d)) : [...new Set([...prev, ...target])];
    });
  }
  function enterMulti() {
    setMultiMode(true);
    setSelectedDate(null);
    setMultiDates([]);
  }
  function leaveMulti() {
    setMultiMode(false);
    setMultiDates([]);
  }

  async function saveMulti() {
    if (!multiDates.length) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff-shift/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_id: data.period.id, dates: multiDates, type: multiType,
          start_time: multiType === 'work' ? editStart : null, end_time: multiType === 'work' ? editEnd : null,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        const savedDates = new Set(multiDates);
        setData(prev => ({ ...prev, requests: [...(prev.requests || []).filter(r => !savedDates.has(r.date)), ...saved] }));
        setMultiDates([]);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
      } else {
        const err = await res.json().catch(() => ({}));
        alert('エラー: ' + (err.error || '不明'));
      }
    } catch {
      alert('通信エラーが発生しました');
    }
    setSaving(false);
  }

  async function clearMulti() {
    const targets = multiDates.filter(d => requestsByDate[d]);
    if (!targets.length) { alert('選んだ日に取り消せる希望はありません'); return; }
    if (!confirm(`選んだ日のうち${targets.length}日分の希望を取り消しますか？`)) return;
    setSaving(true);
    const qs = new URLSearchParams({ period_id: data.period.id, dates: targets.join(',') });
    const res = await fetch(`/api/staff-shift/${token}?${qs}`, { method: 'DELETE' });
    setSaving(false);
    if (res.ok) {
      const gone = new Set(targets);
      setData(prev => ({ ...prev, requests: (prev.requests || []).filter(r => !gone.has(r.date)) }));
      setMultiDates([]);
    } else alert('取り消しに失敗しました');
  }

  function openDay(date) {
    if (!data?.period) return;
    if (date < data.period.period_start || date > data.period.period_end) return;
    if (multiMode) { toggleMultiDate(date); return; }
    setSelectedDate(date);
    const existing = requestsByDate[date];
    if (existing?.type === 'work') {
      setEditStart(existing.start_time || '10:00');
      setEditEnd(existing.end_time || '18:00');
    } else {
      setEditStart('10:00');
      setEditEnd('18:00');
    }
  }

  // 選んだ瞬間に自動保存する（でお指摘2026-09-14：日付ごとの提出ボタンが手間だった）。
  // 保存の度に一覧を作り直すと選択中のパネルが消えてしまうため、dataは部分的に
  // 更新するだけにして、selectedDateは保持する。
  async function autoSave(date, type, start, end) {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff-shift/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: data.period.id, date, type, start_time: start, end_time: end }),
      });
      if (res.ok) {
        const saved = await res.json();
        setData(prev => ({
          ...prev,
          requests: [...(prev.requests || []).filter(r => !(r.date === date)), saved],
        }));
        // でお指摘2026-09-14：端に小さく「保存中」と出るだけでは気づかず、何回も
        // ボタンを押してしまう→画面上部に大きく帯で「保存中…」「✓保存しました」を
        // 出し、見落としようがなくする。
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
      } else {
        const err = await res.json().catch(() => ({}));
        alert('エラー: ' + (err.error || '不明'));
      }
    } catch {
      alert('通信エラーが発生しました');
    }
    setSaving(false);
  }

  async function clearDay(date) {
    const existing = requestsByDate[date];
    if (!existing) return;
    setSaving(true);
    const qs = new URLSearchParams({ period_id: data.period.id, date: existing.date, type: existing.type });
    const res = await fetch(`/api/staff-shift/${token}?${qs}`, { method: 'DELETE' });
    setSaving(false);
    if (res.ok) setData(prev => ({ ...prev, requests: (prev.requests || []).filter(r => r.date !== date) }));
    else alert('取り消しに失敗しました');
  }

  async function submitAll() {
    if (!data?.period) return;
    if (!confirm('ここまでの内容で提出を完了しますか？（後からでも希望は変更できます）')) return;
    setSubmittingAll(true);
    const res = await fetch(`/api/staff-shift/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_id: data.period.id }),
    });
    setSubmittingAll(false);
    if (res.ok) { setData(prev => ({ ...prev, submitted: true, period: { ...prev.period, locked: !!prev.period.pastDeadline } })); alert('提出が完了しました。ありがとうございました！'); }
    else alert('送信に失敗しました');
  }

  const cardStyle = { background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '18px' };
  const labelStyle = { fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '4px' };
  const selectStyle = { padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(255,255,255,0.05)', color: '#e8e4dc', boxSizing: 'border-box', fontSize: '15px' };

  if (loading) return <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(232,228,220,0.6)' }}>読み込み中…</div>;
  if (error || !data) return <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(232,228,220,0.6)' }}>{error || 'エラーが発生しました'}</div>;

  const selectedReq = selectedDate ? requestsByDate[selectedDate] : null;

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', padding: '0 20px 60px', color: '#e8e4dc' }}>
      {(saving || savedFlash) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999, textAlign: 'center', padding: '13px', fontWeight: '800', fontSize: '14px', background: saving ? '#c9a84c' : '#4ade80', color: '#0a0f1e' }}>
          {saving ? '保存中…' : '✓ 保存しました'}
        </div>
      )}
      <h1 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px' }}>{data.provider.name} シフト希望</h1>
      <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.6)', margin: '0 0 20px' }}>{data.staff.name}さん</p>

      {!data.period ? (
        <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.7)' }}>現在、希望を募集中の期間はありません。店舗からの案内をお待ちください。</p>
      ) : (
        <>
          <div style={{ ...cardStyle, marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px' }}>対象期間：{data.period.period_start} 〜 {data.period.period_end}</p>
            {data.period.request_deadline && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#c9a84c', fontWeight: '700' }}>提出締切：{data.period.request_deadline}</p>}
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'rgba(232,228,220,0.6)' }}>日付をタップして、出勤・休みの希望を選んでください（1日ずつ選ぶ場合はその場で自動保存）。「まとめて選ぶ」なら複数日に同じ内容を一括で入力できます。<span style={{ color: '#60a5fa' }}>■</span> 出勤希望　<span style={{ color: '#f87171' }}>■</span> 休み希望</p>
            {data.submitted && <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#4ade80', fontWeight: '700' }}>✓ 提出完了しています{data.period.locked ? '' : '（締切までは内容を変更できます）'}</p>}
          </div>

          {data.period.pastDeadline && !data.period.locked && (
            <div style={{ ...cardStyle, marginBottom: '16px', border: '1px solid #c9a84c' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#c9a84c' }}>提出締切を過ぎています</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(232,228,220,0.7)', lineHeight: 1.6 }}>遅れての提出になります。「提出する」を押すと、以降は希望の変更ができなくなります。</p>
            </div>
          )}
          {data.period.locked && (
            <div style={{ ...cardStyle, marginBottom: '16px', border: '1px solid #f87171' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#f87171' }}>提出締切を過ぎ、提出済みのため変更できません</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(232,228,220,0.7)', lineHeight: 1.6 }}>希望の変更はできません。変更したい場合は店舗に直接連絡してください。下は提出済みの内容です。</p>
            </div>
          )}
          <div style={data.period.locked ? { pointerEvents: 'none', opacity: 0.5 } : undefined}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button type="button" onClick={leaveMulti} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', background: !multiMode ? '#c9a84c' : 'rgba(232,228,220,0.1)', color: !multiMode ? '#0a0f1e' : '#e8e4dc' }}>1日ずつ選ぶ</button>
            <button type="button" onClick={enterMulti} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', background: multiMode ? '#c9a84c' : 'rgba(232,228,220,0.1)', color: multiMode ? '#0a0f1e' : '#e8e4dc' }}>まとめて選ぶ（複数日）</button>
          </div>

          {monthsInRange(data.period.period_start, data.period.period_end).map(({ year, month }) => (
            <div key={`${year}-${month}`} style={{ ...cardStyle, marginBottom: '16px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '700' }}>{year}年{month + 1}月</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '4px' }}>
                {WEEKDAY_JA.map(w => <div key={w} style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(232,228,220,0.4)' }}>{w}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
                {buildMonthCells(year, month).map((date, i) => {
                  if (!date) return <div key={i} />;
                  const inRange = date >= data.period.period_start && date <= data.period.period_end;
                  const req = requestsByDate[date];
                  const isSelected = multiMode ? multiDates.includes(date) : date === selectedDate;
                  const day = Number(date.slice(-2));
                  return (
                    <button
                      key={date}
                      type="button"
                      disabled={!inRange}
                      onClick={() => openDay(date)}
                      style={{
                        aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '8px', border: isSelected ? '2px solid #c9a84c' : '1px solid rgba(232,228,220,0.1)',
                        background: !inRange ? 'transparent' : isSelected && multiMode ? 'rgba(201,168,76,0.3)' : req?.type === 'off' ? 'rgba(248,113,113,0.18)' : req?.type === 'work' ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.03)',
                        color: !inRange ? 'rgba(232,228,220,0.2)' : '#e8e4dc', cursor: inRange ? 'pointer' : 'default', fontSize: '13px', padding: 0,
                      }}
                    >
                      <span>{day}</span>
                      {req && <span style={{ fontSize: '8px', marginTop: '1px' }}>{req.type === 'off' ? '休' : req.start_time?.slice(0, 5)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {multiMode && (
            <div style={{ ...cardStyle, marginBottom: '20px', border: '1.5px solid #c9a84c' }}>
              <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700' }}>まとめて入力</p>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'rgba(232,228,220,0.6)' }}>カレンダーの日付を複数タップするか、下の曜日ボタンで選んでください。</p>

              <label style={labelStyle}>曜日でまとめて選ぶ（もう一度押すと解除）</label>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {WEEKDAY_JA.map((w, wd) => (
                  <button key={w} type="button" onClick={() => toggleWeekday(wd)} style={{ flex: 1, padding: '8px 0', borderRadius: '8px', border: '1px solid rgba(232,228,220,0.2)', background: 'rgba(255,255,255,0.05)', color: wd === 0 ? '#f87171' : wd === 6 ? '#60a5fa' : '#e8e4dc', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>{w}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button type="button" onClick={() => setMultiDates(datesInPeriod())} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid rgba(232,228,220,0.2)', background: 'none', color: '#e8e4dc', fontSize: '12px', cursor: 'pointer' }}>期間内の全日を選ぶ</button>
                <button type="button" onClick={() => setMultiDates([])} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid rgba(232,228,220,0.2)', background: 'none', color: '#e8e4dc', fontSize: '12px', cursor: 'pointer' }}>選択をすべて解除</button>
              </div>

              <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: multiDates.length ? '#c9a84c' : 'rgba(232,228,220,0.5)' }}>{multiDates.length ? `${multiDates.length}日を選択中` : 'まだ日付を選んでいません'}</p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button type="button" onClick={() => setMultiType('work')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: multiType === 'work' ? '#60a5fa' : 'rgba(232,228,220,0.1)', color: multiType === 'work' ? '#0a0f1e' : '#e8e4dc' }}>出勤したい</button>
                <button type="button" onClick={() => setMultiType('off')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: multiType === 'off' ? '#f87171' : 'rgba(232,228,220,0.1)', color: multiType === 'off' ? '#0a0f1e' : '#e8e4dc' }}>休みたい</button>
              </div>

              {multiType === 'work' && (
                <>
                  <label style={labelStyle}>よく使う時間帯</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {PRESETS.map(p => (
                      <button key={p.label} type="button" onClick={() => { setEditStart(p.start); setEditEnd(p.end); }}
                        style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(232,228,220,0.2)', background: editStart === p.start && editEnd === p.end ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)', color: '#e8e4dc', fontSize: '12px', cursor: 'pointer' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'end', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>開始</label>
                      <select value={editStart} onChange={e => setEditStart(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>終了</label>
                      <select value={editEnd} onChange={e => setEditEnd(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button type="button" disabled={saving || !multiDates.length} onClick={saveMulti} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#c9a84c', color: '#0a0f1e', fontWeight: '800', fontSize: '14px', cursor: saving || !multiDates.length ? 'not-allowed' : 'pointer', opacity: !multiDates.length ? 0.4 : 1, marginBottom: '8px' }}>
                {multiDates.length ? `選んだ${multiDates.length}日に${multiType === 'work' ? `${editStart}〜${editEnd}で出勤希望を` : '休み希望を'}まとめて保存` : '日付を選んでください'}
              </button>
              <button type="button" disabled={saving || !multiDates.length} onClick={clearMulti} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.4)', background: 'none', color: '#f87171', fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: !multiDates.length ? 0.4 : 1 }}>
                選んだ日の希望をまとめて取り消す
              </button>
            </div>
          )}

          {!multiMode && selectedDate && (
            <div style={{ ...cardStyle, marginBottom: '20px', border: '1.5px solid #c9a84c' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>{selectedDate}</p>
                {saving && <span style={{ fontSize: '11px', color: 'rgba(232,228,220,0.5)' }}>保存中…</span>}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button type="button" disabled={saving} onClick={() => autoSave(selectedDate, 'work', editStart, editEnd)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: selectedReq?.type === 'work' ? '#60a5fa' : 'rgba(232,228,220,0.1)', color: selectedReq?.type === 'work' ? '#0a0f1e' : '#e8e4dc' }}>出勤したい</button>
                <button type="button" disabled={saving} onClick={() => autoSave(selectedDate, 'off', null, null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: selectedReq?.type === 'off' ? '#f87171' : 'rgba(232,228,220,0.1)', color: selectedReq?.type === 'off' ? '#0a0f1e' : '#e8e4dc' }}>休みたい</button>
              </div>

              <label style={labelStyle}>よく使う時間帯（選ぶとすぐ保存されます）</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {PRESETS.map(p => (
                  <button key={p.label} type="button" disabled={saving} onClick={() => { setEditStart(p.start); setEditEnd(p.end); autoSave(selectedDate, 'work', p.start, p.end); }}
                    style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(232,228,220,0.2)', background: selectedReq?.type === 'work' && selectedReq.start_time === p.start && selectedReq.end_time === p.end ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)', color: '#e8e4dc', fontSize: '12px', cursor: 'pointer' }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'end', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>開始</label>
                  <select value={editStart} disabled={saving} onChange={e => { setEditStart(e.target.value); autoSave(selectedDate, 'work', e.target.value, editEnd); }} style={{ ...selectStyle, width: '100%' }}>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>終了</label>
                  <select value={editEnd} disabled={saving} onChange={e => { setEditEnd(e.target.value); autoSave(selectedDate, 'work', editStart, e.target.value); }} style={{ ...selectStyle, width: '100%' }}>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {selectedReq && (
                <button type="button" disabled={saving} onClick={() => clearDay(selectedDate)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.4)', background: 'none', color: '#f87171', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  この日の希望を取り消す
                </button>
              )}
            </div>
          )}

          <h2 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 10px', color: 'rgba(232,228,220,0.6)' }}>提出済みの希望一覧</h2>
          {!data.requests.length ? (
            <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.5)' }}>まだ希望がありません。上のカレンダーから選んでください。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
              {data.requests.slice().sort((a, b) => a.date.localeCompare(b.date)).map(r => (
                <div key={r.id} onClick={() => openDay(r.date)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(10,15,30,0.4)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <span style={{ flex: 1 }}>{r.date}　{r.type === 'work' ? `出勤 ${r.start_time}〜${r.end_time}` : '休み希望'}</span>
                </div>
              ))}
            </div>
          )}

          <button type="button" disabled={submittingAll} onClick={submitAll} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#111', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: submittingAll ? 'not-allowed' : 'pointer', opacity: submittingAll ? 0.5 : 1 }}>
            {submittingAll ? '送信中…' : data.submitted ? 'この内容で提出し直す' : 'ここまでの内容で提出を完了する'}
          </button>
          </div>
        </>
      )}
    </div>
  );
}
