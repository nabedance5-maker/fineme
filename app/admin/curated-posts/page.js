'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const PLATFORMS = ['instagram', 'tiktok'];
const PLATFORM_LABELS = { instagram: 'Instagram', tiktok: 'TikTok' };
const AXES = ['skin', 'eyebrow', 'hair', 'body', 'teeth', 'nail', 'fashion', 'hairremoval'];
const AXIS_LABELS = { skin: '肌', eyebrow: '眉', hair: '髪', body: '体型', teeth: '歯', nail: '爪', fashion: '服', hairremoval: '脱毛' };

const EMPTY_FORM = {
  platform: 'instagram', post_url: '', thumbnail_url: '', creator_handle: '',
  axis: 'skin', topic_tags: '', target_concerns: '', caption: '',
};

function getAdminKey() {
  let key = sessionStorage.getItem('fineme:admin:key') || '';
  if (!key) {
    key = prompt('管理APIキーを入力してください：') || '';
    if (key) sessionStorage.setItem('fineme:admin:key', key);
  }
  return key;
}

export default function AdminCuratedPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [msg, setMsg] = useState('');

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch('/api/curated-posts?admin=1', { headers: { 'x-admin-key': getAdminKey() } });
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch { setPosts([]); }
    setLoading(false);
  }

  useEffect(() => { fetchPosts(); }, []);

  function startEdit(p) {
    setEditId(p.id);
    setForm({
      platform: p.platform, post_url: p.post_url, thumbnail_url: p.thumbnail_url || '',
      creator_handle: p.creator_handle || '', axis: p.axis || 'skin',
      topic_tags: (p.topic_tags || []).join('、'), target_concerns: (p.target_concerns || []).join('、'),
      caption: p.caption || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY_FORM); }

  async function analyzePost() {
    if (!form.post_url.trim()) { setMsg('投稿URLを入力してください'); return; }
    setAnalyzing(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/curated-posts/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify({ post_url: form.post_url.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg(`自動入力エラー: ${d.error || ''}`); setAnalyzing(false); return; }
      setForm(f => ({
        ...f,
        platform: d.platform || f.platform,
        thumbnail_url: d.thumbnail_url || f.thumbnail_url,
        creator_handle: d.creator_handle || f.creator_handle,
        axis: d.axis || f.axis,
        topic_tags: d.topic_tags?.length ? d.topic_tags.join('、') : f.topic_tags,
        target_concerns: d.target_concerns?.length ? d.target_concerns.join('、') : f.target_concerns,
        caption: d.caption || f.caption,
      }));
      setMsg(d.warning || '自動入力完了。内容を確認してください');
    } catch (e) { setMsg(`自動入力エラー: ${e.message}`); }
    setAnalyzing(false);
  }

  async function save() {
    if (!form.post_url.trim() || !form.caption.trim()) { setMsg('投稿URLとキャプションは必須です'); return; }
    setSaving(true);
    const payload = {
      platform: form.platform, post_url: form.post_url.trim(), thumbnail_url: form.thumbnail_url.trim() || null,
      creator_handle: form.creator_handle.trim() || null, axis: form.axis,
      topic_tags: form.topic_tags.split(/[、,]/).map(s => s.trim()).filter(Boolean),
      target_concerns: form.target_concerns.split(/[、,]/).map(s => s.trim()).filter(Boolean),
      caption: form.caption.trim(),
    };
    const method = editId ? 'PATCH' : 'POST';
    const endpoint = editId ? `/api/curated-posts?id=${editId}` : '/api/curated-posts';
    const res = await fetch(endpoint, {
      method, headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMsg(editId ? '更新しました' : '候補として追加しました（pending）');
      cancelEdit();
      fetchPosts();
    } else { setMsg('エラーが発生しました'); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  }

  async function setStatus(p, status) {
    await fetch(`/api/curated-posts?id=${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
      body: JSON.stringify({ status }),
    });
    fetchPosts();
  }

  async function togglePermission(p) {
    await fetch(`/api/curated-posts?id=${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
      body: JSON.stringify({ permission_confirmed: !p.permission_confirmed }),
    });
    fetchPosts();
  }

  async function toggleActive(p) {
    await fetch(`/api/curated-posts?id=${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    fetchPosts();
  }

  async function deletePost(p) {
    if (!confirm(`このキュレーション候補を削除しますか？\n${p.caption}`)) return;
    await fetch(`/api/curated-posts?id=${p.id}`, { method: 'DELETE', headers: { 'x-admin-key': getAdminKey() } });
    fetchPosts();
  }

  const filtered = filterStatus === 'all' ? posts : posts.filter(p => p.status === filterStatus);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 80px', fontFamily: 'sans-serif', color: '#e8e4dc' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
        <h1 style={{ margin: '8px 0 4px', fontSize: 22, fontWeight: 800 }}>投稿キュレーション管理</h1>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
          New Me Map・Mirror結果面に紐づけるInstagram/TikTok投稿プール。
          「承認」＝プレーンリンクとして公開可、「許諾取れた」＝サムネ付き表示へ格上げ（許諾は別途投稿者から取得すること）
        </p>
      </div>

      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px', marginBottom: 32 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>{editId ? '候補を編集' : '候補を追加'}</h2>
        <label style={{ ...labelStyle, display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
          投稿URL
          <input value={form.post_url} onChange={e => setForm(f => ({ ...f, post_url: e.target.value }))} style={{ ...inputStyle, width: '100%' }} placeholder="https://www.instagram.com/p/... または https://www.tiktok.com/@.../video/..." />
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <button onClick={analyzePost} disabled={analyzing} style={{ ...btnPrimary, background: '#4f46e5' }}>{analyzing ? '取得中…' : '🔗 URLから自動入力'}</button>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>サムネ・投稿者・軸・トピック・対象・キャプションを自動推定します</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
          <label style={labelStyle}>
            プラットフォーム
            <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} style={selectStyle}>
              {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            軸
            <select value={form.axis} onChange={e => setForm(f => ({ ...f, axis: e.target.value }))} style={selectStyle}>
              {AXES.map(a => <option key={a} value={a}>{AXIS_LABELS[a]}（{a}）</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            投稿者ハンドル
            <input value={form.creator_handle} onChange={e => setForm(f => ({ ...f, creator_handle: e.target.value }))} style={inputStyle} placeholder="@example" />
          </label>
        </div>
        <label style={{ ...labelStyle, display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          サムネイル画像URL（自動入力されます。許諾が取れるまではサムネ自体は表示されません）
          <input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} style={{ ...inputStyle, width: '100%' }} placeholder="自動入力、または手入力" />
        </label>
        <label style={{ ...labelStyle, display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          キャプション（AIへの文脈提供用の要約。表示にも使う）
          <input value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} style={{ ...inputStyle, width: '100%' }} placeholder="例: 皮脂が多い10代向け、朝晩2回の洗顔の仕方を解説" />
        </label>
        <label style={{ ...labelStyle, display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          サブトピック（読点区切り。ステップ本文とのマッチング精度に直結）
          <input value={form.topic_tags} onChange={e => setForm(f => ({ ...f, topic_tags: e.target.value }))} style={{ ...inputStyle, width: '100%' }} placeholder="例: 洗顔、皮脂対策" />
        </label>
        <label style={{ ...labelStyle, display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
          対象の悩み・属性（読点区切り。肌タイプ・肌悩み等）
          <input value={form.target_concerns} onChange={e => setForm(f => ({ ...f, target_concerns: e.target.value }))} style={{ ...inputStyle, width: '100%' }} placeholder="例: 脂性肌（オイリー）、毛穴" />
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? '保存中…' : editId ? '更新する' : '候補として追加する'}</button>
          {editId && <button onClick={cancelEdit} style={btnSecondary}>キャンセル</button>}
          {msg && <span style={{ fontSize: 13, color: '#059669' }}>{msg}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={filterStatus === s ? btnFilterActive : btnFilter}>
            {s === 'pending' ? '未承認' : s === 'approved' ? '承認済み' : s === 'rejected' ? '却下' : 'すべて'}
            {' '}({s === 'all' ? posts.length : posts.filter(p => p.status === s).length})
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#9ca3af' }}>読み込み中…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>該当する候補がありません。</p>}
          {filtered.map(p => (
            <div key={p.id} style={{
              background: p.status === 'approved' ? '#f0fdf4' : p.status === 'rejected' ? '#fef2f2' : '#fff',
              border: `1px solid ${p.status === 'approved' ? '#86efac' : p.status === 'rejected' ? '#fecaca' : '#e5e7eb'}`,
              borderRadius: 10, padding: '14px 16px', opacity: p.is_active ? 1 : 0.5,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#e0e7ff', color: '#4f46e5', borderRadius: 4, padding: '2px 6px' }}>{PLATFORM_LABELS[p.platform]}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '2px 6px' }}>{AXIS_LABELS[p.axis] || p.axis}</span>
                    {p.creator_handle && <span style={{ fontSize: 11, color: '#9ca3af' }}>{p.creator_handle}</span>}
                    <a href={p.post_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2563eb' }}>投稿を見る →</a>
                  </div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: '0 0 6px' }}>{p.caption}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                    トピック: {(p.topic_tags || []).join('、') || '-'} ／ 対象: {(p.target_concerns || []).join('、') || '-'}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setStatus(p, 'approved')} disabled={p.status === 'approved'} style={{ ...btnSmall, background: p.status === 'approved' ? '#dcfce7' : '#fff', color: '#15803d', borderColor: '#86efac' }}>承認</button>
                    <button onClick={() => setStatus(p, 'rejected')} disabled={p.status === 'rejected'} style={{ ...btnSmall, background: p.status === 'rejected' ? '#fee2e2' : '#fff', color: '#b91c1c', borderColor: '#fca5a5' }}>却下</button>
                  </div>
                  <button onClick={() => togglePermission(p)} style={{ ...btnSmall, background: p.permission_confirmed ? '#fef9c3' : '#fff', color: '#a16207', borderColor: '#fde68a', width: '100%' }}>
                    {p.permission_confirmed ? '✓ 許諾取得済み' : '許諾取れた →'}
                  </button>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => toggleActive(p)} style={{ ...btnSmall, fontSize: 10 }}>{p.is_active ? '無効化' : '有効化'}</button>
                    <button onClick={() => startEdit(p)} style={{ ...btnSmall, fontSize: 10 }}>編集</button>
                    <button onClick={() => deletePost(p)} style={{ ...btnSmall, fontSize: 10, color: '#b91c1c' }}>削除</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', flexDirection: 'column', gap: 4 };
const inputStyle = { padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };
const selectStyle = { ...inputStyle };
const btnPrimary = { padding: '8px 18px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const btnSecondary = { padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnFilter = { padding: '5px 12px', borderRadius: 99, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 12, cursor: 'pointer' };
const btnFilterActive = { ...btnFilter, background: '#111827', color: '#fff', borderColor: '#111827' };
const btnSmall = { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer' };
