'use client';
// 他のサービスからの乗り換え：CSVの取り込み（2026-10-30 渡邉要望）。
// CSVを選ぶ → AIが種類と列の割り振りを決める（見出しと数行の見本だけを送る）→ お店が確認・修正 → 300行ずつ取り込む。
// 定義と値の整え方は lib/import-schema.js、取り込みは /api/provider/import/commit。
import { useState } from 'react';
import { freshAccessToken } from '@/lib/browser-auth';
import { IMPORT_TYPES, IMPORT_CHUNK, MAX_IMPORT_ROWS, decodeCsvBytes, parseCsv, missingRequired, pick } from '@/lib/import-schema';

const CSS = `
.dim { display: grid; gap: 14px; }
.dim-drop { display: grid; gap: 8px; justify-items: start; padding: 18px; border: 2px dashed rgba(201,168,76,.6); border-radius: 14px; background: rgba(201,168,76,.06); }
.dim-drop input { font-size: 14px; }
.dim-order { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #1a1410; }
.dim-box { border: 1px solid rgba(26,20,16,.12); border-radius: 12px; padding: 14px 16px; display: grid; gap: 10px; background: #fff; }
.dim-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 13px; }
.dim-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px 14px; }
.dim-grid label { display: grid; gap: 3px; font-size: 12px; font-weight: 700; color: #1a1410; }
.dim-grid select, .dim-row select { padding: 7px 8px; border-radius: 8px; border: 1px solid rgba(26,20,16,.2); font-size: 13px; background: #fff; color: #1a1410; max-width: 100%; }
.dim-grid label.on select { border-color: #c9a84c; background: #fffbeb; }
.dim-warn { margin: 0; padding: 8px 12px; border-radius: 10px; background: #fff7ed; border: 1px solid #fdba74; color: #7c2d12; font-size: 12.5px; font-weight: 700; }
.dim-note { margin: 0; font-size: 12px; color: rgba(26,20,16,.7); line-height: 1.7; }
.dim-ai { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; font-weight: 800; color: #2f4f8f; }
.dim-prev { overflow-x: auto; border: 1px solid #eef0f2; border-radius: 10px; }
.dim-prev table { border-collapse: collapse; font-size: 12px; min-width: 100%; }
.dim-prev th, .dim-prev td { padding: 6px 8px; border-bottom: 1px solid #eef0f2; white-space: nowrap; text-align: left; }
.dim-prev th { background: #fafaf8; font-weight: 700; }
.dim-bar { height: 8px; border-radius: 99px; background: rgba(26,20,16,.08); overflow: hidden; }
.dim-bar span { display: block; height: 100%; background: linear-gradient(90deg, #c9a84c, #e8cf7e); transition: width .3s; }
.dim-done { padding: 12px 14px; border-radius: 12px; background: #f0fdf4; border: 1px solid #86efac; color: #14532d; font-size: 13px; line-height: 1.8; }
.dim-err { max-height: 160px; overflow: auto; margin: 0; padding-left: 18px; font-size: 12px; color: #92400e; }
`;

const ORDER = ['customers', 'tickets', 'memberships', 'reservations', 'shifts', 'attendance'];

