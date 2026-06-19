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

const PLATFORM_CONFIG = {
  tiktok:    { color: '#f72585', bg: 'rgba(247,37,133,0.12)' },
  instagram: { color: '#e1306c', bg: 'rgba(225,48,108,0.12)' },
  youtube:   { color: '#ff4444', bg: 'rgba(255,68,68,0.1)' },
  other:     { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
};

const CANVAS_AXES = [
  { key: 'hook',       label: '① フック設計',         hint: '最初の3秒で何を見せるか？視聴者が止まる理由' },
  { key: 'emotion',    label: '② 感情軸',             hint: '何を感じさせるか（「これ俺だ」の具体的瞬間）' },
  { key: 'diff',       label: '③ 差別化ポイント',     hint: '他の恋愛/外見系ショートドラマと何が違うか' },
  { key: 'rules',      label: '④ シリーズ統一ルール', hint: '必ず守るフォーマットルール（尺・オチ構造など）' },
  { key: 'mirror_cta', label: '⑤ Mirror導線',         hint: '視聴 → フォロー → Mirror購買の流れ' },
];

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

function EpisodeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    episode_no: '', title: '', cast_type: 'solo', status: 'idea',
    publish_date: '', tiktok_url: '', instagram_url: '', youtube_url: '',
    impressions: 0, followers_gained: 0, notes: '', script: '',
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const inp = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, color: '#e8e4dc', padding: '6px 10px', width: '100%', fontSize: 14 };
  const lbl = { color: '#9ca3af', fontSize: 12, marginBottom: 3, display: 'block' };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, episode_no: Number(form.episode_no) || 1 }); }} style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: 20, marginTop: 12 }}>
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
  // ── 既存 state ────────────────────────────────────────────────────────────
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
  const [generatingScript, setGeneratingScript] = useState({});
  const [showPrompt, setShowPrompt] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [editingKpi, setEditingKpi] = useState(false);
  const [kpiForm, setKpiForm] = useState({ tiktok_followers: 0, instagram_followers: 0, youtube_followers: 0 });

  // ── コンセプトキャンバス state ────────────────────────────────────────────
  const [canvas, setCanvas] = useState({});
  const [canvasEdit, setCanvasEdit] = useState(false);
  const [canvasForm, setCanvasForm] = useState({ hook: '', emotion: '', diff: '', rules: '', mirror_cta: '' });
  const [generatingCanvas, setGeneratingCanvas] = useState(false);

  // ── 競合リサーチ state ────────────────────────────────────────────────────
  const [refs, setRefs] = useState([]);
  const [ytQuery, setYtQuery] = useState('ショートドラマ 恋愛');
  const [ytResults, setYtResults] = useState([]);
  const [searchingYT, setSearchingYT] = useState(false);
  const [analyzingVideo, setAnalyzingVideo] = useState({});
  const [videoAnalysis, setVideoAnalysis] = useState({});
  const [patternsResult, setPatternsResult] = useState('');
  const [analyzingPatterns, setAnalyzingPatterns] = useState(false);
  const [showRefForm, setShowRefForm] = useState(false);
  const [newRef, setNewRef] = useState({ platform: 'tiktok', title: '', url: '', user_notes: '' });
  const [savingRef, setSavingRef] = useState({});

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
      const c = json.config?.canvas || {};
      setCanvas(c);
      setCanvasForm({ hook: c.hook || '', emotion: c.emotion || '', diff: c.diff || '', rules: c.rules || '', mirror_cta: c.mirror_cta || '' });
      setRefs(json.refs || []);
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

  // ── エピソード操作 ────────────────────────────────────────────────────────
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

  async function generateScript(ep) {
    setGeneratingScript(s => ({ ...s, [ep.id]: true }));
    setOpenScript(s => ({ ...s, [ep.id]: true }));
    try {
      const res = await fetch('/api/drama/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ episode_id: ep.id, title: ep.title, cast_type: ep.cast_type, notes: ep.notes }),
      });
      const { script } = await res.json();
      if (script) setEpisodes(eps => eps.map(e => e.id === ep.id ? { ...e, script } : e));
    } finally {
      setGeneratingScript(s => ({ ...s, [ep.id]: false }));
    }
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

  // ── コンセプトキャンバス ─────────────────────────────────────────────────
  async function generateCanvas() {
    setGeneratingCanvas(true);
    try {
      const res = await fetch('/api/drama/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ type: 'concept', episodes }),
      });
      const { canvas: draft } = await res.json();
      if (draft && Object.keys(draft).length > 0) {
        setCanvasForm(f => ({ ...f, ...draft }));
        setCanvas(draft);
        setCanvasEdit(true);
      }
    } finally {
      setGeneratingCanvas(false);
    }
  }

  async function saveCanvas(e) {
    e.preventDefault();
    await apiCall('POST', { type: 'config', data: canvasForm });
    setCanvas(canvasForm);
    setCanvasEdit(false);
  }

  // ── 競合リサーチ ─────────────────────────────────────────────────────────
  async function searchYoutube() {
    setSearchingYT(true);
    setYtResults([]);
    try {
      const res = await fetch(`/api/drama/youtube-search?q=${encodeURIComponent(ytQuery)}&maxResults=10`, {
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      setYtResults(Array.isArray(data) ? data : []);
    } catch {}
    setSearchingYT(false);
  }

  async function analyzeVideo(video) {
    setAnalyzingVideo(v => ({ ...v, [video.videoId]: true }));
    try {
      const res = await fetch('/api/drama/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ type: 'video', videoId: video.videoId, title: video.title, description: video.description }),
      });
      const data = await res.json();
      setVideoAnalysis(v => ({ ...v, [video.videoId]: data }));
    } catch {}
    setAnalyzingVideo(v => ({ ...v, [video.videoId]: false }));
  }

  async function saveVideoAsRef(video) {
    const analysis = videoAnalysis[video.videoId];
    setSavingRef(v => ({ ...v, [video.videoId]: true }));
    try {
      const row = await apiCall('POST', { type: 'ref', data: {
        platform: 'youtube',
        title: video.title,
        url: video.url,
        view_count: video.viewCount,
        like_count: video.likeCount,
        claude_analysis: analysis?.analysis || '',
        user_notes: '',
      }});
      setRefs(r => [row, ...r]);
    } finally {
      setSavingRef(v => ({ ...v, [video.videoId]: false }));
    }
  }

  async function deleteRef(ref) {
    if (!confirm(`「${ref.title}」を参照リストから削除しますか？`)) return;
    await apiCall('DELETE', null, `?type=ref&id=${ref.id}`);
    setRefs(r => r.filter(x => x.id !== ref.id));
  }

  async function addManualRef(e) {
    e.preventDefault();
    const row = await apiCall('POST', { type: 'ref', data: { ...newRef, claude_analysis: '' }});
    setRefs(r => [row, ...r]);
    setNewRef({ platform: 'tiktok', title: '', url: '', user_notes: '' });
    setShowRefForm(false);
  }

  async function analyzePatterns() {
    if (refs.length === 0) return;
    setAnalyzingPatterns(true);
    try {
      const res = await fetch('/api/drama/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ type: 'refs', refs }),
      });
      const { patterns } = await res.json();
      setPatternsResult(patterns || '');
    } catch {}
    setAnalyzingPatterns(false);
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
    inp: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, color: '#e8e4dc', padding: '6px 10px', width: '100%', fontSize: 14 },
    lbl: { color: '#9ca3af', fontSize: 12, marginBottom: 3, display: 'block' },
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

        {/* ── コンセプトキャンバス ─────────────────────────────────────────── */}
        <div style={{ ...s.card, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: canvasEdit ? 16 : (Object.values(canvas).some(Boolean) ? 16 : 0) }}>
            <span style={s.cardTitle}>🎯 コンセプトキャンバス</span>
            {editMode && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={generateCanvas}
                  disabled={generatingCanvas}
                  style={{ ...s.smallBtn, color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)', padding: '4px 10px', fontSize: 12, opacity: generatingCanvas ? 0.6 : 1 }}
                >
                  {generatingCanvas ? '⏳ 生成中...' : '✨ AI草案を生成する'}
                </button>
                <button
                  onClick={() => { setCanvasEdit(v => !v); setCanvasForm({ hook: canvas.hook || '', emotion: canvas.emotion || '', diff: canvas.diff || '', rules: canvas.rules || '', mirror_cta: canvas.mirror_cta || '' }); }}
                  style={{ ...s.smallBtn, color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)', padding: '4px 10px', fontSize: 12 }}
                >
                  {canvasEdit ? 'キャンセル' : '編集'}
                </button>
              </div>
            )}
          </div>

          {canvasEdit && editMode ? (
            <form onSubmit={saveCanvas}>
              {CANVAS_AXES.map(ax => (
                <div key={ax.key} style={{ marginBottom: 14 }}>
                  <label style={{ ...s.lbl, fontSize: 13, color: '#c9a84c', fontWeight: 600 }}>{ax.label}</label>
                  <p style={{ fontSize: 11, color: 'rgba(232,228,220,0.35)', margin: '0 0 4px' }}>{ax.hint}</p>
                  <textarea
                    style={{ ...s.inp, minHeight: 60, resize: 'vertical' }}
                    value={canvasForm[ax.key] || ''}
                    onChange={e => setCanvasForm(f => ({ ...f, [ax.key]: e.target.value }))}
                    placeholder={ax.hint}
                  />
                </div>
              ))}
              <button type="submit" style={{ background: '#c9a84c', color: '#0a0f1e', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>保存</button>
            </form>
          ) : Object.values(canvas).some(Boolean) ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {CANVAS_AXES.map(ax => canvas[ax.key] ? (
                <div key={ax.key} style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 11, color: '#c9a84c', fontWeight: 700, margin: '0 0 5px', letterSpacing: '0.03em' }}>{ax.label}</p>
                  <p style={{ fontSize: 13, color: '#e8e4dc', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{canvas[ax.key]}</p>
                </div>
              ) : null)}
            </div>
          ) : (
            <p style={{ color: 'rgba(232,228,220,0.3)', fontSize: 13, margin: 0 }}>
              {editMode
                ? '「✨ AI草案を生成する」でエピソードリストから5軸を自動設計できます。'
                : 'コンセプトはまだ設計されていません。'}
            </p>
          )}
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
                <EpisodeForm initial={ep} onSave={saveEpisode} onCancel={() => setEditingEp(null)} />
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
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <select onChange={e => updateEpStatus(ep, e.target.value)} value={ep.status} style={{ fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)', color: '#e8e4dc', borderRadius: 5, padding: '3px 6px', cursor: 'pointer' }}>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button
                        onClick={() => generateScript(ep)}
                        disabled={generatingScript[ep.id]}
                        style={{ ...s.smallBtn, color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)', opacity: generatingScript[ep.id] ? 0.6 : 1 }}
                      >
                        {generatingScript[ep.id] ? '⏳ 生成中...' : '✨ 台本を自動生成'}
                      </button>
                      <button onClick={() => { setEditingEp(ep); setShowEpForm(false); }} style={{ ...s.smallBtn, color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>編集</button>
                      <button onClick={() => deleteEpisode(ep)} style={{ ...s.smallBtn, color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>削除</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {showEpForm && !editingEp && (
            <EpisodeForm initial={{ episode_no: (episodes.length + 1) }} onSave={saveEpisode} onCancel={() => setShowEpForm(false)} />
          )}

          {editMode && !showEpForm && !editingEp && (
            <button onClick={() => setShowEpForm(true)} style={s.addBtn}>+ エピソード追加</button>
          )}
        </div>

        {/* AIプロンプト（ChatGPT/Gemini用） */}
        <div style={{ ...s.card, marginBottom: 20 }}>
          <button
            onClick={() => setShowPrompt(v => !v)}
            style={{ background: 'transparent', border: 'none', color: 'rgba(232,228,220,0.4)', fontSize: 13, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {showPrompt ? '▲' : '▼'} ChatGPT / Gemini 用プロンプトを見る
          </button>
          {showPrompt && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12, color: 'rgba(232,228,220,0.45)', marginBottom: 10 }}>以下のプロンプトを ChatGPT / Gemini に貼り付けて使えます。「このエピソードのポイント」部分を書き換えてください。</p>
              <pre style={{
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8,
                padding: 16, fontSize: 12, color: '#e8e4dc', whiteSpace: 'pre-wrap', lineHeight: 1.7,
                fontFamily: 'monospace'
              }}>{`あなたはショートドラマの台本作家です。以下の条件で台本を書いてください。

【スタイル】
- コメディーチック。くすっと笑える
- オチあり（笑えるオチ）。ただし主人公の問題は解決しない
- 「これ俺だ」と視聴者が自分に重ね合わせる等身大のリアル
- 「変わろう」メッセージは一切出さない。サービス名・商品名も出さない

【フォーマット】
縦型ショート動画（60〜90秒）の台本。
【シーン1】場所・状況／動き・ト書き／セリフ（表情指定）... の形式で書く。
最後に【オチ】を必ず入れる。

【世界観】
シリーズ「変わる前夜の話。」
外見を起点に自信を再設計する前夜の男たちを描くコメディドラマ。
主人公は変わりたいのに変われない男。

---

タイトル：【ここにタイトルを入れる】
出演：【solo = でお1人の一人芝居 / duo = でお+友人の2人芝居】
このエピソードのポイント：【ここにコメディの核とオチの方向性を書く】`}</pre>
              <button
                onClick={() => navigator.clipboard.writeText(`あなたはショートドラマの台本作家です。以下の条件で台本を書いてください。\n\n【スタイル】\n- コメディーチック。くすっと笑える\n- オチあり（笑えるオチ）。ただし主人公の問題は解決しない\n- 「これ俺だ」と視聴者が自分に重ね合わせる等身大のリアル\n- 「変わろう」メッセージは一切出さない。サービス名・商品名も出さない\n\n【フォーマット】\n縦型ショート動画（60〜90秒）の台本。\n【シーン1】場所・状況／動き・ト書き／セリフ（表情指定）... の形式で書く。\n最後に【オチ】を必ず入れる。\n\n【世界観】\nシリーズ「変わる前夜の話。」\n外見を起点に自信を再設計する前夜の男たちを描くコメディドラマ。\n主人公は変わりたいのに変われない男。`)}
                style={{ marginTop: 10, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}
              >
                📋 プロンプトをコピー
              </button>
            </div>
          )}
        </div>

        {/* ── 競合リサーチボード ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={s.sectionTitle}>🔍 競合リサーチ</span>
            {refs.length > 0 && (
              <button
                onClick={analyzePatterns}
                disabled={analyzingPatterns}
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, opacity: analyzingPatterns ? 0.6 : 1 }}
              >
                {analyzingPatterns ? '⏳ 分析中...' : '📊 全体パターン分析する'}
              </button>
            )}
          </div>

          {/* YouTube 検索（編集モードのみ） */}
          {editMode && (
            <div style={{ ...s.card, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'rgba(232,228,220,0.45)', margin: '0 0 10px' }}>
                YouTube でバズっているショートドラマを再生数順で検索します。気になる動画は「Claudeに分析させる」→「参考に保存する」。
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={ytQuery}
                  onChange={e => setYtQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchYoutube()}
                  placeholder="ショートドラマ 恋愛"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 6, color: '#e8e4dc', padding: '7px 12px', fontSize: 14 }}
                />
                <button
                  onClick={searchYoutube}
                  disabled={searchingYT}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', opacity: searchingYT ? 0.6 : 1 }}
                >
                  {searchingYT ? '検索中...' : '🔎 YouTube検索'}
                </button>
              </div>

              {/* YouTube 検索結果 */}
              {ytResults.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 11, color: 'rgba(232,228,220,0.4)', marginBottom: 10 }}>{ytResults.length}件が見つかりました。「Claudeに分析させる」で台本構造を自動分析できます。</p>
                  {ytResults.map(video => {
                    const analysis = videoAnalysis[video.videoId];
                    const isAnalyzing = !!analyzingVideo[video.videoId];
                    const isSaved = refs.some(r => r.url === video.url);
                    const isSaving = !!savingRef[video.videoId];
                    return (
                      <div key={video.videoId} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          {video.thumbnail && (
                            <img src={video.thumbnail} alt="" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 3px', lineHeight: 1.4, wordBreak: 'break-word' }}>{video.title}</p>
                            <p style={{ fontSize: 11, color: 'rgba(232,228,220,0.4)', margin: '0 0 8px' }}>
                              {video.channelTitle} · 再生 {video.viewCount.toLocaleString()} · 👍 {video.likeCount.toLocaleString()}
                            </p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 12, color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '2px 8px', textDecoration: 'none' }}
                              >
                                ▶ YouTubeで見る
                              </a>
                              {!analysis && !isAnalyzing && (
                                <button
                                  onClick={() => analyzeVideo(video)}
                                  style={{ ...s.smallBtn, color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)', fontSize: 12, padding: '2px 8px' }}
                                >
                                  ✨ Claudeに分析させる
                                </button>
                              )}
                              {isAnalyzing && <span style={{ fontSize: 12, color: 'rgba(232,228,220,0.4)' }}>⏳ 分析中（10〜20秒）...</span>}
                              {analysis && !isSaved && (
                                <button
                                  onClick={() => saveVideoAsRef(video)}
                                  disabled={isSaving}
                                  style={{ ...s.smallBtn, color: '#34d399', border: '1px solid rgba(52,211,153,0.35)', fontSize: 12, padding: '2px 8px', opacity: isSaving ? 0.6 : 1 }}
                                >
                                  {isSaving ? '保存中...' : '✅ 参考に保存する'}
                                </button>
                              )}
                              {isSaved && <span style={{ fontSize: 12, color: 'rgba(52,211,153,0.5)' }}>✅ 保存済み</span>}
                            </div>
                          </div>
                        </div>
                        {analysis && (
                          <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 6 }}>
                            <p style={{ fontSize: 11, color: 'rgba(167,139,250,0.7)', margin: '0 0 6px' }}>
                              Claude分析 — {analysis.transcriptNote}
                            </p>
                            <pre style={{ fontSize: 12, color: '#e8e4dc', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', lineHeight: 1.6 }}>{analysis.analysis}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 保存済みRef一覧 */}
          {refs.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {refs.map(ref => {
                const pc = PLATFORM_CONFIG[ref.platform] || PLATFORM_CONFIG.other;
                return (
                  <div key={ref.id} style={s.epRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: (ref.claude_analysis || ref.user_notes) ? 8 : 0, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: pc.bg, color: pc.color, fontWeight: 700 }}>
                        {(ref.platform || 'other').toUpperCase()}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, wordBreak: 'break-word' }}>{ref.title}</span>
                      {ref.view_count > 0 && (
                        <span style={{ fontSize: 11, color: 'rgba(232,228,220,0.4)', whiteSpace: 'nowrap' }}>再生 {Number(ref.view_count).toLocaleString()}</span>
                      )}
                      {ref.url && (
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#c9a84c', whiteSpace: 'nowrap' }}>▶ 見る</a>
                      )}
                      {editMode && (
                        <button onClick={() => deleteRef(ref)} style={{ ...s.smallBtn, color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', fontSize: 11 }}>削除</button>
                      )}
                    </div>
                    {ref.claude_analysis && (
                      <pre style={{ fontSize: 12, color: 'rgba(232,228,220,0.65)', whiteSpace: 'pre-wrap', margin: '0 0 6px', fontFamily: 'inherit', lineHeight: 1.55, borderLeft: '2px solid rgba(167,139,250,0.35)', paddingLeft: 10 }}>{ref.claude_analysis}</pre>
                    )}
                    {ref.user_notes && (
                      <p style={{ fontSize: 12, color: 'rgba(232,228,220,0.5)', margin: 0, fontStyle: 'italic' }}>でおメモ：{ref.user_notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {refs.length === 0 && !editMode && (
            <p style={{ color: 'rgba(232,228,220,0.3)', fontSize: 13 }}>まだ参考動画がありません。編集モードでYouTube検索を使って参考を集めましょう。</p>
          )}

          {/* 全体パターン分析結果 */}
          {patternsResult && (
            <div style={{ background: 'rgba(52,211,153,0.03)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '16px 18px', marginTop: 14 }}>
              <p style={{ fontSize: 12, color: '#34d399', fontWeight: 700, margin: '0 0 10px' }}>📊 全体パターン分析結果</p>
              <pre style={{ fontSize: 13, color: '#e8e4dc', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', lineHeight: 1.7 }}>{patternsResult}</pre>
            </div>
          )}

          {/* 手動追加（TikTok / Instagram / その他） */}
          {editMode && (
            <div style={{ marginTop: 14 }}>
              <button onClick={() => setShowRefForm(v => !v)} style={s.addBtn}>
                + TikTok / Instagram を手動追加
              </button>
              {showRefForm && (
                <form onSubmit={addManualRef} style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: 16, marginTop: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={s.lbl}>プラットフォーム</label>
                      <select style={s.inp} value={newRef.platform} onChange={e => setNewRef(r => ({ ...r, platform: e.target.value }))}>
                        <option value="tiktok">TikTok</option>
                        <option value="instagram">Instagram</option>
                        <option value="youtube">YouTube</option>
                        <option value="other">その他</option>
                      </select>
                    </div>
                    <div>
                      <label style={s.lbl}>タイトル / 概要</label>
                      <input required style={s.inp} value={newRef.title} onChange={e => setNewRef(r => ({ ...r, title: e.target.value }))} placeholder="動画タイトルや概要" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={s.lbl}>URL（任意）</label>
                    <input style={s.inp} value={newRef.url} onChange={e => setNewRef(r => ({ ...r, url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={s.lbl}>観察メモ（なぜバズったか・フック・オチ等）</label>
                    <textarea style={{ ...s.inp, minHeight: 72, resize: 'vertical' }} value={newRef.user_notes} onChange={e => setNewRef(r => ({ ...r, user_notes: e.target.value }))} placeholder="最初の3秒は〇〇で止める。オチは〜" />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={{ background: '#c9a84c', color: '#0a0f1e', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>保存</button>
                    <button type="button" onClick={() => setShowRefForm(false)} style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #374151', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>キャンセル</button>
                  </div>
                </form>
              )}
            </div>
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
