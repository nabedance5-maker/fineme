'use client';

// 入会手続きページ（でお要望2026-09-15〜16：「お客様がジムなどの店舗に入会する手続きも
// Fineme上でできるようにしたい」）。ログイン必須（LINE/Financeアカウント）→基本情報→
// プラン・入会日・ロッカー→緊急連絡先→本人確認書類→規約同意→Stripe Checkout(setup)で
// カード登録、で仮契約（pending_approval）になる。実際の課金は店舗が承認した時点。
import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { firstBilling, describeCycle, jstToday } from '@/lib/membership-cycle';

function getAuth() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!key) return null;
    const obj = JSON.parse(localStorage.getItem(key));
    if (!obj?.access_token || !obj?.user?.id) return null;
    return { token: obj.access_token, userId: obj.user.id };
  } catch { return null; }
}

const CARD = { background: 'rgba(10,15,30,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '18px', padding: '28px' };
const LABEL = { fontSize: '12px', fontWeight: 700, color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '5px' };
const INPUT = { padding: '12px 14px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '15px', width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', color: '#e8e4dc' };
const FIELD = { marginBottom: '16px' };
const BTN = { width: '100%', padding: '14px', background: '#c9a84c', color: '#0a0f1e', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' };
const BTN_GHOST = { ...BTN, background: 'transparent', color: '#e8e4dc', border: '1px solid rgba(232,228,220,0.25)' };

export default function JoinMembershipPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug;

  const [auth, setAuth] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const [form, setForm] = useState({
    last_name: '', first_name: '', birthdate: '', postal_code: '', address: '', phone: '',
    // お店から送られた入会のリンク（?plan=）なら、そのプランを選んだ状態で開く（でお要望 2026-10-22）
    plan_id: searchParams.get('plan') || '', enrollment_date: '', locker_id: '', option_ids: [], coupon_code: '',
    last_name_kana: '', first_name_kana: '', gender: '', custom_answers: {},
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
    agree: false,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [idFile, setIdFile] = useState(null);
  // クーポン（でお要望 2026-10-19：hacomono差分 #5）
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState('');
  async function checkCoupon() {
    setCoupon(null); setCouponMsg('');
    if (!form.coupon_code.trim()) return;
    const r = await fetch(`/api/providers/${slug}/membership-coupon?code=${encodeURIComponent(form.coupon_code.trim())}`);
    const d = await r.json().catch(() => ({}));
    if (r.ok) setCoupon(d); else setCouponMsg(d.error || 'このクーポンコードは使えません');
  }
  const toggleOption = id => setForm(f => ({ ...f, option_ids: f.option_ids.includes(id) ? f.option_ids.filter(x => x !== id) : [...f.option_ids, id] }));
  const [membershipId, setMembershipId] = useState(null);

  useEffect(() => {
    const a = getAuth();
    setAuth(a);
    if (!slug) return;
    fetch(`/api/providers/${slug}/membership-info${searchParams.get('plan') ? `?plan=${encodeURIComponent(searchParams.get('plan'))}` : ''}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setInfo)
      .catch(() => setError('この店舗はオンライン入会に対応していません'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Stripe Checkout(setup)から戻ってきた場合の確定処理
  const confirmSetup = useCallback(async (mid, token) => {
    setSubmitting(true);
    const res = await fetch(`/api/me/memberships/${mid}/confirm-setup`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    setSubmitting(false);
    if (res.ok) {
      setResultMessage('仮契約が完了しました！店舗の確認・承認をお待ちください。承認され次第、登録したカードでお支払いが開始されます。');
      setStep(99);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'カード登録の確認に失敗しました');
    }
  }, []);

  useEffect(() => {
    const mid = searchParams.get('membership');
    const setupResult = searchParams.get('setup');
    const a = getAuth();
    if (mid && setupResult === 'success' && a) confirmSetup(mid, a.token);
    if (mid && setupResult === 'cancel') { setMembershipId(mid); setError('カード登録がキャンセルされました。もう一度お試しください'); setStep(5); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 20px', color: '#e8e4dc' }}>読み込み中…</div>;
  if (error && !info) return <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 20px', color: '#e8e4dc' }}>{error}</div>;
  if (!auth) {
    return (
      <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 20px' }}>
        <div style={CARD}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px', color: '#e8e4dc' }}>{info?.provider_name} への入会</h1>
          <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.7)', margin: '0 0 20px' }}>入会手続きにはFinemeへのログインが必要です。</p>
          <a href={`/login?next=${encodeURIComponent(`/provider/${slug}/join`)}`} style={{ ...BTN, display: 'block', textAlign: 'center', textDecoration: 'none' }}>ログイン / 新規登録</a>
        </div>
      </div>
    );
  }

  if (step === 99) {
    return (
      <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 20px' }}>
        <div style={CARD}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 12px', color: '#e8e4dc' }}>お申込みありがとうございます</h1>
          <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.85)', lineHeight: 1.8 }}>{resultMessage}</p>
          <a href="/mypage" style={{ ...BTN_GHOST, display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '16px' }}>マイページへ</a>
        </div>
      </div>
    );
  }

  // 店舗が決めた入会フォームの項目（でお要望 2026-10-19：hacomono差分 #10）
  const FF = info?.form_fields || {};
  const shown = k => (FF[k] || 'optional') !== 'hidden';
  const req = k => FF[k] === 'required';
  const mark = k => (req(k) ? ' *' : '');
  const customFields = info?.custom_fields || [];
  const setCustom = (id, v) => setForm(f => ({ ...f, custom_answers: { ...f.custom_answers, [id]: v } }));
  const toggleCustom = (id, opt) => setForm(f => { const cur = Array.isArray(f.custom_answers[id]) ? f.custom_answers[id] : []; return { ...f, custom_answers: { ...f.custom_answers, [id]: cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt] } }; });
  const hasStep3 = shown('emergency') || customFields.length > 0;
  const step1Ok = form.last_name && form.first_name && form.phone
    && (!req('kana') || (form.last_name_kana.trim() && form.first_name_kana.trim()))
    && (!req('gender') || form.gender) && (!req('birthdate') || form.birthdate)
    && (!req('postal_code') || form.postal_code.replace(/\D/g, '').length === 7) && (!req('address') || form.address.trim());
  const step3Ok = (!req('emergency') || (form.emergency_contact_name.trim() && form.emergency_contact_phone.trim()))
    && customFields.every(q => !q.required || (Array.isArray(form.custom_answers[q.id]) ? form.custom_answers[q.id].length : String(form.custom_answers[q.id] ?? '').trim()));

  const selectedPlan = info?.plans.find(p => p.id === form.plan_id);
  const selectedLocker = info?.lockers?.find(l => l.id === form.locker_id);
  // ロッカーを選んだ場合は同じサブスクリプションの明細として一緒に課金されるため、
  // 見積もりにもロッカー代を含める（でお要望2026-09-18：「ロッカー代を自動で一緒に
  // 課金したい」）。
  // プランに必ず付くオプションと、このプランで選べるオプション（でお要望 2026-10-22）
  const includedOptions = (info?.options || []).filter(o => (selectedPlan?.included_option_ids || []).includes(o.id));
  const selectableOptions = (info?.options || []).filter(o => !includedOptions.includes(o) && (selectedPlan?.selectable_option_ids == null || selectedPlan.selectable_option_ids.includes(o.id)));
  const optionTotal = [...includedOptions, ...selectableOptions.filter(o => form.option_ids.includes(o.id))].reduce((t, o) => t + o.monthly_price, 0);
  const monthlyTotal = (selectedPlan?.monthly_price || 0) + (selectedLocker?.monthly_fee || 0) + optionTotal;
  // 請求の予定（お店の請求日・初月の扱いどおり。でお指摘 2026-10-27）。入会日が過ぎていれば承認日から
  const billingPlan = (selectedPlan && form.enrollment_date && info?.billing_cycle)
    ? firstBilling(info.billing_cycle, { startDate: form.enrollment_date > jstToday() ? form.enrollment_date : jstToday(), monthlyTotal, initialFee: selectedPlan.initial_fee || 0 })
    : null;

  async function submitApplication() {
    setSubmitting(true); setError('');
    const res = await fetch('/api/me/memberships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({
        provider_id: info.provider_id, plan_id: form.plan_id, enrollment_date: form.enrollment_date, locker_id: form.locker_id || null,
        via_store_link: !!searchParams.get('plan') && searchParams.get('plan') === form.plan_id,
        option_ids: form.option_ids, coupon_code: coupon ? form.coupon_code.trim() : null,
        last_name_kana: form.last_name_kana, first_name_kana: form.first_name_kana, gender: form.gender || null, custom_answers: form.custom_answers,
        last_name: form.last_name, first_name: form.first_name, birthdate: form.birthdate || null, postal_code: form.postal_code, address: form.address, phone: form.phone,
        emergency_contact_name: form.emergency_contact_name, emergency_contact_phone: form.emergency_contact_phone, emergency_contact_relation: form.emergency_contact_relation,
        terms_snapshot: info.terms_text || '（この店舗は規約テキストを設定していません）',
      }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setSubmitting(false); setError(d.error || '申込の保存に失敗しました'); return; }
    const membership = await res.json();
    setMembershipId(membership.id);

    if (info.require_id_document && idFile) {
      const fd = new FormData(); fd.append('image', idFile);
      const upRes = await fetch(`/api/me/memberships/${membership.id}/upload-id`, { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` }, body: fd });
      if (!upRes.ok) { setSubmitting(false); setError('本人確認書類のアップロードに失敗しました'); return; }
    }

    const coRes = await fetch(`/api/me/memberships/${membership.id}/checkout`, { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` } });
    setSubmitting(false);
    if (!coRes.ok) { const d = await coRes.json().catch(() => ({})); setError(d.error || 'カード登録手続きの開始に失敗しました'); return; }
    const { url } = await coRes.json();
    window.location.href = url;
  }

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', color: '#e8e4dc' }}>{info?.provider_name} への入会</h1>
      <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.5)', margin: '0 0 18px' }}>STEP {step} / 5</p>

      <div style={CARD}>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 14px' }}>{error}</p>}

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '15px', color: '#e8e4dc', margin: '0 0 16px' }}>基本情報</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ ...FIELD, flex: 1 }}><label style={LABEL}>姓 *</label><input style={INPUT} value={form.last_name} onChange={e => set('last_name', e.target.value)} /></div>
              <div style={{ ...FIELD, flex: 1 }}><label style={LABEL}>名 *</label><input style={INPUT} value={form.first_name} onChange={e => set('first_name', e.target.value)} /></div>
            </div>
            {shown('kana') && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...FIELD, flex: 1 }}><label style={LABEL}>セイ{mark('kana')}</label><input style={INPUT} value={form.last_name_kana} onChange={e => set('last_name_kana', e.target.value)} placeholder="ヤマダ" /></div>
                <div style={{ ...FIELD, flex: 1 }}><label style={LABEL}>メイ{mark('kana')}</label><input style={INPUT} value={form.first_name_kana} onChange={e => set('first_name_kana', e.target.value)} placeholder="ハナコ" /></div>
              </div>
            )}
            {shown('gender') && (
              <div style={FIELD}><label style={LABEL}>性別{mark('gender')}</label>
                <select style={INPUT} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">選択してください</option><option value="female">女性</option><option value="male">男性</option><option value="other">その他・回答しない</option>
                </select>
              </div>
            )}
            {shown('birthdate') && <div style={FIELD}><label style={LABEL}>生年月日{mark('birthdate')}</label><input type="date" style={INPUT} value={form.birthdate} onChange={e => set('birthdate', e.target.value)} /></div>}
            {shown('postal_code') && <div style={FIELD}><label style={LABEL}>郵便番号{mark('postal_code')}</label><input style={INPUT} value={form.postal_code} onChange={e => set('postal_code', e.target.value)} placeholder="123-4567" /></div>}
            {shown('address') && <div style={FIELD}><label style={LABEL}>ご住所{mark('address')}</label><input style={INPUT} value={form.address} onChange={e => set('address', e.target.value)} /></div>}
            <div style={FIELD}><label style={LABEL}>電話番号 *</label><input style={INPUT} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <button style={BTN} onClick={() => setStep(2)} disabled={!step1Ok}>次へ</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '15px', color: '#e8e4dc', margin: '0 0 16px' }}>プラン・入会日</h2>
            <div style={FIELD}>
              <label style={LABEL}>プラン *</label>
              <select style={INPUT} value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value, option_ids: [] }))}>
                <option value="">選択してください</option>
                {info?.plans.map(p => <option key={p.id} value={p.id}>{p.name}（月額¥{p.monthly_price.toLocaleString()}）</option>)}
              </select>
            </div>
            <div style={FIELD}><label style={LABEL}>入会希望日 *</label><input type="date" style={INPUT} value={form.enrollment_date} onChange={e => set('enrollment_date', e.target.value)} /></div>
            {info?.lockers?.length > 0 && (
              <div style={FIELD}>
                <label style={LABEL}>ロッカー（任意・後から追加も可能）</label>
                <select style={INPUT} value={form.locker_id} onChange={e => set('locker_id', e.target.value)}>
                  <option value="">利用しない</option>
                  {info.lockers.map(l => <option key={l.id} value={l.id}>{l.name}{l.monthly_fee ? `（月額¥${l.monthly_fee.toLocaleString()}）` : ''}</option>)}
                </select>
              </div>
            )}
            {selectedPlan && (selectedPlan.description || selectedPlan.initial_fee > 0 || (selectedPlan.ticket_grants || []).length > 0 || includedOptions.length > 0) && (
              <div style={{ ...FIELD, fontSize: '13px', color: '#fff', lineHeight: 1.8 }}>
                {selectedPlan.description && <p style={{ margin: '0 0 4px' }}>{selectedPlan.description}</p>}
                {selectedPlan.initial_fee > 0 && <p style={{ margin: 0 }}>入会金：¥{selectedPlan.initial_fee.toLocaleString()}（初回のみ）</p>}
                {(selectedPlan.ticket_grants || []).map((g, i) => { const nm = (info.tickets || []).find(t => t.id === g.ticket_id)?.name; return nm ? <p key={i} style={{ margin: 0 }}>{g.timing === 'monthly' ? '毎月' : 'ご入会時'}：{nm}{g.unlimited ? '（使い放題）' : ` ${g.sessions}枚`}</p> : null; })}
                {includedOptions.map(o => <p key={o.id} style={{ margin: 0 }}>含まれるオプション：{o.name}（月額¥{o.monthly_price.toLocaleString()}）</p>)}
              </div>
            )}
            {selectableOptions.length > 0 && (
              <div style={FIELD}>
                <label style={LABEL}>オプション（任意・月会費と一緒にお支払い）</label>
                {selectableOptions.map(o => (
                  <label key={o.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 0', fontSize: '14px', color: '#fff', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.option_ids.includes(o.id)} onChange={() => toggleOption(o.id)} style={{ marginTop: '3px' }} />
                    <span>{o.name}（月額¥{o.monthly_price.toLocaleString()}）{o.description && <span style={{ display: 'block', fontSize: '12px', color: '#fff' }}>{o.description}</span>}</span>
                  </label>
                ))}
              </div>
            )}
            {info?.has_coupons && (
              <div style={FIELD}>
                <label style={LABEL}>クーポンコード（お持ちの方）</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input style={INPUT} value={form.coupon_code} onChange={e => { set('coupon_code', e.target.value); setCoupon(null); setCouponMsg(''); }} placeholder="例：SPRING2026" />
                  <button type="button" style={{ ...BTN_GHOST, width: 'auto', padding: '0 16px', fontSize: '14px', whiteSpace: 'nowrap' }} onClick={checkCoupon}>適用</button>
                </div>
                {coupon && <p style={{ fontSize: '13px', color: '#fff', margin: '6px 0 0', fontWeight: 700 }}>「{coupon.name}」が使えます：月会費から{coupon.text}（承認時に適用されます）</p>}
                {couponMsg && <p style={{ fontSize: '13px', color: '#fff', margin: '6px 0 0' }}>{couponMsg}</p>}
              </div>
            )}
            {selectedPlan && form.enrollment_date && (
              <p style={{ fontSize: '12.5px', color: 'rgba(232,228,220,0.6)', margin: '0 0 16px' }}>
                <span style={{ display: 'block', fontWeight: 700, color: 'rgba(232,228,220,0.85)', marginBottom: '4px' }}>お支払いの予定（目安）</span>
                {(billingPlan?.charges || []).map((c, i) => (
                  <span key={i} style={{ display: 'block' }}>{c.date ? `${Number(c.date.slice(5, 7))}/${Number(c.date.slice(8, 10))}　` : ''}{c.label}：¥{c.amount.toLocaleString()}</span>
                ))}
                <span style={{ display: 'block', marginTop: '6px' }}>{describeCycle(info.billing_cycle)}。金額はお店が入会を承認した時に確定します。</span>
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={BTN_GHOST} onClick={() => setStep(1)}>戻る</button>
              <button style={BTN} onClick={() => setStep(hasStep3 ? 3 : 4)} disabled={!form.plan_id || !form.enrollment_date || (form.coupon_code.trim() && !coupon)}>次へ</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            {shown('emergency') && (
              <>
                <h2 style={{ fontSize: '15px', color: '#e8e4dc', margin: '0 0 6px' }}>緊急連絡先{req('emergency') ? '' : '（任意）'}</h2>
                <p style={{ fontSize: '12.5px', color: 'rgba(232,228,220,0.55)', margin: '0 0 16px' }}>万が一の際にご連絡する先です。</p>
                <div style={FIELD}><label style={LABEL}>お名前{mark('emergency')}</label><input style={INPUT} value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} /></div>
                <div style={FIELD}><label style={LABEL}>続柄</label><input style={INPUT} value={form.emergency_contact_relation} onChange={e => set('emergency_contact_relation', e.target.value)} placeholder="例：配偶者・親" /></div>
                <div style={FIELD}><label style={LABEL}>電話番号{mark('emergency')}</label><input style={INPUT} value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} /></div>
              </>
            )}
            {customFields.length > 0 && (
              <>
                <h2 style={{ fontSize: '15px', color: '#e8e4dc', margin: shown('emergency') ? '24px 0 16px' : '0 0 16px' }}>お店からの質問</h2>
                {customFields.map(q => (
                  <div key={q.id} style={FIELD}>
                    <label style={LABEL}>{q.label}{q.required ? ' *' : ''}</label>
                    {q.type === 'text' && <textarea style={{ ...INPUT, minHeight: '80px', fontFamily: 'inherit' }} value={form.custom_answers[q.id] || ''} onChange={e => setCustom(q.id, e.target.value)} maxLength={2000} />}
                    {q.type === 'single' && (
                      <select style={INPUT} value={form.custom_answers[q.id] || ''} onChange={e => setCustom(q.id, e.target.value)}>
                        <option value="">選択してください</option>
                        {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {q.type === 'multi' && q.options.map(o => (
                      <label key={o} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '6px 0', fontSize: '14px', color: '#fff', cursor: 'pointer' }}>
                        <input type="checkbox" checked={(form.custom_answers[q.id] || []).includes(o)} onChange={() => toggleCustom(q.id, o)} />{o}
                      </label>
                    ))}
                  </div>
                ))}
              </>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={BTN_GHOST} onClick={() => setStep(2)}>戻る</button>
              <button style={BTN} onClick={() => setStep(4)} disabled={!step3Ok}>次へ</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '15px', color: '#e8e4dc', margin: '0 0 6px' }}>本人確認書類</h2>
            <p style={{ fontSize: '12.5px', color: 'rgba(232,228,220,0.55)', margin: '0 0 16px' }}>
              運転免許証・保険証・パスポートのいずれかの写真をアップロードしてください（マイナンバーカードはご利用いただけません）。
              {!info?.require_id_document && '（この店舗では任意です）'}
            </p>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setIdFile(e.target.files?.[0] || null)} style={{ color: '#e8e4dc', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={BTN_GHOST} onClick={() => setStep(hasStep3 ? 3 : 2)}>戻る</button>
              <button style={BTN} onClick={() => setStep(5)} disabled={info?.require_id_document && !idFile}>次へ</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '15px', color: '#e8e4dc', margin: '0 0 16px' }}>利用規約・同意</h2>
            <div style={{ maxHeight: '220px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(232,228,220,0.12)', borderRadius: '10px', padding: '14px', fontSize: '12.5px', color: 'rgba(232,228,220,0.8)', whiteSpace: 'pre-wrap', marginBottom: '14px' }}>
              {info?.terms_text || 'この店舗は規約テキストを設定していません。ご不明点は店舗に直接お問い合わせください。'}
            </div>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: '#e8e4dc', marginBottom: '18px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.agree} onChange={e => set('agree', e.target.checked)} style={{ marginTop: '3px' }} />
              上記の利用規約・同意書の内容を確認し、同意します
            </label>
            <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.5)', margin: '0 0 16px' }}>次に進むとカード登録画面（Stripe）が開きます。ここではまだ課金されません。店舗の確認・承認後に、登録したカードで初回のお支払いが行われます。</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={BTN_GHOST} onClick={() => setStep(4)} disabled={submitting}>戻る</button>
              <button style={BTN} onClick={submitApplication} disabled={!form.agree || submitting}>{submitting ? '処理中…' : 'カードを登録して申し込む'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
