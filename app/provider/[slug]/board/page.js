'use client';

// 店頭タブレット予約ボード（でお要望2026-09-14：hacomonoの「予約ボード」相当機能）。
// 店内に設置したタブレットから、スタッフを介さずお客様自身がその場で空き枠を選んで
// 予約できるキオスク画面。即時予約（instant_booking）＋店頭予約ボード（booking_board）
// の両方がONの店舗だけで使える。ログイン不要（Finemeアカウントを持たない来店客も
// その場で予約できる＝user_idなしのゲスト予約として送信）。
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { hasFeature } from '@/lib/feature-flags';

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

export default function BookingBoardPage() {
  const params = useParams();
  const slug = params?.slug;

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState('pick'); // 'pick' | 'form' | 'done'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/providers/${slug}`).then(r => r.ok ? r.json() : null).then(d => { setProvider(d); setLoading(false); });
  }, [slug]);

  const loadSlots = useCallback(() => {
    if (!provider?.id) return;
    const from = fmtDate(dates[0]);
    const to = fmtDate(dates[dates.length - 1]);
    fetch(`/api/providers/${slug}/availability?from=${from}&to=${to}`)
      .then(r => r.ok ? r.json() : [])
      .then(rows => { setSlots(rows); if (!selectedDate && rows.length) setSelectedDate(rows[0].date); else if (!selectedDate) setSelectedDate(fmtDate(dates[0])); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider?.id, slug]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // 予約完了後、次のお客様のために一定時間で自動的にトップへ戻す（キオスク画面の定石）
  useEffect(() => {
    if (step !== 'done') return;
    const t = setTimeout(() => { setStep('pick'); setSelectedSlot(null); setName(''); setPhone(''); loadSlots(); }, 8000);
    return () => clearTimeout(t);
  }, [step, loadSlots]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>読み込み中…</div>;
  if (!provider) return <div style={{ padding: '40px', textAlign: 'center' }}>店舗が見つかりませんでした</div>;
  if (!hasFeature(provider, 'instant_booking') || !hasFeature(provider, 'booking_board')) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>この店舗では店頭予約ボードをご利用いただけません。</div>;
  }

  const slotsForDate = slots.filter(s => s.date === selectedDate);
  const byStaff = {};
  slotsForDate.forEach(s => { const key = s.staff_name || '指名なし'; (byStaff[key] = byStaff[key] || []).push(s); });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setFormError('お名前を入力してください'); return; }
    if (!phone.trim()) { setFormError('電話番号を入力してください'); return; }
    setSubmitting(true); setFormError('');
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: provider.id,
          user_name: name.trim(),
          user_contact: phone.trim(),
          booking_mode: 'instant',
          slot_id: selectedSlot.id,
          staff_id: selectedSlot.staff_id || null,
        }),
      });
      if (res.ok) { setStep('done'); }
      else { const err = await res.json(); setFormError(err.error || '予約に失敗しました。スタッフにお声がけください。'); }
    } catch { setFormError('通信エラーが発生しました。スタッフにお声がけください。'); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ minHeight: '70vh', maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: '26px', fontWeight: '900', textAlign: 'center', margin: '0 0 4px' }}>{provider.name}</h1>
      <p style={{ textAlign: 'center', color: '#888', fontSize: '15px', margin: '0 0 28px' }}>ご予約はこちらから</p>

      {step === 'pick' && (
        <>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px' }}>
            {dates.map(d => {
              const ds = fmtDate(d);
              const count = slots.filter(s => s.date === ds).length;
              return (
                <button
                  key={ds}
                  onClick={() => setSelectedDate(ds)}
                  style={{
                    flexShrink: 0, minWidth: '84px', padding: '14px 8px', borderRadius: '14px', textAlign: 'center', cursor: 'pointer',
                    border: selectedDate === ds ? '2.5px solid #111' : '1.5px solid #e5e7eb',
                    background: selectedDate === ds ? '#111' : '#fff', color: selectedDate === ds ? '#fff' : '#111',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '700' }}>{WEEKDAY_JA[d.getDay()]}</div>
                  <div style={{ fontSize: '20px', fontWeight: '900' }}>{d.getDate()}</div>
                  <div style={{ fontSize: '11px' }}>{count ? `${count}枠` : '満枠'}</div>
                </button>
              );
            })}
          </div>

          {!slotsForDate.length ? (
            <p style={{ textAlign: 'center', color: '#999', fontSize: '15px', padding: '40px 0' }}>この日はご予約いただける空き枠がありません。</p>
          ) : (
            Object.entries(byStaff).map(([staffName, rows]) => (
              <div key={staffName} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#666', marginBottom: '10px' }}>{staffName}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))', gap: '10px' }}>
                  {rows.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSlot(s); setStep('form'); }}
                      style={{ padding: '16px 8px', borderRadius: '12px', border: '2px solid #111', background: '#fff', color: '#111', fontSize: '17px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      {s.start_time}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {step === 'form' && selectedSlot && (
        <form onSubmit={handleSubmit} style={{ maxWidth: '420px', margin: '0 auto' }}>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', marginBottom: '20px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>ご予約日時</p>
            <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: '900' }}>{selectedSlot.date} {selectedSlot.start_time}</p>
            {selectedSlot.staff_name && <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>担当：{selectedSlot.staff_name}</p>}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '6px' }}>お名前 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="山田 太郎" style={{ width: '100%', padding: '16px', fontSize: '18px', border: '2px solid #e5e7eb', borderRadius: '12px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '6px' }}>電話番号 *</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="090-0000-0000" inputMode="tel" style={{ width: '100%', padding: '16px', fontSize: '18px', border: '2px solid #e5e7eb', borderRadius: '12px', boxSizing: 'border-box' }} />
          </div>
          {formError && <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', marginBottom: '14px' }}>{formError}</p>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => { setStep('pick'); setSelectedSlot(null); setFormError(''); }} style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: '700', border: '2px solid #e5e7eb', background: '#fff', borderRadius: '12px', cursor: 'pointer' }}>戻る</button>
            <button type="submit" disabled={submitting} style={{ flex: 2, padding: '16px', fontSize: '18px', fontWeight: '900', border: 'none', background: submitting ? '#9ca3af' : '#111', color: '#fff', borderRadius: '12px', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? '送信中…' : 'この内容で予約する'}
            </button>
          </div>
        </form>
      )}

      {step === 'done' && selectedSlot && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>✓</div>
          <h2 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 10px' }}>ご予約ありがとうございます！</h2>
          <p style={{ fontSize: '17px', color: '#444', margin: '0 0 6px' }}>{selectedSlot.date} {selectedSlot.start_time} 〜</p>
          <p style={{ fontSize: '14px', color: '#999', margin: '24px 0 0' }}>まもなく最初の画面に戻ります</p>
        </div>
      )}
    </div>
  );
}
