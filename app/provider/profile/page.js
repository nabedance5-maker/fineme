'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { JAPAN_CITIES } from '@/app/_data/japan-cities';

const supabase = typeof window !== 'undefined'
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

const PREFECTURES = Object.keys(JAPAN_CITIES);
const PAYMENT_OPTIONS = ['現金', 'クレジットカード', '電子マネー', 'QRコード決済', '銀行振込'];

export default function ProviderProfilePage() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const photoRef = useRef(null);

  const [form, setForm] = useState({
    name: '', catchphrase: '', description: '', target_desc: '', philosophy: '',
    guide_message: '',
    prefecture: '', city: '', address: '',
    price_from: '', nearest_station: '',
    payment_methods: [],
    online_available: false, trial_available: false, trial_desc: '',
    published: false,
    photo_url: '',
    ideal_client_desc: '', client_before_state: '', transformation_pattern: '',
  });
  const [photoPreview, setPhotoPreview] = useState('');

  const cities = form.prefecture ? (JAPAN_CITIES[form.prefecture] || []).map(c => c.name) : [];

  // 認証 + データ取得
  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('ログインが必要です'); setLoading(false); return; }
      setToken(session.access_token);

      const res = await fetch('/api/provider/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError('掲載者情報の取得に失敗しました'); setLoading(false); return; }
      const me = await res.json();

      setForm({
        name:                 me.name || '',
        catchphrase:          me.catchphrase || '',
        description:          me.description || '',
        target_desc:          me.target_desc || '',
        philosophy:           me.philosophy || '',
        guide_message:        me.guide_message || '',
        prefecture:           me.prefecture || '',
        city:                 me.city || '',
        address:              me.address || '',
        price_from:           me.price_from != null ? String(me.price_from) : '',
        nearest_station:      me.nearest_station || '',
        payment_methods:      Array.isArray(me.payment_methods) ? me.payment_methods : [],
        online_available:     !!me.online_available,
        trial_available:      !!me.trial_available,
        trial_desc:           me.trial_desc || '',
        published:            !!me.published,
        photo_url:            me.photo_url || '',
        ideal_client_desc:    me.ideal_client_desc || '',
        client_before_state:  me.client_before_state || '',
        transformation_pattern: me.transformation_pattern || '',
      });
      setPhotoPreview(me.photo_url || '');
      setLoading(false);
    })();
  }, []);

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function togglePayment(method) {
    setForm(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(method)
        ? prev.payment_methods.filter(m => m !== method)
        : [...prev.payment_methods, method],
    }));
    setSaved(false);
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await fetch('/api/provider/upload-photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '写真のアップロードに失敗しました');
      }
      const { url } = await res.json();
      setPhotoPreview(url);
      setForm(prev => ({ ...prev, photo_url: url }));
      setSaved(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { alert('店舗・サービス名を入力してください'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        price_from: form.price_from !== '' ? Number(form.price_from) : null,
      };
      const res = await fetch('/api/provider/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存に失敗しました');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="section"><div className="container"><p className="muted">読み込み中...</p></div></main>;
  if (error) return <main className="section"><div className="container" style={{ color: '#ef4444' }}>{error}</div></main>;

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="section-title" style={{ margin: 0 }}>プロフィール設定</h1>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span className="muted">公開する</span>
            <div
              onClick={() => set('published', !form.published)}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
                background: form.published ? '#10b981' : '#334155',
                position: 'relative', transition: 'background .2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '3px', left: form.published ? '23px' : '3px',
                width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left .2s',
              }} />
            </div>
            <span style={{ color: form.published ? '#10b981' : '#64748b', fontWeight: 600 }}>
              {form.published ? '公開中' : '非公開'}
            </span>
          </label>
        </div>

        <form onSubmit={handleSubmit} className="stack" style={{ gap: '24px' }}>

          {/* 写真 */}
          <section className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>プロフィール写真</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {photoPreview
                ? <img src={photoPreview} alt="プロフィール" style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', background: '#1e293b' }} />
                : <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem' }}>写真なし</div>
              }
              <div className="stack" style={{ gap: '8px' }}>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                <button type="button" className="btn btn-ghost" disabled={uploading} onClick={() => photoRef.current?.click()}>
                  {uploading ? 'アップロード中...' : '写真を変更'}
                </button>
                <p className="muted" style={{ fontSize: '0.8rem' }}>JPG・PNG・WebP / 5MB以下</p>
              </div>
            </div>
          </section>

          {/* 基本情報 */}
          <section className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>基本情報</h2>
            <div className="stack" style={{ gap: '14px' }}>
              <label>
                <span style={{ fontWeight: 600 }}>店舗・サービス名 <span style={{ color: '#ef4444' }}>*</span></span>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="例）田中パーソナルトレーニング" required />
              </label>
              <label>
                <span style={{ fontWeight: 600 }}>キャッチフレーズ</span>
                <input type="text" value={form.catchphrase} onChange={e => set('catchphrase', e.target.value)} placeholder="例）3ヶ月で人生を変える外見改造" />
              </label>
              <label>
                <span style={{ fontWeight: 600 }}>サービス紹介</span>
                <textarea rows={5} value={form.description} onChange={e => set('description', e.target.value)} placeholder="どんなサービスか、どんな変化が起きるかを書いてください" />
              </label>
              <label>
                <span style={{ fontWeight: 600 }}>こんな方に来てほしい</span>
                <textarea rows={3} value={form.target_desc} onChange={e => set('target_desc', e.target.value)} placeholder="例）恋活・婚活を始めたい方、第一印象を変えたい方" />
              </label>
              <label>
                <span style={{ fontWeight: 600 }}>私たちの想い・哲学</span>
                <textarea rows={3} value={form.philosophy} onChange={e => set('philosophy', e.target.value)} placeholder="サービスへの想いや大切にしていることを書いてください" />
              </label>
              <label>
                <span style={{ fontWeight: 600 }}>初めての方へのメッセージ</span>
                <textarea rows={3} value={form.guide_message} onChange={e => set('guide_message', e.target.value)} placeholder="予約前に伝えたいこと、初回の流れなど" />
              </label>
            </div>
          </section>

          {/* 所在地 */}
          <section className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>所在地・アクセス</h2>
            <div className="stack" style={{ gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ flex: 1, minWidth: '140px' }}>
                  <span style={{ fontWeight: 600 }}>都道府県</span>
                  <select value={form.prefecture} onChange={e => set('prefecture', e.target.value)} style={{ width: '100%' }}>
                    <option value="">選択してください</option>
                    {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label style={{ flex: 1, minWidth: '140px' }}>
                  <span style={{ fontWeight: 600 }}>市区町村</span>
                  <select value={form.city} onChange={e => set('city', e.target.value)} style={{ width: '100%' }} disabled={!form.prefecture}>
                    <option value="">選択してください</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="その他">その他</option>
                  </select>
                </label>
              </div>
              <label>
                <span style={{ fontWeight: 600 }}>番地以下</span>
                <input type="text" value={form.address} onChange={e => set('address', e.target.value)} placeholder="例）渋谷区神南1-2-3 ○○ビル4F" />
              </label>
              <label>
                <span style={{ fontWeight: 600 }}>最寄り駅・アクセス</span>
                <input type="text" value={form.nearest_station} onChange={e => set('nearest_station', e.target.value)} placeholder="例）渋谷駅から徒歩5分" />
              </label>
            </div>
          </section>

          {/* 料金・設定 */}
          <section className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>料金・設定</h2>
            <div className="stack" style={{ gap: '14px' }}>
              <label>
                <span style={{ fontWeight: 600 }}>最低価格（税込）</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" value={form.price_from} onChange={e => set('price_from', e.target.value)} placeholder="例）5000" min="0" style={{ width: '160px' }} />
                  <span className="muted">円〜</span>
                </div>
              </label>

              <div>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>対応可能な支払い方法</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {PAYMENT_OPTIONS.map(m => (
                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.payment_methods.includes(m)} onChange={() => togglePayment(m)} />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.online_available} onChange={e => set('online_available', e.target.checked)} />
                  <span>オンライン対応可</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.trial_available} onChange={e => set('trial_available', e.target.checked)} />
                  <span>体験・無料相談あり</span>
                </label>
              </div>
              {form.trial_available && (
                <label>
                  <span style={{ fontWeight: 600 }}>体験内容の説明</span>
                  <textarea rows={2} value={form.trial_desc} onChange={e => set('trial_desc', e.target.value)} placeholder="例）60分無料カウンセリング、体験セッション30分" />
                </label>
              )}
            </div>
          </section>

          {/* AIマッチング */}
          <section className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '4px' }}>AIマッチング設定</h2>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
              ここを埋めるほど、あなたに合うユーザーが検索結果で上位に表示されます。
            </p>
            <div className="stack" style={{ gap: '14px' }}>
              <label>
                <span style={{ fontWeight: 600 }}>理想のお客様像</span>
                <textarea rows={3} value={form.ideal_client_desc} onChange={e => set('ideal_client_desc', e.target.value)} placeholder="例）恋愛に積極的になりたいが、自分の外見に自信が持てない20〜30代男性" />
              </label>
              <label>
                <span style={{ fontWeight: 600 }}>来る前のお客様の状態</span>
                <textarea rows={3} value={form.client_before_state} onChange={e => set('client_before_state', e.target.value)} placeholder="例）マッチングアプリでいいねが来ない、初対面で緊張してしまう" />
              </label>
              <label>
                <span style={{ fontWeight: 600 }}>通うことで起きる変化・パターン</span>
                <textarea rows={3} value={form.transformation_pattern} onChange={e => set('transformation_pattern', e.target.value)} placeholder="例）3ヶ月で体脂肪率が10%減り、マッチング率が3倍になった方が多い" />
              </label>
            </div>
          </section>

          {/* 保存ボタン */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn" type="submit" disabled={saving || uploading} style={{ minWidth: '120px' }}>
              {saving ? '保存中...' : '保存する'}
            </button>
            {saved && <span style={{ color: '#10b981', fontWeight: 600 }}>✓ 保存しました</span>}
          </div>
        </form>
      </div>
    </main>
  );
}
