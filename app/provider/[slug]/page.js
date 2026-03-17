'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';

// anon キー（公開前提・RLSで保護）
const supabaseAnon = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

const CATEGORY_LABELS = {
  gym:'パーソナルジム', eyebrow:'眉毛サロン', hair:'美容院・ヘア',
  skin:'肌・エステ', fashion:'ファッション', photo:'写真撮影',
  consulting:'外見トータルサポート', makeup:'メイク', nail:'ネイル',
  hairremoval:'脱毛', whitening:'ホワイトニング', orthodontics:'歯科矯正',
  aga:'AGA', marriage:'結婚相談所', diagnosis:'骨格診断',
};
const TRIGGER_LABELS = { matching_app:'マッチングアプリで結果を出したい', love:'好きな人ができた', career:'就職・転職前', word:'何かの一言が刺さった', vague:'ずっと気になっていた' };
const FAILURE_LABELS = { lost_direction:'方向がわからなくなった経験がある方', no_continuation:'続かなかった経験がある方', cost:'コストで断念した経験がある方', awkward:'プロとの相性で悩んだ経験がある方', no_result:'変化が感じられなかった経験がある方', ongoing:'今も継続中でさらに深化させたい方' };
const STYLE_LABELS = { explanation:'「なぜそうするのか」を丁寧に説明するスタイル', consultation:'一緒に相談しながら進めるスタイル', delegate:'任せてもらって結果を出すスタイル', cautious:'小さく始めて様子を見ながら進めるスタイル' };
const TIME_OPTIONS = ['9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
const TABS = [
  { id: 'overview', label: '概要' },
  { id: 'menu', label: 'メニュー' },
  { id: 'reservation', label: '予約リクエスト' },
];

function calcMatch(p, d) {
  let score = 0, total = 0;
  if (d.trigger && p.suitable_triggers?.length) { total += 2; if (p.suitable_triggers.includes(d.trigger)) score += 2; }
  if (d.failure_pattern && p.handles_failure_patterns?.length) { total += 3; if (p.handles_failure_patterns.includes(d.failure_pattern)) score += 3; }
  if (d.style && p.provider_style) { total += 2; if (p.provider_style === d.style) score += 2; }
  return total === 0 ? null : Math.round((score / total) * 100);
}

/* ── タブバー ── */
function TabBar({ activeTab, onSelect }) {
  return (
    <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '28px', gap: '4px' }}>
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            padding: '12px 20px', fontSize: '14px', fontWeight: activeTab === t.id ? '800' : '500',
            color: activeTab === t.id ? '#111' : '#6b7280',
            background: 'none', border: 'none', borderBottom: activeTab === t.id ? '2px solid #111' : '2px solid transparent',
            marginBottom: '-2px', cursor: 'pointer', transition: 'all .15s',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ── 概要タブ ── */
function OverviewTab({ provider, diagnosis, matchScore }) {
  const catLabel = CATEGORY_LABELS[provider.main_category] || provider.main_category;
  const subCats = (provider.sub_categories || []).map(c => CATEGORY_LABELS[c] || c).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 診断との一致度 */}
      {diagnosis && (
        <div style={{ padding: '20px', borderRadius: '16px', border: '1.5px solid #bfdbfe', background: '#eff6ff' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', letterSpacing: '.05em', marginBottom: '6px' }}>🎯 あなたの診断との一致度</div>
          {matchScore !== null ? (
            <>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#1d4ed8', marginBottom: '6px' }}>{matchScore}%</div>
              <div style={{ height: '8px', background: '#dbeafe', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', background: '#2563eb', borderRadius: '99px', width: `${matchScore}%` }} />
              </div>
              <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: '1.6' }}>
                {matchScore >= 80 ? 'あなたの変わり方・過去のパターンにとてもよく合っています。'
                  : matchScore >= 50 ? 'あなたの状況に合っている部分があります。'
                  : '一部の条件が合っています。'}
              </p>
            </>
          ) : <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>診断結果と照らし合わせています。</p>}
        </div>
      )}
      {!diagnosis && (
        <div style={{ padding: '20px', borderRadius: '16px', border: '1.5px solid #e5e7eb', background: '#f9fafb' }}>
          <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 12px', fontWeight: '700' }}>診断するとこのサービスとの相性がわかります</p>
          <a href="/pages/diagnosis.html" style={{ padding: '10px 20px', background: '#111', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '700', display: 'inline-block' }}>無料で診断する（5〜8分）</a>
        </div>
      )}

      {/* カテゴリ・エリア */}
      {(subCats.length > 0 || provider.area) && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 12px' }}>対応カテゴリ・エリア</h2>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 12px', background: '#111', color: '#fff', borderRadius: '99px' }}>{catLabel}</span>
            {subCats.map(c => <span key={c} style={{ fontSize: '12px', padding: '4px 12px', background: '#f3f4f6', color: '#374151', borderRadius: '99px' }}>{c}</span>)}
            {provider.area && <span style={{ fontSize: '12px', padding: '4px 12px', background: '#f0fdf4', color: '#15803d', borderRadius: '99px' }}>📍 {provider.area}</span>}
          </div>
        </div>
      )}

      {/* こんな人に向いています */}
      {(provider.suitable_triggers?.length > 0 || provider.target_desc) && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 12px' }}>こんな人に向いています</h2>
          {provider.target_desc && <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 12px' }}>{provider.target_desc}</p>}
          {provider.suitable_triggers?.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {provider.suitable_triggers.map(t => <li key={t} style={{ fontSize: '14px', color: '#374151' }}>{TRIGGER_LABELS[t] || t}</li>)}
            </ul>
          )}
          {provider.handles_failure_patterns?.length > 0 && (
            <div style={{ marginTop: '12px', padding: '12px 14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#059669', margin: '0 0 6px' }}>こんな経験がある方に特に強みがあります</p>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {provider.handles_failure_patterns.map(f => <li key={f} style={{ fontSize: '13px', color: '#374151' }}>{FAILURE_LABELS[f] || f}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 哲学・スタイル */}
      {(provider.philosophy || provider.provider_style) && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 12px' }}>このサービスが大切にしていること</h2>
          {provider.philosophy && <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.8', margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{provider.philosophy}</p>}
          {provider.provider_style && (
            <div style={{ padding: '12px 14px', background: '#f8faff', borderRadius: '10px', border: '1px solid #e0e7ff' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#6366f1', margin: '0 0 4px' }}>スタイル</p>
              <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>{STYLE_LABELS[provider.provider_style] || provider.provider_style}</p>
            </div>
          )}
        </div>
      )}

      {/* 説明文 */}
      {provider.description && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 12px' }}>サービス紹介</h2>
          <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.description}</p>
        </div>
      )}
    </div>
  );
}

/* ── メニュータブ ── */
function MenuTab({ services, onReserve }) {
  if (services === null) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>読み込み中…</div>;
  }
  if (services.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', background: '#f9fafb', borderRadius: '16px', border: '1px dashed #d1d5db' }}>
        <p style={{ fontSize: '15px', margin: 0 }}>メニューはまだ登録されていません</p>
      </div>
    );
  }

  const featured = services.filter(s => s.is_featured);
  const others = services.filter(s => !s.is_featured);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {featured.length > 0 && (
        <>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#d97706', margin: '0 0 4px', letterSpacing: '.05em' }}>⭐ 看板メニュー</p>
          {featured.map(s => <ServiceCard key={s.id} service={s} onReserve={onReserve} featured />)}
        </>
      )}
      {others.length > 0 && (
        <>
          {featured.length > 0 && <p style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', margin: '8px 0 4px', letterSpacing: '.05em' }}>その他のメニュー</p>}
          {others.map(s => <ServiceCard key={s.id} service={s} onReserve={onReserve} />)}
        </>
      )}
    </div>
  );
}

