'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = typeof window !== 'undefined'
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

const EMPTY_FORM = { name: '', role: '', bio: '', experience_years: '', credentials: '', photo_url: '', is_featured: false };

export default function ProviderStaffPage() {
  const [token, setToken] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // 認証
  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('ログインが必要です'); setLoading(false); return; }
      setToken(session.access_token);
    })();
  }, []);

  // スタッフ一覧を取得
  useEffect(() => {
    if (!token) return;
    fetchStaff();
  }, [token]);

  async function fetchStaff() {
    setLoading(true);
    try {
      const res = await fetch('/api/provider/staff', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('スタッフ情報の取得に失敗しました');
      setStaffList(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setPhotoPreview('');
    setModalOpen(true);
  }

  function openEdit(staff) {
    setEditId(staff.id);
    setForm({
      name: staff.name || '',
      role: staff.role || '',
      bio: staff.bio || '',
      experience_years: staff.experience_years != null ? String(staff.experience_years) : '',
      credentials: staff.credentials || '',
      photo_url: staff.photo_url || '',
      is_featured: !!staff.is_featured,
    });
    setPhotoPreview(staff.photo_url || '');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setPhotoPreview('');
  }

  // 写真選択→縮小→アップロード
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Canvas で最大1200px に縮小
      const dataUrl = await resizeImage(file, 1200);
      setPhotoPreview(dataUrl);

      // Blob に変換して Storage にアップロード
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append('photo', blob, file.name);
      const res = await fetch('/api/provider/upload-service-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('画像のアップロードに失敗しました');
      const { url } = await res.json();
      setForm(prev => ({ ...prev, photo_url: url }));
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  }

  function resizeImage(file, maxSize) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { alert('氏名を入力してください'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        role: form.role.trim() || null,
        bio: form.bio.trim() || null,
        experience_years: form.experience_years ? parseInt(form.experience_years, 10) : null,
        credentials: form.credentials.trim() || null,
        photo_url: form.photo_url || null,
        is_featured: form.is_featured,
      };
      const url = editId ? `/api/provider/staff/${editId}` : '/api/provider/staff';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存に失敗しました');
      }
      closeModal();
      await fetchStaff();
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
      const res = await fetch(`/api/provider/staff/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('削除に失敗しました');
      setStaffList(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '960px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="section-title" style={{ margin: 0 }}>スタッフ管理</h1>
          <button className="btn" onClick={openNew}>＋ スタッフを追加</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {loading && <p className="muted">読み込み中...</p>}

        {!loading && staffList.length === 0 && !error && (
          <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
            <p className="muted">スタッフがまだ登録されていません。</p>
          </div>
        )}

        {staffList.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '56px' }}>写真</th>
                  <th>氏名</th>
                  <th>役割</th>
                  <th>自己紹介</th>
                  <th style={{ width: '120px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(st => (
                  <tr key={st.id}>
                    <td>
                      {st.photo_url ? (
                        <img src={st.photo_url} alt={st.name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', background: '#1e293b' }} />
                      ) : (
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '1.2rem' }}>
                          {(st.name || '?')[0]}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{st.name}</strong>
                      {st.is_featured && <span style={{ marginLeft: '6px', fontSize: '0.75rem', background: '#6366f122', color: '#6366f1', padding: '1px 6px', borderRadius: '4px' }}>注目</span>}
                    </td>
                    <td className="muted">{st.role || '—'}</td>
                    <td className="muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {st.bio || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => openEdit(st)}>編集</button>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: '0.8rem', padding: '4px 10px', color: '#ef4444' }}
                          disabled={deleting === st.id}
                          onClick={() => handleDelete(st.id, st.name)}
                        >
                          {deleting === st.id ? '...' : '削除'}
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
          <div
            onClick={closeModal}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)', zIndex: 999 }}
          />
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 }}>
            <div className="card" style={{ width: 'min(100%, 640px)', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>{editId ? 'スタッフを編集' : 'スタッフを追加'}</h2>
                <button className="btn btn-ghost" onClick={closeModal}>×</button>
              </div>

              <form onSubmit={handleSubmit} className="stack" style={{ gap: '14px' }}>
                {/* 写真 */}
                <div className="stack" style={{ gap: '8px' }}>
                  <label style={{ fontWeight: 600 }}>写真</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {photoPreview ? (
                      <img src={photoPreview} alt="プレビュー" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', background: '#1e293b' }} />
                    ) : (
                      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        写真
                      </div>
                    )}
                    <div className="stack" style={{ gap: '6px' }}>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                      <button type="button" className="btn btn-ghost" style={{ fontSize: '0.875rem' }} disabled={uploading} onClick={() => fileRef.current?.click()}>
                        {uploading ? 'アップロード中...' : '写真を選択'}
                      </button>
                      {photoPreview && (
                        <button type="button" className="btn btn-ghost" style={{ fontSize: '0.875rem' }} onClick={() => { setPhotoPreview(''); setForm(p => ({ ...p, photo_url: '' })); }}>
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="muted" style={{ fontSize: '0.8rem' }}>最大1200px / JPG・PNG・WebP対応</p>
                </div>

                {/* 氏名・役割 */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ flex: 1, minWidth: '160px' }}>
                    <span style={{ fontWeight: 600 }}>氏名 <span style={{ color: '#ef4444' }}>*</span></span>
                    <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="例）山田 太郎" required />
                  </label>
                  <label style={{ flex: 1, minWidth: '160px' }}>
                    <span style={{ fontWeight: 600 }}>役割・肩書き</span>
                    <input type="text" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="例）パーソナルトレーナー" />
                  </label>
                </div>

                {/* 経験年・資格 */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ flex: 1, minWidth: '160px' }}>
                    <span style={{ fontWeight: 600 }}>経験開始年</span>
                    <input type="number" value={form.experience_years} onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))} placeholder="例）2018" min="1980" max="2099" />
                  </label>
                  <label style={{ flex: 1, minWidth: '160px' }}>
                    <span style={{ fontWeight: 600 }}>資格・略歴</span>
                    <input type="text" value={form.credentials} onChange={e => setForm(p => ({ ...p, credentials: e.target.value }))} placeholder="例）NSCA-CPT / JATI-ATI" />
                  </label>
                </div>

                {/* 自己紹介 */}
                <label>
                  <span style={{ fontWeight: 600 }}>自己紹介</span>
                  <textarea rows={4} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="得意なこと、想い、経歴など" />
                </label>

                {/* 注目スタッフ */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))} />
                  <span>注目スタッフとして表示する</span>
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
