'use client';
import { useState, useEffect } from 'react';

const STATUS_CONFIG = {
  idea:      { label: '🟡 企画中',   color: '#92400e', bg: '#fef3c7' },
  planning:  { label: '🔵 撮影準備', color: '#1e40af', bg: '#dbeafe' },
  shooting:  { label: '🟠 撮影済',   color: '#9a3412', bg: '#ffedd5' },
  editing:   { label: '🟣 編集中',   color: '#5b21b6', bg: '#ede9fe' },
  published: { label: '✅ 投稿済',   color: '#065f46', bg: '#d1fae5' },
};

const CAST_LABEL = { solo: 'でお solo', duo: '2人' };

const CHECKLIST_ITEMS = [
  { id: 'tiktok_account',    label: 'TikTok @fineme.drama 開設' },
  { id: 'youtube_account',   label: 'YouTube @fineme_drama チャンネル作成' },
  { id: 'ig_profile',        label: '@deo_fineme プロフィール bio・リンク設定' },
  { id: 'pin_comment',       label: 'ピンコメ設定テンプレート準備' },
  { id: 'ep1_theme',         label: '第1話テーマ確定' },
  { id: 'ep1_shoot',         label: '撮影実施' },
  { id: 'ep1_edit',          label: '編集・テロップ' },
  { id: 'ep1_post',          label: '3プラットフォーム同時投稿' },
];

const ACCOUNT_INFO = [
  { platform: 'TikTok',    handle: '@fineme.drama' },
  { platform: 'Instagram', handle: '@deo_fineme' },
  { platform: 'YouTube',   handle: '@fineme_drama' },
];