function ServiceCard({ service, onReserve, featured }) {
  return (
    <div style={{
      background: '#fff', border: featured ? '1.5px solid #fcd34d' : '1.5px solid #e5e7eb',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      {service.image_url && (
        <img src={service.image_url} alt={service.name} style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#111' }}>{service.name}</h3>
            {featured && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', background: '#fef3c7', color: '#d97706', borderRadius: '99px', flexShrink: 0 }}>看板</span>}
          </div>
          {service.duration && <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 6px' }}>⏱ {service.duration}</p>}
          {service.description && <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: '1.6' }}>{service.description}</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#111' }}>¥{service.price.toLocaleString()}</span>
          <button
            onClick={() => onReserve(service)}
            style={{ padding: '8px 18px', background: '#111', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            このメニューで予約
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 予約タブ ── */
function ReservationTab({ provider, services, selectedService, onServiceSelect, submitted, setSubmitted }) {
  const today = new Date().toISOString().split('T')[0];
  const [formState, setFormState] = useState({ name: '', contact: '', date: '', time: '', date2: '', time2: '', date3: '', time3: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [userPrefilled, setUserPrefilled] = useState(false);

  // ログイン中ユーザーの情報を自動入力
  useEffect(() => {
    supabaseAnon.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const u = session.user;
      const name = u.user_metadata?.display_name || u.user_metadata?.full_name || '';
      const contact = u.email || '';
      setFormState(prev => ({
        ...prev,
        name: prev.name || name,
        contact: prev.contact || contact,
      }));
      if (name || contact) setUserPrefilled(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (submitted) {
      setFormState({ name: '', contact: '', date: '', time: '', message: '' });
    }
  }, [submitted]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formState.name || !formState.contact || !formState.date || !formState.time) {
      setFormError('すべての必須項目を入力してください');
      return;
    }
    setSubmitting(true); setFormError('');
    try {
      const noteParts = [
        selectedService ? `【メニュー】${selectedService.name}（¥${selectedService.price.toLocaleString()}）` : '',
        formState.date2 ? `【第2希望】${formState.date2} ${formState.time2}` : '',
        formState.date3 ? `【第3希望】${formState.date3} ${formState.time3}` : '',
        formState.message,
      ].filter(Boolean);
      const body = {
        provider_id: provider.id,
        user_name: formState.name,
        user_contact: formState.contact,
        preferred_date: formState.date,
        preferred_time: formState.time,
        message: noteParts.join('\n'),
      };
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { setSubmitted(true); }
      else { const err = await res.json(); setFormError(err.error || '送信に失敗しました'); }
    } catch { setFormError('通信エラーが発生しました'); }
    finally { setSubmitting(false); }
  }

  if (submitted) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#15803d', margin: '0 0 8px' }}>リクエストを送信しました</h2>
        <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 24px', lineHeight: '1.7' }}>
          掲載者からの返答をお待ちください。<br />連絡先にご連絡が届きます。
        </p>
        <button
          onClick={() => setSubmitted(false)}
          style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
        >
          別のリクエストを送る
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px' }}>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px', lineHeight: '1.7' }}>
        希望日時とご連絡先を送ると、掲載者から返答が届きます。
      </p>
      {userPrefilled && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: '#15803d' }}>
          ✓ ログイン中のアカウント情報を自動入力しました
        </div>
      )}

      {/* メニュー選択 */}
      {services && services.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '8px' }}>
            希望のメニュー（任意）
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${!selectedService ? '#111' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer', background: !selectedService ? '#f9fafb' : '#fff' }}>
              <input type="radio" name="menu" checked={!selectedService} onChange={() => onServiceSelect(null)} style={{ accentColor: '#111' }} />
              <span style={{ fontSize: '13px', color: '#374151' }}>メニューを指定しない（相談したい）</span>
            </label>
            {services.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${selectedService?.id === s.id ? '#111' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer', background: selectedService?.id === s.id ? '#f9fafb' : '#fff' }}>
                <input type="radio" name="menu" checked={selectedService?.id === s.id} onChange={() => onServiceSelect(s)} style={{ accentColor: '#111' }} />
                <span style={{ flex: 1, fontSize: '13px', color: '#374151' }}>{s.name}{s.duration ? ` (${s.duration})` : ''}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#111', flexShrink: 0 }}>¥{s.price.toLocaleString()}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>お名前 *</label>
          <input
            value={formState.name}
            onChange={e => setFormState(p => ({ ...p, name: e.target.value }))}
            placeholder="山田 太郎"
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
            required
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>連絡先（メール or 電話番号）*</label>
          <input
            value={formState.contact}
            onChange={e => setFormState(p => ({ ...p, contact: e.target.value }))}
            placeholder="example@email.com または 090-xxxx-xxxx"
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
            required
          />
        </div>
        {/* 第1希望 */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>希望日時（第1希望）*</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date} min={today} onChange={e => setFormState(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #111', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} required />
            <select value={formState.time} onChange={e => setFormState(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #111', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} required>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {/* 第2希望 */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>希望日時（第2希望）<span style={{ fontWeight: '400', color: '#9ca3af' }}>任意</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date2} min={today} onChange={e => setFormState(p => ({ ...p, date2: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
            <select value={formState.time2} onChange={e => setFormState(p => ({ ...p, time2: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {/* 第3希望 */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>希望日時（第3希望）<span style={{ fontWeight: '400', color: '#9ca3af' }}>任意</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date3} min={today} onChange={e => setFormState(p => ({ ...p, date3: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
            <select value={formState.time3} onChange={e => setFormState(p => ({ ...p, time3: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>一言メッセージ（任意）</label>
          <textarea
            value={formState.message}
            onChange={e => setFormState(p => ({ ...p, message: e.target.value }))}
            placeholder="悩みや希望があれば教えてください"
            rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>
        {formError && <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>{formError}</p>}
        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '14px', background: submitting ? '#9ca3af' : '#111', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}
        >
          {submitting ? '送信中…' : 'リクエストを送る'}
        </button>
      </form>
    </div>
  );
}

/* ── メインページ ── */
function ProviderPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug;

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState(null);
  const [matchScore, setMatchScore] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [selectedService, setSelectedService] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [stories, setStories] = useState([]);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetch(`/api/providers/${slug}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/providers/${slug}/services`).then(r => r.ok ? r.json() : []),
    ]).then(([prov, svcs]) => {
      setProvider(prov);
      setServices(Array.isArray(svcs) ? svcs : []);
      setLoading(false);
    }).catch(() => setLoading(false));

    // localStorage から診断データ取得。なければSupabaseから取得（他デバイス対応）
    (async () => {
      try {
        const raw = localStorage.getItem('fineme:diagnosis:latest');
        if (raw) {
          const d = JSON.parse(raw);
          if (d.version) { setDiagnosis(d); return; }
        }
      } catch {}
      // localStorageになければSupabaseから取得
      try {
        const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (!sbKey) return;
        const sbObj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        const token = sbObj?.access_token;
        if (!token) return;
        const res = await fetch('/api/me/diagnosis', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          if (d?.version) {
            // 取得できたらlocalStorageにも復元
            try { localStorage.setItem('fineme:diagnosis:latest', JSON.stringify(d)); } catch {}
            setDiagnosis(d);
          }
        }
      } catch {}
    })();
  }, [slug]);

  useEffect(() => {
    if (provider && diagnosis) setMatchScore(calcMatch(provider, diagnosis));
  }, [provider, diagnosis]);

  useEffect(() => {
    if (!provider?.id) return;
    fetch(`/api/stories?providerId=${provider.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setStories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [provider?.id]);

  // メニューから予約へ（サービスを選択した状態で予約タブへ）
  const handleReserveFromMenu = useCallback((service) => {
    setSelectedService(service);
    setActiveTab('reservation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#9ca3af' }}>読み込み中…</p>
    </div>
  );
  if (!provider) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <p style={{ color: '#374151', fontWeight: '700' }}>掲載者が見つかりませんでした。</p>
      <a href="/search" style={{ padding: '10px 20px', background: '#111', color: '#fff', borderRadius: '10px', textDecoration: 'none' }}>サービスを探す</a>
    </div>
  );

  const catLabel = CATEGORY_LABELS[provider.main_category] || provider.main_category;

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 20px 80px' }}>

      {/* ヒーロー */}
      <div style={{
        position: 'relative', borderRadius: '18px', overflow: 'hidden',
        marginBottom: '28px', minHeight: '320px',
        background: provider.photo_url
          ? `url(${provider.photo_url}) center/cover no-repeat`
          : 'linear-gradient(135deg, #111 0%, #374151 100%)',
      }}>
        {/* グラデーションオーバーレイ */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.72) 100%)' }} />
        {/* テキスト */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '320px', padding: '28px 28px 32px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 12px', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '99px', backdropFilter: 'blur(4px)' }}>{catLabel}</span>
            {provider.area && <span style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '99px' }}>📍 {provider.area}</span>}
          </div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: '800', margin: '0 0 8px', lineHeight: '1.3', color: '#fff' }}>{provider.name}</h1>
          {provider.catchphrase && <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.88)', margin: '0 0 20px', lineHeight: '1.6', fontWeight: '600' }}>{provider.catchphrase}</p>}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {provider.price_from && (
              <span style={{ padding: '10px 18px', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '12px', fontSize: '15px', fontWeight: '700', color: '#fff', backdropFilter: 'blur(4px)', background: 'rgba(255,255,255,0.1)' }}>
                ¥{provider.price_from.toLocaleString()}〜
              </span>
            )}
            <button onClick={() => setActiveTab('reservation')} style={{ padding: '12px 24px', background: '#fff', color: '#111', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
              予約・相談リクエストを送る
            </button>
            {services && services.length > 0 && (
              <button onClick={() => setActiveTab('menu')} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                メニューを見る
              </button>
            )}
          </div>
        </div>
      </div>

      {/* タブ */}
      <TabBar activeTab={activeTab} onSelect={tab => { setActiveTab(tab); if (tab !== 'reservation') setSelectedService(null); }} />

      {/* タブコンテンツ */}
      {activeTab === 'overview' && (
        <OverviewTab provider={provider} diagnosis={diagnosis} matchScore={matchScore} />
      )}
      {activeTab === 'menu' && (
        <MenuTab services={services} onReserve={handleReserveFromMenu} />
      )}
      {activeTab === 'reservation' && (
        <ReservationTab
          provider={provider}
          services={services}
          selectedService={selectedService}
          onServiceSelect={setSelectedService}
          submitted={submitted}
          setSubmitted={setSubmitted}
        />
      )}

      {/* 体験談 */}
      {activeTab === 'overview' && (
        <div style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 14px' }}>体験談</h2>
          {stories.length === 0 ? (
            <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>まだ体験談はありません。</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {stories.map(s => (
                <div key={s.id} style={{ padding: '18px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px', fontWeight: '700' }}>Q. 外見を変える前の悩み</p>
                  <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 12px', lineHeight: '1.7' }}>{s.concern_before}</p>
                  <p style={{ fontSize: '12px', color: '#059669', margin: '0 0 8px', fontWeight: '700' }}>→ どんな変化があったか</p>
                  <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 12px', lineHeight: '1.7' }}>{s.change_after}</p>
                  {s.tags && s.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {s.tags.map(t => <span key={t} style={{ fontSize: '11px', padding: '3px 10px', background: '#f3f4f6', color: '#374151', borderRadius: '99px' }}>#{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProviderPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>読み込み中…</div>}>
      <ProviderPageContent />
    </Suspense>
  );
}
