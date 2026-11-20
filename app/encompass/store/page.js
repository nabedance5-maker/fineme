'use client';

// お店の画面（ログインした店舗・スタッフ）。お店のメニュー・お客様ごとのメニューと記録・ジムのタブレット用のリンク。
// お客様は Fineme の店舗SaaSの顧客一覧と同じ人を、名前だけ読む（SaaS 側には書き込まない）。
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import s from '../encompass.module.css';
import { api, logout } from '@/lib/encompass/client';
import { totalMinutes } from '@/lib/encompass/menu';

const linkBtn = { display: 'inline-flex', alignItems: 'center', textDecoration: 'none' };
const fmtDate = iso => { try { return new Date(iso).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }); } catch { return ''; } };

function MenuRow({ m, onToggleBoard, onDelete, showCustomer }) {
  return (
    <li className={s.listItem} style={{ gridTemplateColumns: '1fr' }}>
      <div className={s.cardName}>{m.title || '名前なし'}</div>
      <div className={s.cardMeta}>
        {m.items.length}種目・約{totalMinutes(m.items)}分
        {m.on_board ? '・タブレットに出しています' : ''}
        {showCustomer && m.customer_name ? `・${m.customer_name} 様用` : ''}
      </div>
      <div className={s.row}>
        <Link href={`/encompass/play?id=${m.id}`} className={`${s.btnPrimary} ${s.small}`} style={linkBtn}>はじめる</Link>
        <Link href={`/encompass/builder?id=${m.id}`} className={`${s.btn} ${s.small}`} style={linkBtn}>直す</Link>
        {!m.customer_ref && (
          <button type="button" className={`${s.btn} ${s.small}`} onClick={() => onToggleBoard(m)}>{m.on_board ? 'タブレットから外す' : 'タブレットに出す'}</button>
        )}
        <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => onDelete(m)}>消す</button>
      </div>
    </li>
  );
}

function BoardLink({ can }) {
  const [info, setInfo] = useState(null);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { api('/board').then(r => r.ok && setInfo(r.data)); }, []);
  const make = async () => {
    if (info?.exists && !window.confirm('新しいリンクを作ると、今タブレットで開いているリンクは使えなくなります。作り直しますか？')) return;
    const r = await api('/board', { method: 'POST' });
    if (!r.ok) { setMsg(r.data.error || '作れませんでした'); return; }
    setUrl(`${window.location.origin}/encompass/board/${r.data.token}`);
    setInfo({ ...info, exists: true, created_at: new Date().toISOString() });
    setMsg('');
  };
  const stop = async () => {
    if (!window.confirm('タブレット用のリンクを止めますか？タブレットではメニューが出なくなります。')) return;
    const r = await api('/board', { method: 'DELETE' });
    if (r.ok) { setInfo({ ...info, exists: false }); setUrl(''); } else setMsg(r.data.error || '止められませんでした');
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url); setMsg('コピーしました'); } catch { setMsg('長押しでコピーしてください'); } };

  return (
    <section style={{ marginTop: 32 }}>
      <h2 className={s.h2}>ジムに置くタブレット</h2>
      <p className={s.lead}>
        タブレットでこのリンクを開いておくと、ログインしなくても「タブレットに出す」にしたメニューが並びます。
        お客様の名前や記録は出ません。
      </p>
      {info && <p className={s.note}>{info.exists ? `リンクがあります（${fmtDate(info.created_at)}に作成）。` : 'まだリンクはありません。'}</p>}
      {url && (
        <div className={s.warn} style={{ wordBreak: 'break-all' }}>
          <div>このリンクをタブレットで開き、ホーム画面に追加してください。この画面を閉じると、もう表示できません（作り直しはできます）。</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>{url}</div>
          <div className={s.row} style={{ marginTop: 8 }}>
            <button type="button" className={`${s.btn} ${s.small}`} onClick={copy}>コピーする</button>
            <a href={url} target="_blank" rel="noopener noreferrer" className={`${s.btnGhost} ${s.small}`} style={linkBtn}>開いてみる</a>
          </div>
        </div>
      )}
      {can ? (
        <div className={s.row}>
          <button type="button" className={s.btn} onClick={make}>{info?.exists ? 'リンクを作り直す' : 'タブレット用のリンクを作る'}</button>
          {info?.exists && <button type="button" className={s.btnGhost} onClick={stop}>リンクを止める</button>}
        </div>
      ) : (
        <p className={s.note}>リンクはオーナー・店長が作れます。</p>
      )}
      {msg && <p className={s.note} role="status">{msg}</p>}
    </section>
  );
}

