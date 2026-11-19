'use client';
// 特集管理（/admin/features）の「店舗向けの記事」タブ：店舗運営ガイド（/shop-guide）・営業パートナーガイド（/sales-partner/guide）の記事を直す・足す・非公開にする。
// 保存時に他社名・言い過ぎの表現・本文の短さを検査し、注意があれば確認してから保存する（lib/biz-guide-check.js）。
import { useEffect, useMemo, useState } from 'react';

function adminKey() {
  let k = sessionStorage.getItem('fineme:admin:key') || '';
  if (!k) { k = prompt('管理APIキーを入力してください：') || ''; if (k) sessionStorage.setItem('fineme:admin:key', k); }
  return k;
}
const h = () => ({ 'Content-Type': 'application/json', 'x-admin-key': adminKey() });
const AUD = { shop: '店舗運営ガイド', partner: '営業パートナーガイド' };
const fmt = (s) => (s ? new Date(s).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' }) : '');

// 画面で触りやすい形（段落は空行区切り・箇条書きは1行1つ）と保存する形の変換
function toForm(g) {
  return {
    ...g,
    sections: (g.sections || []).map((s) => ({ h: s.h || '', p: (s.p || []).join('\n\n'), list: (s.list || []).join('\n'), listFirst: !!s.listFirst, img: s.img || '' })),
    faq: (g.faq || []).map(([q, a]) => ({ q, a })),
    related: (g.related || []).join(', '),
  };
}
function fromForm(f) {
  return {
    slug: f.slug.trim(), audience: f.audience, cover: (f.cover || '').trim(), title: f.title, description: f.description, lead: f.lead, fineme: f.fineme, status: f.status,
    sections: f.sections.map((s) => ({ h: s.h, p: s.p.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean), list: s.list.split('\n').map((x) => x.trim()).filter(Boolean), ...(s.listFirst ? { listFirst: true } : {}), ...(s.img ? { img: s.img } : {}) })),
    faq: f.faq.map((x) => [x.q, x.a]),
    related: f.related.split(/[,、\s]+/).map((x) => x.trim()).filter(Boolean),
  };
}
const EMPTY = { slug: '', audience: 'shop', cover: '', title: '', description: '', lead: '', fineme: '', status: 'published', sections: [{ h: '', p: '', list: '' }], faq: [{ q: '', a: '' }], related: '', isNew: true };

const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 };
const inp = { width: '100%', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
const btn = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 };
const btnMain = { ...btn, border: 'none', background: '#111', color: '#fff', fontWeight: 700 };
// 端末の画像を横1600pxまでに縮めて WebP にする（記事の画像は3MBまで）
function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1600 / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('画像を変換できませんでした'))), 'image/webp', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('画像を読めませんでした')); };
    img.src = src;
  });
}

const lbl = { display: 'grid', gap: 4, fontSize: 12.5, fontWeight: 700, color: '#374151' };

