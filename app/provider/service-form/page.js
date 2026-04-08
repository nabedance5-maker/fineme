'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = typeof window !== 'undefined'
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

const CATEGORIES = [
  { value: 'consulting',   label: '外見トータルサポート' },
  { value: 'gym',          label: 'パーソナルジム' },
  { value: 'makeup',       label: 'メイクアップ' },
  { value: 'hair',         label: 'ヘア' },
  { value: 'diagnosis',    label: 'カラー/骨格診断' },
  { value: 'fashion',      label: 'コーデ提案' },
  { value: 'photo',        label: '写真撮影（アプリ等）' },
  { value: 'marriage',     label: '結婚相談所' },
  { value: 'eyebrow',      label: '眉毛' },
  { value: 'hairremoval',  label: '脱毛' },
  { value: 'esthetic',     label: 'エステ' },
  { value: 'whitening',    label: 'ホワイトニング' },
  { value: 'orthodontics', label: '歯科矯正' },
  { value: 'nail',         label: 'ネイル' },
  { value: 'aga',          label: 'AGA' },
];

const EMPTY_FORM = {
  name: '', description: '', price: '', duration: '',
  category: '', is_featured: false, sort_order: '0',
  transformation_promise: '', target_axis: '',
  before_text: '', after_text: '',
};