function Customers({ menus, onToggleBoard, onDelete }) {
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [cur, setCur] = useState(null);
  const [logs, setLogs] = useState(null);
  useEffect(() => { api('/customers').then(r => setList(r.ok ? r.data.customers : [])); }, []);
  useEffect(() => {
    if (!cur) return;
    setLogs(null);
    api(`/logs?customer=${encodeURIComponent(cur.ref)}`).then(r => setLogs(r.ok ? r.data.logs : []));
  }, [cur]);
  const shown = useMemo(() => (list || []).filter(c => !q || c.name.includes(q.trim())).slice(0, 60), [list, q]);
  const theirs = cur ? menus.filter(m => m.customer_ref === cur.ref) : [];

  if (cur) {
    const enc = encodeURIComponent(cur.ref);
    return (
      <>
        <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => setCur(null)}>お客様の一覧へ戻る</button>
        <h2 className={s.h2}>{cur.name} 様</h2>
        <div className={s.row}>
          <Link href={`/encompass/builder?store=1&customer=${enc}`} className={s.btnPrimary} style={linkBtn}>この方のメニューを作る</Link>
          <Link href={`/encompass/suggest?store=1&customer=${enc}`} className={s.btn} style={linkBtn}>条件から案を出す</Link>
        </div>
        <h3 className={s.h2} style={{ fontSize: 20 }}>この方のメニュー</h3>
        {theirs.length ? (
          <ul className={s.list}>{theirs.map(m => <MenuRow key={m.id} m={m} onToggleBoard={onToggleBoard} onDelete={onDelete} />)}</ul>
        ) : <p className={s.note}>まだありません。</p>}
        <h3 className={s.h2} style={{ fontSize: 20 }}>やった記録</h3>
        {logs === null ? <p className={s.note}>読み込んでいます</p> : logs.length ? (
          <ul className={s.list}>
            {logs.map(l => (
              <li key={l.id} className={s.listItem} style={{ gridTemplateColumns: '1fr' }}>
                <div className={s.cardName}>{fmtDate(l.done_at)}　{l.title || 'メニュー'}</div>
                <div className={s.cardMeta}>{l.items.length}種目・約{totalMinutes(l.items)}分{l.memo ? `・${l.memo}` : ''}</div>
              </li>
            ))}
          </ul>
        ) : <p className={s.note}>まだ記録はありません。メニューの最後に「記録する」を押すと残ります。</p>}
      </>
    );
  }

  return (
    <>
      <p className={s.lead}>Fineme の顧客一覧と同じお客様です。名前を押すと、その方のメニューと記録が出ます。</p>
      <label className={s.field}><span>名前で探す</span><input className={`${s.input} ${s.inputWide}`} value={q} onChange={e => setQ(e.target.value)} /></label>
      {list === null ? <p className={s.note}>読み込んでいます</p> : !list.length ? <p className={s.note}>お客様がまだいません。</p> : (
        <div className={s.choices}>
          {shown.map(c => <button key={c.ref} type="button" className={s.choice} onClick={() => setCur(c)}>{c.name}</button>)}
        </div>
      )}
    </>
  );
}

