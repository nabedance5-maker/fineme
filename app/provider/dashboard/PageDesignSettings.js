'use client';
// 掲載者ダッシュボード「ページデザイン」タブ（でお要望 2026-10-01）。
// 店舗が公開ページの見た目を選ぶ。選択肢と検証は lib/provider-theme.js と共有し、
// 右側のプレビューは公開ページと同じ CSS 変数（themeToCssVars）で描く。
import { useEffect, useMemo, useState } from 'react';
import {
  ACCENT_PRESETS, GROUNDS, FONTS, SIZES, DEFAULT_THEME,
  normalizeTheme, themeToCssVars, colorProblem,
} from '@/lib/provider-theme';

function getToken() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return key ? JSON.parse(localStorage.getItem(key))?.access_token || null : null;
  } catch { return null; }
}

function Segmented({ value, options, onChange, name }) {
  return (
    <div role="radiogroup" aria-label={name} style={{ display: 'inline-flex', border: '1px solid rgba(26,20,16,0.18)', borderRadius: '10px', overflow: 'hidden' }}>
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
            background: value === v ? '#1a1410' : 'transparent', color: value === v ? '#fff' : 'rgba(26,20,16,0.75)' }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: '18px', height: '18px' }} />
      {label}
    </label>
  );
}

function Row({ label, children, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700 }}>{label}</div>
      {children}
      {hint && <p className="muted" style={{ fontSize: '12px', margin: 0, lineHeight: 1.6 }}>{hint}</p>}
    </div>
  );
}

// 文字色：「おまかせ」「テーマ色」（見出しのみ）「自由に選ぶ」
function ColorChoice({ value, onChange, ground, allowAccent }) {
  const mode = value === 'auto' || value === 'accent' ? value : 'custom';
  const custom = mode === 'custom' ? value : (GROUNDS[ground].text);
  const problem = mode === 'custom' ? colorProblem(custom, ground) : null;
  const opts = [['auto', 'おまかせ'], ...(allowAccent ? [['accent', 'テーマ色']] : []), ['custom', '自由に選ぶ']];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Segmented value={mode} options={opts} name="文字色" onChange={m => onChange(m === 'custom' ? custom : m)} />
        {mode === 'custom' && (
          <input type="color" value={custom} onChange={e => onChange(e.target.value)} aria-label="文字色を選ぶ"
            style={{ width: '44px', height: '36px', border: '1px solid rgba(26,20,16,0.18)', borderRadius: '8px', padding: '2px', background: '#fff' }} />
        )}
      </div>
      {problem && <p style={{ fontSize: '12px', margin: 0, color: '#b42318', lineHeight: 1.6 }}>{problem}。この色では保存できません。</p>}
    </div>
  );
}