function EpisodeForm({ initial, onSave, onCancel, adminKey }) {
  const [form, setForm] = useState(initial || {
    episode_no: '', title: '', cast_type: 'solo', status: 'idea',
    publish_date: '', tiktok_url: '', instagram_url: '', youtube_url: '',
    impressions: 0, followers_gained: 0, notes: '', script: '',
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    const data = { ...form, episode_no: Number(form.episode_no) || 1 };
    onSave(data);
  }

  const inp = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, color: '#e8e4dc', padding: '6px 10px', width: '100%', fontSize: 14 };
  const lbl = { color: '#9ca3af', fontSize: 12, marginBottom: 3, display: 'block' };

  return (
    <form onSubmit={submit} style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: 20, marginTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div><label style={lbl}># 話数</label><input style={inp} type="number" value={form.episode_no} onChange={e => set('episode_no', e.target.value)} required /></div>
        <div style={{ gridColumn: 'span 2' }}><label style={lbl}>タイトル / テーマ</label><input style={inp} value={form.title} onChange={e => set('title', e.target.value)} required /></div>
        <div>
          <label style={lbl}>出演</label>
          <select style={inp} value={form.cast_type} onChange={e => set('cast_type', e.target.value)}>
            <option value="solo">でお solo</option>
            <option value="duo">2人</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={lbl}>ステータス</label>
          <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div><label style={lbl}>投稿日</label><input style={inp} type="date" value={form.publish_date || ''} onChange={e => set('publish_date', e.target.value)} /></div>
        <div><label style={lbl}>インプレッション</label><input style={inp} type="number" value={form.impressions || 0} onChange={e => set('impressions', Number(e.target.value))} /></div>
        <div><label style={lbl}>フォロワー増</label><input style={inp} type="number" value={form.followers_gained || 0} onChange={e => set('followers_gained', Number(e.target.value))} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div><label style={lbl}>TikTok URL</label><input style={inp} value={form.tiktok_url || ''} onChange={e => set('tiktok_url', e.target.value)} placeholder="https://..." /></div>
        <div><label style={lbl}>Instagram URL</label><input style={inp} value={form.instagram_url || ''} onChange={e => set('instagram_url', e.target.value)} placeholder="https://..." /></div>
        <div><label style={lbl}>YouTube URL</label><input style={inp} value={form.youtube_url || ''} onChange={e => set('youtube_url', e.target.value)} placeholder="https://..." /></div>
      </div>
      <div style={{ marginBottom: 10 }}><label style={lbl}>メモ</label><textarea style={{ ...inp, minHeight: 48 }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>台本（シーン・セリフ・アクション。自由書式）</label>
        <textarea style={{ ...inp, minHeight: 120, fontFamily: 'monospace', fontSize: 13 }} value={form.script || ''} onChange={e => set('script', e.target.value)} placeholder={'【シーン1】\nスマホを見つめる男。画面にはマッチングなし。\n\n（独白）「また...」\n\n【シーン2】\n鏡の前に立つ。じっと自分を見る。'} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={{ background: '#c9a84c', color: '#0a0f1e', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>保存</button>
        <button type="button" onClick={onCancel} style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #374151', borderRadius: 6, padding: '8px 18px', cursor: 'pointer' }}>キャンセル</button>
      </div>
    </form>
  );
}

export default function DramaPage() {
  const [episodes, setEpisodes] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [kpis, setKpis] = useState({ tiktok_followers: 0, instagram_followers: 0, youtube_followers: 0, updated_at: null });
  const [mirrorPaid, setMirrorPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [checklist, setChecklist] = useState({});
  const [showEpForm, setShowEpForm] = useState(false);
  const [editingEp, setEditingEp] = useState(null);
  const [openScript, setOpenScript] = useState({});
  const [newIdea, setNewIdea] = useState('');
  const [editingKpi, setEditingKpi] = useState(false);
  const [kpiForm, setKpiForm] = useState({ tiktok_followers: 0, instagram_followers: 0, youtube_followers: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('drama:checklist');
    if (saved) setChecklist(JSON.parse(saved));
    const key = sessionStorage.getItem('fineme:admin:key') || '';
    setAdminKey(key);
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/drama');
      const json = await res.json();
      setEpisodes(json.episodes || []);
      setIdeas(json.ideas || []);
      setKpis(json.kpis || {});
      setMirrorPaid(json.mirrorPaid || 0);
      setKpiForm({ tiktok_followers: json.kpis?.tiktok_followers || 0, instagram_followers: json.kpis?.instagram_followers || 0, youtube_followers: json.kpis?.youtube_followers || 0 });
    } catch {}
    setLoading(false);
  }

  function toggleEdit() {
    if (editMode) { setEditMode(false); return; }
    let key = adminKey || sessionStorage.getItem('fineme:admin:key') || '';
    if (!key) {
      key = prompt('管理APIキーを入力してください：') || '';
      if (key) { sessionStorage.setItem('fineme:admin:key', key); setAdminKey(key); }
    }
    if (key) setEditMode(true);
  }

  function toggleCheck(id) {
    const next = { ...checklist, [id]: !checklist[id] };
    setChecklist(next);
    localStorage.setItem('drama:checklist', JSON.stringify(next));
  }

  async function apiCall(method, body, queryParams = '') {
    const res = await fetch('/api/drama' + queryParams, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async function saveEpisode(data) {
    if (editingEp) {
      const row = await apiCall('PUT', { type: 'episode', id: editingEp.id, data });
      setEpisodes(eps => eps.map(e => e.id === editingEp.id ? row : e));
    } else {
      const row = await apiCall('POST', { type: 'episode', data });
      setEpisodes(eps => [...eps, row].sort((a, b) => a.episode_no - b.episode_no));
    }
    setShowEpForm(false);
    setEditingEp(null);
  }

  async function deleteEpisode(ep) {
    if (!confirm(`#${ep.episode_no} 「${ep.title}」を削除しますか？`)) return;
    await apiCall('DELETE', null, `?type=episode&id=${ep.id}`);
    setEpisodes(eps => eps.filter(e => e.id !== ep.id));
  }

  async function updateEpStatus(ep, status) {
    const row = await apiCall('PUT', { type: 'episode', id: ep.id, data: { status } });
    setEpisodes(eps => eps.map(e => e.id === ep.id ? row : e));
  }

  async function addIdea(e) {
    e.preventDefault();
    if (!newIdea.trim()) return;
    const row = await apiCall('POST', { type: 'idea', data: { idea: newIdea.trim() } });
    setIdeas(ids => [...ids, row]);
    setNewIdea('');
  }

  async function toggleIdeaStatus(idea) {
    const next = idea.status === 'stock' ? 'used' : 'stock';
    const row = await apiCall('PUT', { type: 'idea', id: idea.id, data: { status: next } });
    setIdeas(ids => ids.map(i => i.id === idea.id ? row : i));
  }

  async function deleteIdea(idea) {
    await apiCall('DELETE', null, `?type=idea&id=${idea.id}`);
    setIdeas(ids => ids.filter(i => i.id !== idea.id));
  }

  async function saveKpi(e) {
    e.preventDefault();
    const row = await apiCall('PUT', { type: 'kpi', data: { tiktok_followers: Number(kpiForm.tiktok_followers), instagram_followers: Number(kpiForm.instagram_followers), youtube_followers: Number(kpiForm.youtube_followers) } });
    setKpis(row);
    setEditingKpi(false);
  }

  const checkedCount = CHECKLIST_ITEMS.filter(i => checklist[i.id]).length;

  const s = {
    page: { minHeight: '100vh', background: '#0a0f1e', color: '#e8e4dc', padding: '24px 20px', fontFamily: 'ui-sans-serif, system-ui, sans-serif' },
    container: { maxWidth: 960, margin: '0 auto' },
    header: { borderBottom: '1px solid rgba(201,168,76,0.25)', paddingBottom: 20, marginBottom: 28 },
    h1: { fontSize: 22, fontWeight: 800, color: '#c9a84c', margin: 0 },
    tagline: { fontSize: 14, color: 'rgba(232,228,220,0.6)', marginTop: 4 },
    accounts: { display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' },
    accountChip: { fontSize: 12, color: '#c9a84c', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 20, padding: '3px 10px' },
    editBtn: { marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: 20 },
    cardTitle: { fontSize: 13, fontWeight: 700, color: '#c9a84c', marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' },
    sectionTitle: { fontSize: 13, fontWeight: 700, color: '#c9a84c', marginBottom: 16, letterSpacing: '0.05em', textTransform: 'uppercase' },
    checkItem: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer', color: '#e8e4dc', fontSize: 14 },
    checkbox: { width: 16, height: 16, cursor: 'pointer', accentColor: '#c9a84c' },
    kpiRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 14 },
    kpiNum: { fontWeight: 700, color: '#c9a84c', fontSize: 18 },
    epRow: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 8, padding: '14px 16px', marginBottom: 10 },
    epHeader: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    ideaRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(232,228,220,0.06)', fontSize: 14 },
    addBtn: { background: 'rgba(201,168,76,0.1)', border: '1px dashed rgba(201,168,76,0.4)', color: '#c9a84c', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, marginTop: 10 },
    smallBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, padding: '2px 6px', borderRadius: 4 },
  };

  if (loading) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#c9a84c' }}>読み込み中...</span></div>;

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={{ ...s.header, display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h1 style={s.h1}>@fineme.drama</h1>
            <p style={s.tagline}>変わる前夜の話。外見を起点に、自信を再設計する前夜のドラマシリーズ</p>
            <div style={s.accounts}>
              {ACCOUNT_INFO.map(a => (
                <span key={a.platform} style={s.accountChip}>{a.platform} {a.handle}</span>
              ))}
              <span style={{ ...s.accountChip, background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }}>CTA → fineme.me/lp/mirror</span>
            </div>
          </div>
          <button onClick={toggleEdit} style={s.editBtn}>
            {editMode ? '✕ 編集終了' : '✎ 編集'}
          </button>
        </div>

        {/* チェックリスト + KPI */}
        <div style={s.grid2}>

          {/* チェックリスト */}
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={s.cardTitle}>🚀 スタートアップ</span>
              <span style={{ fontSize: 12, color: 'rgba(232,228,220,0.5)' }}>{checkedCount}/{CHECKLIST_ITEMS.length}</span>
            </div>
            {CHECKLIST_ITEMS.map(item => (
              <label key={item.id} style={{ ...s.checkItem, textDecoration: checklist[item.id] ? 'line-through' : 'none', opacity: checklist[item.id] ? 0.4 : 1 }}>
                <input type="checkbox" style={s.checkbox} checked={!!checklist[item.id]} onChange={() => toggleCheck(item.id)} />
                {item.label}
              </label>
            ))}
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginTop: 14 }}>
              <div style={{ height: '100%', width: `${checkedCount / CHECKLIST_ITEMS.length * 100}%`, background: '#c9a84c', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* KPI */}
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={s.cardTitle}>📊 KPI</span>
              {editMode && <button onClick={() => setEditingKpi(v => !v)} style={{ ...s.smallBtn, color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>更新</button>}
            </div>

            {editingKpi && editMode ? (
              <form onSubmit={saveKpi}>
                {['tiktok_followers', 'instagram_followers', 'youtube_followers'].map(k => (
                  <div key={k} style={{ marginBottom: 8 }}>
                    <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 3 }}>{k.replace('_followers', '')} フォロワー</label>
                    <input style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, color: '#e8e4dc', padding: '5px 8px', width: '100%', fontSize: 14 }} type="number" value={kpiForm[k]} onChange={e => setKpiForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
                <button type="submit" style={{ background: '#c9a84c', color: '#0a0f1e', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>保存</button>
              </form>
            ) : (
              <>
                {[
                  { label: 'TikTok @fineme.drama', val: kpis.tiktok_followers },
                  { label: 'Instagram @deo_fineme', val: kpis.instagram_followers },
                  { label: 'YouTube @fineme_drama', val: kpis.youtube_followers },
                ].map(row => (
                  <div key={row.label} style={s.kpiRow}>
                    <span style={{ color: 'rgba(232,228,220,0.7)', fontSize: 13 }}>{row.label}</span>
                    <span style={s.kpiNum}>{(row.val || 0).toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(232,228,220,0.5)', marginLeft: 3 }}>人</span></span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: 10, marginTop: 10 }}>
                  <div style={s.kpiRow}>
                    <span style={{ color: 'rgba(232,228,220,0.7)', fontSize: 13 }}>Mirror 購入（累計）</span>
                    <span style={s.kpiNum}>{mirrorPaid}<span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(232,228,220,0.5)', marginLeft: 3 }}>件</span></span>
                  </div>
                </div>
                {kpis.updated_at && <p style={{ fontSize: 11, color: 'rgba(232,228,220,0.3)', marginTop: 10, marginBottom: 0 }}>更新: {new Date(kpis.updated_at).toLocaleDateString('ja-JP')}</p>}
              </>
            )}
          </div>
        </div>

        {/* エピソードボード */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={s.sectionTitle}>🎬 エピソード</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                const count = episodes.filter(e => e.status === k).length;
                if (count === 0 && !editMode) return null;
                return <span key={k} style={{ fontSize: 11, color: v.color, background: v.bg, borderRadius: 12, padding: '2px 8px' }}>{v.label.replace(/^[^\s]+\s/, '')} {count}</span>;
              })}
            </div>
          </div>

          {episodes.length === 0 && !showEpForm && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(232,228,220,0.3)', fontSize: 14 }}>
              まだエピソードがありません{editMode ? '。「+ エピソード追加」で第1話を登録しましょう。' : '。'}
            </div>
          )}

          {episodes.map(ep => (
            <div key={ep.id} style={s.epRow}>
              {editingEp?.id === ep.id ? (
                <EpisodeForm initial={ep} onSave={saveEpisode} onCancel={() => setEditingEp(null)} adminKey={adminKey} />
              ) : (
                <>
                  <div style={s.epHeader}>
                    <span style={{ fontWeight: 700, color: '#c9a84c', fontSize: 14, minWidth: 28 }}>#{ep.episode_no}</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{ep.title}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: STATUS_CONFIG[ep.status]?.bg, color: STATUS_CONFIG[ep.status]?.color }}>{STATUS_CONFIG[ep.status]?.label}</span>
                    <span style={{ fontSize: 11, color: 'rgba(232,228,220,0.5)', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '2px 8px' }}>{CAST_LABEL[ep.cast_type]}</span>
                    {ep.publish_date && <span style={{ fontSize: 11, color: 'rgba(232,228,220,0.4)' }}>{ep.publish_date}</span>}
                  </div>
                  {(ep.impressions > 0 || ep.followers_gained > 0) && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'rgba(232,228,220,0.5)' }}>
                      {ep.impressions > 0 && <span>インプ {ep.impressions.toLocaleString()}</span>}
                      {ep.followers_gained > 0 && <span>フォロワー +{ep.followers_gained}</span>}
                    </div>
                  )}
                  {(ep.tiktok_url || ep.instagram_url || ep.youtube_url) && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      {ep.tiktok_url && <a href={ep.tiktok_url} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#c9a84c' }}>▶ TikTok</a>}
                      {ep.instagram_url && <a href={ep.instagram_url} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#c9a84c' }}>▶ Instagram</a>}
                      {ep.youtube_url && <a href={ep.youtube_url} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#c9a84c' }}>▶ YouTube</a>}
                    </div>
                  )}
                  {ep.notes && <p style={{ fontSize: 12, color: 'rgba(232,228,220,0.45)', marginTop: 6, marginBottom: 0 }}>{ep.notes}</p>}

                  {/* 台本 折りたたみ */}
                  <div style={{ marginTop: 10 }}>
                    <button
                      onClick={() => setOpenScript(s => ({ ...s, [ep.id]: !s[ep.id] }))}
                      style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: openScript[ep.id] ? '#c9a84c' : 'rgba(232,228,220,0.4)', borderRadius: 5, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}
                    >
                      {openScript[ep.id] ? '▲ 台本を閉じる' : '▼ 台本を見る'}
                      {!ep.script && <span style={{ marginLeft: 6, color: 'rgba(232,228,220,0.25)', fontSize: 11 }}>（未作成）</span>}
                    </button>
                    {openScript[ep.id] && (
                      <div style={{ marginTop: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 8, padding: '14px 16px' }}>
                        {ep.script ? (
                          <pre style={{ fontSize: 13, color: '#e8e4dc', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace', lineHeight: 1.7 }}>{ep.script}</pre>
                        ) : (
                          <p style={{ color: 'rgba(232,228,220,0.3)', fontSize: 13, margin: 0 }}>
                            {editMode ? '「編集」ボタンから台本を入力できます。' : '台本はまだ作成されていません。'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {editMode && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <select onChange={e => updateEpStatus(ep, e.target.value)} value={ep.status} style={{ fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)', color: '#e8e4dc', borderRadius: 5, padding: '3px 6px', cursor: 'pointer' }}>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button onClick={() => { setEditingEp(ep); setShowEpForm(false); }} style={{ ...s.smallBtn, color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>編集</button>
                      <button onClick={() => deleteEpisode(ep)} style={{ ...s.smallBtn, color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>削除</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {showEpForm && !editingEp && (
            <EpisodeForm initial={{ episode_no: (episodes.length + 1) }} onSave={saveEpisode} onCancel={() => setShowEpForm(false)} adminKey={adminKey} />
          )}

          {editMode && !showEpForm && !editingEp && (
            <button onClick={() => setShowEpForm(true)} style={s.addBtn}>+ エピソード追加</button>
          )}
        </div>

        {/* アイデアバンク */}
        <div style={{ ...s.card, marginBottom: 40 }}>
          <span style={s.cardTitle}>💡 アイデアバンク — 次の「前夜」</span>
          {ideas.map(idea => (
            <div key={idea.id} style={{ ...s.ideaRow, opacity: idea.status === 'used' ? 0.35 : 1 }}>
              <span style={{ flex: 1, textDecoration: idea.status === 'used' ? 'line-through' : 'none' }}>{idea.idea}</span>
              {editMode && (
                <>
                  <button onClick={() => toggleIdeaStatus(idea)} style={{ ...s.smallBtn, color: idea.status === 'used' ? '#6b7280' : '#34d399', border: `1px solid ${idea.status === 'used' ? 'rgba(107,114,128,0.3)' : 'rgba(52,211,153,0.3)'}` }}>
                    {idea.status === 'used' ? '未使用に戻す' : '使用済みにする'}
                  </button>
                  <button onClick={() => deleteIdea(idea)} style={{ ...s.smallBtn, color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>削除</button>
                </>
              )}
            </div>
          ))}
          {editMode && (
            <form onSubmit={addIdea} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <input
                value={newIdea}
                onChange={e => setNewIdea(e.target.value)}
                placeholder="新しいアイデアを追加..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 6, color: '#e8e4dc', padding: '7px 12px', fontSize: 14 }}
              />
              <button type="submit" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>追加</button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