export default function Store() {
  const [me, setMe] = useState(undefined);
  const [err, setErr] = useState(null);
  const [menus, setMenus] = useState(null);
  const [tab, setTab] = useState('board');

  const loadMenus = useCallback(() => api('/menus').then(r => setMenus(r.ok ? r.data.menus : [])), []);
  useEffect(() => {
    api('/me').then(r => {
      if (r.ok) { setMe(r.data); loadMenus(); } else { setMe(null); setErr(r.data); }
    });
  }, [loadMenus]);

  const toggleBoard = async m => {
    const r = await api(`/menus/${m.id}`, { method: 'PATCH', body: { on_board: !m.on_board } });
    if (r.ok) setMenus(list => list.map(x => (x.id === m.id ? { ...x, ...r.data.menu } : x)));
    else window.alert(r.data.error || '変えられませんでした');
  };
  const remove = async m => {
    if (!window.confirm(`「${m.title || '名前なし'}」を消しますか？`)) return;
    const r = await api(`/menus/${m.id}`, { method: 'DELETE' });
    if (r.ok) setMenus(list => list.filter(x => x.id !== m.id));
    else window.alert(r.data.error || '消せませんでした');
  };

  if (me === undefined) return <main className={s.main}><p className={s.note}>読み込んでいます</p></main>;
  if (!me) {
    const needLogin = err?.code === 'login_required';
    return (
      <main className={s.main}>
        <h1 className={s.h1}>{needLogin ? 'ログインしてください' : 'この画面は使えません'}</h1>
        <p className={s.lead}>{err?.error}</p>
        <div className={s.row}>
          <Link href="/encompass/login" className={s.btnPrimary} style={linkBtn}>{needLogin ? 'ログインする' : '別のアカウントでログインする'}</Link>
          {!needLogin && <button type="button" className={s.btnGhost} onClick={() => { logout(); window.location.href = '/encompass/login'; }}>ログアウト</button>}
        </div>
      </main>
    );
  }

  const shared = (menus || []).filter(m => !m.customer_ref);
  const onBoard = shared.filter(m => m.on_board);

  return (
    <main className={s.main}>
      <p className={s.step}>{me.store.name}{me.staffName ? `（${me.staffName}）` : ''}{me.store.status === 'trial' ? '・試用中' : ''}</p>
      <h1 className={s.h1}>お店のメニューボード</h1>
      <div className={s.row}>
        <Link href="/encompass/suggest?store=1" className={s.btnPrimary} style={linkBtn}>おまかせで作る</Link>
        <Link href="/encompass/builder?store=1" className={s.btn} style={linkBtn}>自分で選んで作る</Link>
      </div>

      <div className={s.tabs} role="group" aria-label="表示" style={{ marginTop: 24 }}>
        <button type="button" className={`${s.choice} ${tab === 'board' ? s.choiceOn : ''}`} aria-pressed={tab === 'board'} onClick={() => setTab('board')} style={{ flex: 1 }}>タブレットに出す（{onBoard.length}）</button>
        <button type="button" className={`${s.choice} ${tab === 'all' ? s.choiceOn : ''}`} aria-pressed={tab === 'all'} onClick={() => setTab('all')} style={{ flex: 1 }}>お店のメニュー（{shared.length}）</button>
        {me.can.customers && <button type="button" className={`${s.choice} ${tab === 'customers' ? s.choiceOn : ''}`} aria-pressed={tab === 'customers'} onClick={() => setTab('customers')} style={{ flex: 1 }}>お客様ごと</button>}
      </div>

      {menus === null ? <p className={s.note}>読み込んでいます</p> : tab === 'customers' ? (
        <Customers menus={menus} onToggleBoard={toggleBoard} onDelete={remove} />
      ) : (
        (() => {
          const list = tab === 'board' ? onBoard : shared;
          if (!list.length) return <p className={s.note}>{tab === 'board' ? 'タブレットに出しているメニューはまだありません。メニューの「タブレットに出す」を押すと、ここに並びます。' : 'まだメニューがありません。上のボタンから作ってください。'}</p>;
          return <ul className={s.list}>{list.map(m => <MenuRow key={m.id} m={m} onToggleBoard={toggleBoard} onDelete={remove} />)}</ul>;
        })()
      )}

      <BoardLink can={me.can.board} />

      <div className={s.row} style={{ marginTop: 32 }}>
        <button type="button" className={s.btnGhost} onClick={() => { logout(); window.location.href = '/encompass/login'; }}>ログアウト</button>
      </div>
    </main>
  );
}