function Preview({ theme, coverImageUrl }) {
  const vars = useMemo(() => themeToCssVars(theme), [theme]);
  return (
    <div style={{ ...vars, background: 'var(--pv-bg)', color: 'var(--pv-text)', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(26,20,16,0.12)' }}>
      <div className={coverImageUrl ? '' : 'fm-contour'} style={{ position: 'relative', minHeight: '150px', display: 'flex', alignItems: 'flex-end', padding: '18px',
        background: coverImageUrl ? `linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.7)), url(${coverImageUrl}) center/cover` : 'color-mix(in srgb, var(--pv-accent) 24%, #0d1117)' }}>
        <div>
          <div style={{ fontFamily: 'var(--pv-hfont)', fontWeight: 'var(--pv-hweight)', fontStyle: 'var(--pv-hstyle)', fontSize: 'calc(22px * var(--pv-hs))', color: '#fff', lineHeight: 1.3 }}>店舗名がここに入ります</div>
          <div style={{ fontSize: 'calc(12px * var(--pv-fs))', color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>キャッチコピー</div>
        </div>
      </div>
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', fontSize: 'calc(13px * var(--pv-fs))' }}>
          <span style={{ paddingBottom: '8px', borderBottom: '2px solid var(--pv-accent)', marginBottom: '-2px', fontWeight: 800 }}>基本情報</span>
          <span style={{ paddingBottom: '8px', color: 'color-mix(in srgb, var(--pv-text) 55%, transparent)' }}>予約</span>
          <span style={{ paddingBottom: '8px', color: 'color-mix(in srgb, var(--pv-text) 55%, transparent)' }}>アピール</span>
        </div>
        <div style={{ background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 12%, transparent)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontFamily: 'var(--pv-hfont)', fontWeight: 'var(--pv-hweight)', fontStyle: 'var(--pv-hstyle)', fontSize: 'calc(18px * var(--pv-hs))', color: 'var(--pv-heading)' }}>見出しの見本</div>
          <p style={{ margin: 0, fontSize: 'calc(14px * var(--pv-fs))', lineHeight: 1.75 }}>本文の見本です。お客様が読む説明文はこの大きさと色で表示されます。</p>
          <p style={{ margin: 0, fontSize: 'calc(12px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 60%, transparent)' }}>補足の文字</p>
          <span style={{ alignSelf: 'flex-start', marginTop: '6px', padding: '10px 18px', borderRadius: '10px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', fontWeight: 800, fontSize: 'calc(13px * var(--pv-fs))' }}>予約する</span>
        </div>
      </div>
    </div>
  );
}

export default function PageDesignSettings() {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [isDefault, setIsDefault] = useState(true);
  const [coverImageUrl, setCoverImageUrl] = useState(null);
  const [slug, setSlug] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoaded(true); return; }
    fetch('/api/provider/page-theme', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setTheme(normalizeTheme(d.theme)); setIsDefault(!!d.isDefault); setCoverImageUrl(d.coverImageUrl); setSlug(d.slug || ''); }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const set = (k, v) => { setTheme(t => ({ ...t, [k]: v })); setMsg(''); };
  const colorBlocked = ['headingColor', 'bodyColor'].some(k => theme[k]?.startsWith?.('#') && colorProblem(theme[k], theme.ground));

  async function save(reset = false) {
    const token = getToken();
    if (!token) { setMsg('ログインが切れています。再度ログインしてください。'); return; }
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/provider/page-theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(reset ? { reset: true } : { theme }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || '保存できませんでした'); return; }
      setTheme(normalizeTheme(d.theme)); setIsDefault(!!d.isDefault);
      setMsg(reset ? 'デフォルトに戻しました' : '保存しました。公開ページに反映されています');
    } catch { setMsg('保存できませんでした'); }
    finally { setSaving(false); }
  }

  if (!loaded) return <div className="card" style={{ padding: '24px' }}>読み込み中…</div>;

  return (
    <div className="card stack" style={{ padding: '24px', gap: '20px' }}>
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>ページデザイン</h2>
        <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
          お客様が見る公開ページの色・書体・文字の大きさを選べます。{isDefault ? '現在はFinemeのデフォルトデザインです。' : ''}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
        <div className="stack" style={{ gap: '20px' }}>
          <Row label="テーマ色" hint="予約ボタン・選択中のタブ・アクセントに使われます">
            <div role="radiogroup" aria-label="テーマ色" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {Object.entries(ACCENT_PRESETS).map(([k, p]) => (
                <button key={k} type="button" role="radio" aria-checked={theme.accent === k} aria-label={p.label} onClick={() => set('accent', k)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: p[theme.ground],
                    boxShadow: theme.accent === k ? '0 0 0 2px #fff, 0 0 0 4px #1a1410' : '0 0 0 1px rgba(26,20,16,0.2)' }} />
                  <span style={{ fontSize: '11px', color: 'rgba(26,20,16,0.7)' }}>{p.label}</span>
                </button>
              ))}
            </div>
          </Row>
          <Row label="地の明るさ">
            <Segmented name="地の明るさ" value={theme.ground} onChange={v => set('ground', v)} options={Object.entries(GROUNDS).map(([k, g]) => [k, g.label])} />
          </Row>
          <Row label="見出し">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Segmented name="見出しの書体" value={theme.headingFont} onChange={v => set('headingFont', v)} options={Object.entries(FONTS).map(([k, f]) => [k, f.label])} />
              <Segmented name="見出しの大きさ" value={theme.headingSize} onChange={v => set('headingSize', v)} options={Object.entries(SIZES).map(([k, z]) => [k, z.label])} />
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <Toggle label="太字" checked={theme.headingBold} onChange={v => set('headingBold', v)} />
              <Toggle label="斜体" checked={theme.headingItalic} onChange={v => set('headingItalic', v)} />
            </div>
            <ColorChoice value={theme.headingColor} ground={theme.ground} allowAccent onChange={v => set('headingColor', v)} />
          </Row>
          <Row label="本文" hint="自由に選んだ文字色は、背景との差が小さく読みにくい場合は保存できません">
            <Segmented name="本文の大きさ" value={theme.bodySize} onChange={v => set('bodySize', v)} options={Object.entries(SIZES).map(([k, z]) => [k, z.label])} />
            <ColorChoice value={theme.bodyColor} ground={theme.ground} onChange={v => set('bodyColor', v)} />
          </Row>
          <Row label="ヘッダー画像" hint="ヘッダー画像は「プロフィール」タブのカバー画像を使います。未設定の場合は、テーマ色の地に等高線の模様が表示されます。">
            {coverImageUrl
              ? <img src={coverImageUrl} alt="現在のカバー画像" style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: '8px' }} />
              : <span className="muted" style={{ fontSize: '12px' }}>カバー画像は未設定です</span>}
          </Row>
        </div>

        <div className="stack" style={{ gap: '10px', position: 'sticky', top: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(26,20,16,0.6)' }}>プレビュー</div>
          <Preview theme={theme} coverImageUrl={coverImageUrl} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="btn" disabled={saving || colorBlocked} onClick={() => save(false)}>{saving ? '保存中…' : '保存する'}</button>
        <button type="button" className="btn btn-ghost" disabled={saving || isDefault} onClick={() => save(true)}>デフォルトに戻す</button>
        {slug && <a className="btn btn-ghost" href={`/provider/${slug}`} target="_blank" rel="noopener noreferrer">公開ページを確認</a>}
        {msg && <span style={{ fontSize: '13px' }}>{msg}</span>}
      </div>
    </div>
  );
}