export default function BizGuidesPanel() {
  const [list, setList] = useState([]);
  const [base, setBase] = useState({ shop: '/shop-guide', partner: '/sales-partner/guide' });
  const [aud, setAud] = useState('shop');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState('loading'); // loading | ok | auth | error
  const [role, setRole] = useState('admin'); // admin | image（画像と公開だけを扱うキー・Muse 用）

  async function load() {
    setState((s) => (s === 'ok' ? s : 'loading'));
    try {
      const r = await fetch('/api/admin/biz-guides', { headers: h(), cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { setState('auth'); return; }
      if (!r.ok) { setState('error'); setMsg(`読み込めませんでした（${r.status}${j.error ? `：${j.error}` : ''}）`); return; }
      setList(j.guides || []); if (j.base) setBase(j.base); setRole(j.role === 'image' ? 'image' : 'admin'); setState('ok');
    } catch (e) {
      setState('error'); setMsg(`読み込めませんでした（${e.message}）`);
    }
  }
  function reenterKey() {
    sessionStorage.removeItem('fineme:admin:key');
    adminKey();
    load();
  }
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => list.filter((g) => g.audience === aud && (!q || `${g.title}${g.slug}`.toLowerCase().includes(q.toLowerCase()))), [list, aud, q]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSec = (i, k, v) => setForm((f) => ({ ...f, sections: f.sections.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const setFaq = (i, k, v) => setForm((f) => ({ ...f, faq: f.faq.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const move = (key, i, d) => setForm((f) => { const a = [...f[key]]; const t = i + d; if (t < 0 || t >= a.length) return f; [a[i], a[t]] = [a[t], a[i]]; return { ...f, [key]: a }; });
  const drop = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, j) => j !== i) }));

  async function upload(file) {
    if (!file) return;
    setBusy(true); setMsg('画像を上げています…');
    try {
      const fd = new FormData();
      fd.append('file', await shrink(file), 'cover.webp');
      const r = await fetch('/api/admin/biz-guides/image', { method: 'POST', headers: { 'x-admin-key': adminKey() }, body: fd });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) setMsg('管理APIキーが正しくないため画像を上げられませんでした。');
      else if (!r.ok) setMsg(j.error || '画像を上げられませんでした');
      else { set('cover', j.url); setMsg('画像を入れました。「保存する」で記事に反映されます。'); }
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  async function save(force = false) {
    if (busy) return;
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/biz-guides', { method: 'PUT', headers: h(), body: JSON.stringify({ ...fromForm(form), isNew: !!form.isNew, force }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.status === 422) {
      if (confirm(`次の点が気になります。このまま保存しますか？\n\n・${j.warns.join('\n・')}`)) return save(true);
      setMsg(`保存していません：${j.warns.join(' / ')}`); return;
    }
    if (r.status === 401) { setMsg('管理APIキーが正しくないため保存できませんでした。一覧に戻って「管理APIキーを入れ直す」から入れ直してください。'); return; }
    if (!r.ok) { setMsg(j.error || '保存できませんでした'); return; }
    setMsg(j.imageOnly ? '画像と公開の設定を保存しました。サイトにはすぐ反映されます。' : `保存しました（本文${j.len}字）。サイトにはすぐ反映されます。`);
    setForm((f) => ({ ...f, isNew: false, source: 'db', cover: j.cover ?? f.cover }));
    load();
  }

  if (form) {
    const url = `${base[form.audience]}/${form.slug}`;
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={btn} onClick={() => { setForm(null); setMsg(''); }}>← 一覧に戻る</button>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, flex: 1 }}>{form.isNew ? '記事を足す' : '記事を直す'}</h1>
          {!form.isNew && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>サイトで見る</a>}
        </div>
        {role === 'image' && <p style={{ ...box, margin: 0, fontSize: 13, background: '#eff6ff', borderColor: '#bfdbfe' }}>このキーで変えられるのは「画像」と「公開」だけです。本文やタイトルを直しても保存されません。</p>}
        {form.source === 'static' && <p style={{ ...box, margin: 0, fontSize: 13, background: '#fffbeb', borderColor: '#fde68a' }}>最初に用意した記事です。保存すると、以後はここで直した内容が表示されます。</p>}
        <div style={{ ...box, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <label style={lbl}>対象
              <select style={inp} value={form.audience} disabled={!form.isNew} onChange={(e) => set('audience', e.target.value)}>
                <option value="shop">店舗運営ガイド</option><option value="partner">営業パートナーガイド</option>
              </select>
            </label>
            <label style={lbl}>URL（半角英小文字とハイフン）
              <input style={inp} value={form.slug} disabled={!form.isNew} onChange={(e) => set('slug', e.target.value)} placeholder="nail-salon-repeat" />
            </label>
            <label style={lbl}>公開
              <select style={inp} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="published">公開する</option><option value="draft">非公開にする</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={lbl}>画像（一覧のカード・記事の先頭・SNSで共有した時に出る。空なら業種の写真を自動で使う）</span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {form.cover
                ? <img src={form.cover} alt="" style={{ width: 240, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                : <div style={{ width: 240, aspectRatio: '16/9', borderRadius: 8, border: '1px dashed #d1d5db', display: 'grid', placeItems: 'center', fontSize: 12, color: '#6b7280' }}>未設定（自動の写真）</div>}
              <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 220 }}>
                <label style={{ ...btn, textAlign: 'center' }}>端末から選ぶ<input type="file" accept="image/*" style={{ display: 'none' }} disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} /></label>
                <input style={inp} value={form.cover || ''} onChange={(e) => set('cover', e.target.value)} placeholder="または画像のURL（https://〜）" />
                {form.cover && <button style={btn} onClick={() => set('cover', '')}>画像を外す</button>}
              </div>
            </div>
          </div>
          <label style={lbl}>タイトル（15〜60字・今{form.title.length}字）<input style={inp} value={form.title} onChange={(e) => set('title', e.target.value)} /></label>
          <label style={lbl}>要約（検索結果・一覧に出る文。60字以上）<textarea style={{ ...inp, minHeight: 70 }} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
          <label style={lbl}>リード文（記事の冒頭。結論を先に）<textarea style={{ ...inp, minHeight: 90 }} value={form.lead} onChange={(e) => set('lead', e.target.value)} /></label>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>本文の見出し</h2>
          {form.sections.map((s, i) => (
            <div key={i} style={{ ...box, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <b style={{ fontSize: 13 }}>見出し {i + 1}</b>
                <span style={{ flex: 1 }} />
                <button style={btn} onClick={() => move('sections', i, -1)}>上へ</button>
                <button style={btn} onClick={() => move('sections', i, 1)}>下へ</button>
                <button style={btn} onClick={() => confirm('この見出しを消しますか？') && drop('sections', i)}>消す</button>
              </div>
              <input style={inp} value={s.h} onChange={(e) => setSec(i, 'h', e.target.value)} placeholder="見出し" />
              <label style={lbl}>文章（段落は空行で区切る）<textarea style={{ ...inp, minHeight: 140 }} value={s.p} onChange={(e) => setSec(i, 'p', e.target.value)} /></label>
              <label style={lbl}>箇条書き（1行に1つ・無ければ空のまま）<textarea style={{ ...inp, minHeight: 70 }} value={s.list} onChange={(e) => setSec(i, 'list', e.target.value)} /></label>
            </div>
          ))}
          <button style={btn} onClick={() => set('sections', [...form.sections, { h: '', p: '', list: '' }])}>見出しを足す</button>
        </div>

        <div style={{ ...box, display: 'grid', gap: 12 }}>
          <label style={lbl}>「Finemeでできること」（記事の終わりの案内）<textarea style={{ ...inp, minHeight: 90 }} value={form.fineme} onChange={(e) => set('fineme', e.target.value)} /></label>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>よくある質問</h2>
          {form.faq.map((f, i) => (
            <div key={i} style={{ ...box, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={inp} value={f.q} onChange={(e) => setFaq(i, 'q', e.target.value)} placeholder="質問" />
                <button style={btn} onClick={() => drop('faq', i)}>消す</button>
              </div>
              <textarea style={{ ...inp, minHeight: 70 }} value={f.a} onChange={(e) => setFaq(i, 'a', e.target.value)} placeholder="答え" />
            </div>
          ))}
          <button style={btn} onClick={() => set('faq', [...form.faq, { q: '', a: '' }])}>質問を足す</button>
        </div>

        <div style={box}>
          <label style={lbl}>あわせて読みたい記事（URLの末尾をカンマ区切り・3つまで表示）<input style={inp} value={form.related} onChange={(e) => set('related', e.target.value)} placeholder="second-visit, dormant-customers" /></label>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', position: 'sticky', bottom: 0, background: '#f9fafb', padding: '10px 0' }}>
          <button style={btnMain} disabled={busy} onClick={() => save(false)}>{busy ? '保存中…' : '保存する'}</button>
          {msg && <span role="status" style={{ fontSize: 13 }}>{msg}</span>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
      <div>
        <p style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>店舗運営ガイドと営業パートナーガイドの記事です。直すとすぐサイトに反映されます。消す代わりに「非公開」にできます。</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(AUD).map(([k, v]) => (
          <button key={k} style={aud === k ? btnMain : btn} onClick={() => setAud(k)}>{v}（{list.filter((g) => g.audience === k).length}）</button>
        ))}
        <input style={{ ...inp, maxWidth: 260 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="タイトルで探す" />
        <span style={{ flex: 1 }} />
        {role === 'admin' && <button style={btnMain} onClick={() => { setForm({ ...EMPTY, audience: aud }); setMsg(''); }}>記事を足す</button>}
      </div>
      {state === 'loading' && <p role="status" style={{ margin: 0, fontSize: 14 }}>読み込んでいます…</p>}
      {state === 'auth' && (
        <div role="alert" style={{ ...box, background: '#fef2f2', borderColor: '#fecaca', fontSize: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>管理APIキーが正しくないため、記事を読み込めませんでした。</span>
          <button style={btnMain} onClick={reenterKey}>管理APIキーを入れ直す</button>
        </div>
      )}
      {state === 'error' && (
        <div role="alert" style={{ ...box, background: '#fef2f2', borderColor: '#fecaca', fontSize: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{msg}</span>
          <button style={btn} onClick={load}>もう一度読み込む</button>
        </div>
      )}
      {state === 'ok' && msg && <p role="status" style={{ margin: 0, fontSize: 13 }}>{msg}</p>}
      {state === 'ok' && <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}><th style={{ padding: 8 }}>タイトル</th><th>状態</th><th>画像</th><th>更新</th><th></th></tr></thead>
          <tbody>
            {shown.map((g) => (
              <tr key={`${g.audience}:${g.slug}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: 8 }}>
                  <div style={{ fontWeight: 700 }}>{g.title}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{g.slug}{g.source === 'static' ? '・最初に用意した記事' : ''}</div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{g.status === 'published' ? '公開中' : <span style={{ color: '#b45309' }}>非公開</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{g.cover ? '設定済み' : <span style={{ color: '#6b7280' }}>未設定</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{fmt(g.updated_at || g.created_at)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button style={btn} onClick={() => { setForm(toForm(g)); setMsg(''); window.scrollTo(0, 0); }}>直す</button>
                  {g.status === 'published' && <a href={`${base[g.audience]}/${g.slug}`} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>見る</a>}
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={5} style={{ padding: 12, color: '#6b7280' }}>{q ? '一致する記事がありません' : '記事がありません'}</td></tr>}
          </tbody>
        </table>
      </div>}
    </div>
  );
}