export default function ServiceFormPage() {
  const [token, setToken] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [imgUrl, setImgUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('ログインが必要です'); setLoading(false); return; }
      setToken(session.access_token);
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchServices();
  }, [token]);

  async function fetchServices() {
    setLoading(true);
    try {
      const res = await fetch('/api/provider/services', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('サービス情報の取得に失敗しました');
      setServices(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setImgUrl('');
    setModalOpen(true);
  }

  function openEdit(svc) {
    setEditId(svc.id);
    setForm({
      name:                   svc.name || '',
      description:            svc.description || '',
      price:                  svc.price != null ? String(svc.price) : '',
      duration:               svc.duration || '',
      category:               svc.category || '',
      is_featured:            !!svc.is_featured,
      sort_order:             svc.sort_order != null ? String(svc.sort_order) : '0',
      transformation_promise: svc.transformation_promise || '',
      target_axis:            svc.target_axis || '',
      before_text:            svc.before_text || '',
      after_text:             svc.after_text || '',
    });
    setImgUrl(svc.image_url || '');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setImgUrl('');
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await fetch('/api/provider/upload-service-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('画像のアップロードに失敗しました');
      const { url } = await res.json();
      setImgUrl(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { alert('サービス名を入力してください'); return; }
    if (!form.price || isNaN(Number(form.price))) { alert('料金を入力してください'); return; }
    setSaving(true);
    try {
      const body = {
        name:                   form.name.trim(),
        description:            form.description.trim() || null,
        price:                  Number(form.price),
        duration:               form.duration.trim() || null,
        category:               form.category || null,
        is_featured:            form.is_featured,
        sort_order:             Number(form.sort_order) || 0,
        image_url:              imgUrl || null,
        transformation_promise: form.transformation_promise.trim() || null,
        target_axis:            form.target_axis.trim() || null,
        before_text:            form.before_text.trim() || null,
        after_text:             form.after_text.trim() || null,
      };
      const url = editId ? `/api/provider/services/${editId}` : '/api/provider/services';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || '保存に失敗しました'); }
      closeModal();
      await fetchServices();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/provider/services/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('削除に失敗しました');
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  }

  const categoryLabel = (v) => CATEGORIES.find(c => c.value === v)?.label || v || '—';

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '960px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="section-title" style={{ margin: 0 }}>サービス管理</h1>
          <button className="btn" onClick={openNew}>＋ サービスを追加</button>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', color: '#ef4444' }}>{error}</div>}
        {loading && <p className="muted">読み込み中...</p>}

        {!loading && services.length === 0 && !error && (
          <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
            <p className="muted">サービスがまだ登録されていません。</p>
          </div>
        )}

        {services.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '64px' }}>画像</th>
                  <th>サービス名</th>
                  <th>カテゴリ</th>
                  <th>料金</th>
                  <th style={{ width: '120px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {services.map(svc => (
                  <tr key={svc.id}>
                    <td>
                      {svc.image_url
                        ? <img src={svc.image_url} alt={svc.name} style={{ width: '56px', height: '42px', objectFit: 'cover', borderRadius: '4px', background: '#1e293b' }} />
                        : <div style={{ width: '56px', height: '42px', borderRadius: '4px', background: '#1e293b' }} />
                      }
                    </td>
                    <td>
                      <strong>{svc.name}</strong>
                      {svc.is_featured && <span style={{ marginLeft: '6px', fontSize: '0.75rem', background: '#6366f122', color: '#6366f1', padding: '1px 6px', borderRadius: '4px' }}>注目</span>}
                      {svc.description && <p className="muted" style={{ fontSize: '0.8rem', margin: '2px 0 0' }}>{svc.description.slice(0, 60)}{svc.description.length > 60 ? '…' : ''}</p>}
                    </td>
                    <td className="muted">{categoryLabel(svc.category)}</td>
                    <td>¥{Number(svc.price).toLocaleString()}{svc.duration && <span className="muted"> / {svc.duration}</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => openEdit(svc)}>編集</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '4px 10px', color: '#ef4444' }} disabled={deleting === svc.id} onClick={() => handleDelete(svc.id, svc.name)}>
                          {deleting === svc.id ? '...' : '削除'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* モーダル */}
      {modalOpen && (
        <>
          <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)', zIndex: 999 }} />
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 }}>
            <div className="card" style={{ width: 'min(100%, 720px)', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>{editId ? 'サービスを編集' : 'サービスを追加'}</h2>
                <button className="btn btn-ghost" onClick={closeModal}>×</button>
              </div>

              <form onSubmit={handleSubmit} className="stack" style={{ gap: '14px' }}>
                {/* 画像 */}
                <div className="stack" style={{ gap: '8px' }}>
                  <span style={{ fontWeight: 600 }}>サービス画像</span>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {imgUrl
                      ? <img src={imgUrl} alt="プレビュー" style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px', background: '#1e293b' }} />
                      : <div style={{ width: '120px', height: '90px', borderRadius: '6px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem' }}>画像なし</div>
                    }
                    <div className="stack" style={{ gap: '6px' }}>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                      <button type="button" className="btn btn-ghost" disabled={uploading} onClick={() => fileRef.current?.click()}>
                        {uploading ? 'アップロード中...' : '画像を選択'}
                      </button>
                      {imgUrl && <button type="button" className="btn btn-ghost" onClick={() => setImgUrl('')}>削除</button>}
                    </div>
                  </div>
                </div>

                {/* 基本情報 */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ flex: 2, minWidth: '200px' }}>
                    <span style={{ fontWeight: 600 }}>サービス名 <span style={{ color: '#ef4444' }}>*</span></span>
                    <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="例）外見変革パーソナルプログラム" required />
                  </label>
                  <label style={{ flex: 1, minWidth: '120px' }}>
                    <span style={{ fontWeight: 600 }}>カテゴリ</span>
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%' }}>
                      <option value="">選択してください</option>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ flex: 1, minWidth: '120px' }}>
                    <span style={{ fontWeight: 600 }}>料金（税込） <span style={{ color: '#ef4444' }}>*</span></span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="例）15000" min="0" required />
                      <span className="muted">円</span>
                    </div>
                  </label>
                  <label style={{ flex: 1, minWidth: '120px' }}>
                    <span style={{ fontWeight: 600 }}>所要時間</span>
                    <input type="text" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="例）60分" />
                  </label>
                  <label style={{ flex: 1, minWidth: '80px' }}>
                    <span style={{ fontWeight: 600 }}>表示順</span>
                    <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} min="0" />
                  </label>
                </div>

                <label>
                  <span style={{ fontWeight: 600 }}>サービス説明</span>
                  <textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="どんなサービスか、流れ、特徴など" />
                </label>

                {/* 変容訴求 */}
                <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '8px', padding: '16px' }} className="stack" style={{ gap: '12px' }}>
                  <span style={{ fontWeight: 600, color: '#6366f1' }}>変容訴求（マッチング強化）</span>
                  <label>
                    <span style={{ fontWeight: 600 }}>このサービスで叶う変化</span>
                    <input type="text" value={form.transformation_promise} onChange={e => setForm(p => ({ ...p, transformation_promise: e.target.value }))} placeholder="例）3ヶ月で印象が劇的に変わる" />
                  </label>
                  <label>
                    <span style={{ fontWeight: 600 }}>ターゲット軸</span>
                    <input type="text" value={form.target_axis} onChange={e => setForm(p => ({ ...p, target_axis: e.target.value }))} placeholder="例）第一印象・清潔感" />
                  </label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ flex: 1, minWidth: '160px' }}>
                      <span style={{ fontWeight: 600 }}>Before（利用前の悩み）</span>
                      <input type="text" value={form.before_text} onChange={e => setForm(p => ({ ...p, before_text: e.target.value }))} placeholder="例）何を着ていいかわからない" />
                    </label>
                    <label style={{ flex: 1, minWidth: '160px' }}>
                      <span style={{ fontWeight: 600 }}>After（利用後の状態）</span>
                      <input type="text" value={form.after_text} onChange={e => setForm(p => ({ ...p, after_text: e.target.value }))} placeholder="例）自分に似合う服がわかった" />
                    </label>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))} />
                  <span>注目サービスとして表示する</span>
                </label>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                  <button className="btn" type="submit" disabled={saving || uploading}>
                    {saving ? '保存中...' : editId ? '更新する' : '追加する'}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={closeModal}>キャンセル</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