async function authH() {
  const t = await freshAccessToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function DataImport() {
  const [file, setFile] = useState(null); // { name, headers, rows }
  const [phase, setPhase] = useState('idle'); // idle | reading | analyzing | review | importing | done
  const [type, setType] = useState('customers');
  const [mapping, setMapping] = useState({});
  const [ai, setAi] = useState(null); // { confidence, notes, fallback }
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(''); setResult(null); setPhase('reading');
    try {
      const all = parseCsv(decodeCsvBytes(await f.arrayBuffer()));
      if (all.length < 2) { setError('CSVの中身が読めませんでした（1行目に見出し、2行目からデータが入っているか確かめてください）'); setPhase('idle'); return; }
      const headers = all[0].map(h => String(h).trim());
      const rows = all.slice(1, MAX_IMPORT_ROWS + 1);
      setFile({ name: f.name, headers, rows, over: all.length - 1 > MAX_IMPORT_ROWS });
      setPhase('analyzing');
      const res = await fetch('/api/provider/import/analyze', { method: 'POST', headers: await authH(), body: JSON.stringify({ filename: f.name, headers, samples: rows.slice(0, 3) }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || '読み取りに失敗しました'); setPhase('idle'); return; }
      setType(d.type || 'customers');
      setMapping(d.mapping || {});
      setAi({ confidence: d.confidence, notes: d.notes || [], fallback: !!d.fallback, msg: d.fallback ? d.error : '' });
      setPhase('review');
    } catch {
      setError('ファイルを読めませんでした。CSV形式（カンマ区切り）で書き出したファイルを選んでください');
      setPhase('idle');
    }
  }

  function changeType(t) { setType(t); setMapping({}); }

  async function runImport() {
    setPhase('importing'); setProgress(0); setError('');
    const total = { created: 0, updated: 0, skipped: 0, customers_created: 0, staff_created: 0, errors: [] };
    for (let i = 0; i < file.rows.length; i += IMPORT_CHUNK) {
      const res = await fetch('/api/provider/import/commit', { method: 'POST', headers: await authH(), body: JSON.stringify({ type, mapping, rows: file.rows.slice(i, i + IMPORT_CHUNK), offset: i }) }).catch(() => null);
      const d = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setError(`${i + 1}行目からの取り込みで止まりました：${d.error || '通信エラー'}（ここまでの分は取り込まれています。同じファイルをもう一度取り込んでも、二重には入りません）`);
        break;
      }
      ['created', 'updated', 'skipped', 'customers_created', 'staff_created'].forEach(k => { total[k] += d[k] || 0; });
      total.errors.push(...(d.errors || []));
      setProgress(Math.min(1, (i + IMPORT_CHUNK) / file.rows.length));
    }
    setResult(total);
    setPhase('done');
  }

  const def = IMPORT_TYPES[type];
  const missing = phase === 'review' ? missingRequired(type, mapping) : [];
  const used = Object.entries(mapping).filter(([, v]) => Number.isInteger(v));
  const colLabel = i => `${file.headers[i] || `${i + 1}列目`}（例：${String(file.rows[0]?.[i] ?? '').slice(0, 16) || '空'}）`;

  return (
    <div className="dim">
      <style>{CSS}</style>
      {(phase === 'idle' || phase === 'reading' || phase === 'done') && (
        <div className="dim-drop">
          <b style={{ fontSize: '14px' }}>前のサービスで書き出したCSVを選んでください</b>
          <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={onFile} disabled={phase === 'reading'} />
          <p className="dim-note">どのサービスのCSVでも大丈夫です。AIが中身を読んで、Finemeのどの項目に入れるかを決めます（AIに送るのは見出しと最初の3行だけです）。取り込む前に確認できます。</p>
          <p className="dim-note">おすすめの順番：</p>
          <ol className="dim-order">{ORDER.map(k => <li key={k}>{IMPORT_TYPES[k].label}：{IMPORT_TYPES[k].help}</li>)}</ol>
        </div>
      )}
      {phase === 'reading' && <p className="dim-note" role="status">ファイルを読んでいます…</p>}
      {phase === 'analyzing' && <div className="dim-box" role="status"><span className="dim-ai">AIが「{file?.name}」の中身を読み取って、Finemeの項目に割り振っています…</span></div>}

      {phase === 'review' && file && (
        <div className="dim-box">
          <div className="dim-row"><b>{file.name}</b><span>{file.rows.length.toLocaleString()}行</span>{file.over && <span className="dim-warn">{MAX_IMPORT_ROWS.toLocaleString()}行までです。残りはファイルを分けてください</span>}</div>
          {ai && !ai.fallback && <span className="dim-ai">AIが割り振りました（{ai.confidence === 'high' ? '自信あり' : ai.confidence === 'low' ? '自信なし・よく確かめてください' : 'だいたい合っているはず・確かめてください'}）</span>}
          {ai?.fallback && <p className="dim-warn">{ai.msg}</p>}
          {ai?.notes?.length > 0 && <ul className="dim-note" style={{ paddingLeft: '18px', margin: 0 }}>{ai.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          <div className="dim-row">
            <label>このファイルの中身
              <select value={type} onChange={e => changeType(e.target.value)} style={{ marginLeft: '8px' }}>
                {Object.entries(IMPORT_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <p className="dim-note">{def.help}。各項目に、CSVのどの列を入れるかを選んでください（使わない項目は「入れない」のまま）。</p>
          <div className="dim-grid">
            {def.fields.map(([k, label]) => (
              <label key={k} className={Number.isInteger(mapping[k]) ? 'on' : ''}>{label}
                <select value={Number.isInteger(mapping[k]) ? mapping[k] : ''} onChange={e => setMapping(m => ({ ...m, [k]: e.target.value === '' ? null : Number(e.target.value) }))}>
                  <option value="">入れない</option>
                  {file.headers.map((_, i) => <option key={i} value={i}>{colLabel(i)}</option>)}
                </select>
              </label>
            ))}
          </div>
          {missing.length > 0 && <p className="dim-warn">次の項目の列を選んでください：{missing.join('、')}</p>}
          {used.length > 0 && (
            <div className="dim-prev">
              <table>
                <thead><tr>{used.map(([k]) => <th key={k}>{def.fields.find(f => f[0] === k)?.[1]}</th>)}</tr></thead>
                <tbody>{file.rows.slice(0, 5).map((r, i) => { const v = pick(r, mapping); return <tr key={i}>{used.map(([k]) => <td key={k}>{v[k]}</td>)}</tr>; })}</tbody>
              </table>
            </div>
          )}
          <p className="dim-note">すでにFinemeにいるお客様（電話・メール・氏名が同じ方）は新しく作らず、空いている項目だけを埋めます。同じファイルを2回取り込んでも、二重には入りません。</p>
          <div className="dim-row">
            <button type="button" className="btn" disabled={missing.length > 0} onClick={runImport}>{file.rows.length.toLocaleString()}行を{def.label}として取り込む</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setPhase('idle'); setFile(null); }}>やめる</button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div className="dim-box" role="status">
          <b style={{ fontSize: '13px' }}>取り込んでいます…（{Math.round(progress * 100)}%）</b>
          <div className="dim-bar"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <p className="dim-note">終わるまでこの画面を開いたままにしてください。</p>
        </div>
      )}

      {error && <p className="dim-warn" role="alert">{error}</p>}

      {phase === 'done' && result && (
        <div className="dim-done" role="status">
          <b>{IMPORT_TYPES[type].label}の取り込みが終わりました</b><br />
          新しく入れた：{result.created.toLocaleString()}件{result.updated ? `・既存のお客様に情報を足した：${result.updated.toLocaleString()}件` : ''}・飛ばした：{result.skipped.toLocaleString()}件
          {result.customers_created > 0 && <><br />あわせて、Finemeにまだいなかったお客様を{result.customers_created}人登録しました。</>}
          {result.staff_created > 0 && <><br />Finemeにまだいなかったスタッフを{result.staff_created}人、非公開で作りました（「スタッフ」で確かめてください）。</>}
          {type === 'memberships' && <><br />月額プランは、お客様のメモに残しました。Finemeで引き落としを始めるには、お客様に入会のご案内を送ってください。</>}
          {result.errors.length > 0 && <><br />入れられなかった行：<ul className="dim-err">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></>}
        </div>
      )}
    </div>
  );
}
