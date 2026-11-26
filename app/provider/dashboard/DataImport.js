'use client';
// 他のサービスからの乗り換え：CSVの取り込み（2026-10-30 渡邉要望）。
// CSVを選ぶ → AIが種類と列の割り振りを決める（見出しと数行の見本だけを送る）→ お店が確認・修正 → 300行ずつ取り込む。
// 定義と値の整え方は lib/import-schema.js、取り込みは /api/provider/import/commit。
// 2026-11-26 渡邉要望「色々まとまってしまっているCSVでも、とりあえず投入すれば上手いこと振り分けて」：
//  1つのファイルを、AIが種類ごとの「取り込み」（顧客・回数券・来店履歴・メニュー一覧など）に分ける。行ごとに種類が違う時は列の値で行を絞る。
//  どこにも入らない列は、お客様のメモに「見出し：値」で残す（チェックを外せば残さない）。取り込みは、お客様→回数券→予約…の順に続けて行う。
import { useState } from 'react';
import { freshAccessToken } from '@/lib/browser-auth';
import { IMPORT_TYPES, IMPORT_CHUNK, MAX_IMPORT_ROWS, IMPORT_ORDER, EXTRA_TARGETS, MAX_IMPORT_PARTS, decodeCsvBytes, parseCsv, missingRequired, pick, rowMatches } from '@/lib/import-schema';

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
.dim-part { border: 1px solid rgba(26,20,16,.12); border-left: 4px solid #c9a84c; border-radius: 12px; padding: 12px 14px; display: grid; gap: 10px; background: #fff; }
.dim-part-h { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; font-size: 13px; }
.dim-extras { display: flex; gap: 6px 14px; flex-wrap: wrap; font-size: 12.5px; }
.dim-extras label { display: inline-flex; gap: 6px; align-items: center; }
.dim-err { max-height: 160px; overflow: auto; margin: 0; padding-left: 18px; font-size: 12px; color: #92400e; }
`;

const ORDER = ['customers', 'tickets', 'memberships', 'reservations', 'services', 'staff', 'shifts', 'attendance'];

async function authH() {
  const t = await freshAccessToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

// 行ごとの種類分け（「種別」の列など）をAIが決められるよう、値の種類が少ない列だけ、その値の一覧を送る。
// 名前・電話・メールのように1人ずつ違う列は送らない（値の種類が多いので自然に外れる。念のため形でも外す）
const PERSONAL = /@|^\+?\d[\d\- ]{8,}$/;
function distinctValues(headers, rows) {
  if (rows.length < 12) return {};
  const out = {};
  headers.forEach((_, i) => {
    const set = new Set();
    for (const r of rows) {
      const v = String(r[i] ?? '').trim();
      if (v) set.add(v);
      if (set.size > 8) return;
    }
    const vals = [...set];
    if (vals.length >= 2 && vals.length * 3 <= rows.length && !vals.some(v => PERSONAL.test(v) || v.length > 20)) out[i] = vals;
  });
  return out;
}

export default function DataImport() {
  const [file, setFile] = useState(null); // { name, headers, rows }
  const [phase, setPhase] = useState('idle'); // idle | reading | analyzing | review | importing | done
  const [parts, setParts] = useState([]); // [{ type, mapping, filter }]
  const [extras, setExtras] = useState([]); // どこにも入らない列の番号
  const [keepExtras, setKeepExtras] = useState({}); // 列番号 → メモに残すか
  const [ai, setAi] = useState(null); // { confidence, notes, fallback, unsupported }
  const [progress, setProgress] = useState({ part: 0, ratio: 0 });
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(''); setResults([]); setPhase('reading');
    try {
      const all = parseCsv(decodeCsvBytes(await f.arrayBuffer()));
      if (all.length < 2) { setError('CSVの中身が読めませんでした（1行目に見出し、2行目からデータが入っているか確かめてください）'); setPhase('idle'); return; }
      const headers = all[0].map(h => String(h).trim());
      const rows = all.slice(1, MAX_IMPORT_ROWS + 1);
      setFile({ name: f.name, headers, rows, over: all.length - 1 > MAX_IMPORT_ROWS });
      setPhase('analyzing');
      const res = await fetch('/api/provider/import/analyze', { method: 'POST', headers: await authH(), body: JSON.stringify({ filename: f.name, headers, samples: rows.slice(0, 3), distinct: distinctValues(headers, rows) }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || '読み取りに失敗しました'); setPhase('idle'); return; }
      const ps = Array.isArray(d.parts) && d.parts.length ? d.parts : (d.unsupported ? [] : [{ type: d.type || 'customers', mapping: d.mapping || {}, filter: null }]);
      setParts(ps.map(p => ({ type: p.type, mapping: p.mapping || {}, filter: p.filter || null })));
      const ex = Array.isArray(d.extras) ? d.extras : [];
      setExtras(ex);
      setKeepExtras(Object.fromEntries(ex.map(i => [i, true])));
      setAi({ confidence: d.confidence, notes: d.notes || [], fallback: !!d.fallback, msg: d.fallback ? d.error : '', unsupported: !!d.unsupported });
      setPhase('review');
    } catch {
      setError('ファイルを読めませんでした。CSV形式（カンマ区切り）で書き出したファイルを選んでください');
      setPhase('idle');
    }
  }

  const updatePart = (idx, patch) => setParts(ps => ps.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const rowsOf = p => (p.filter ? file.rows.map((r, i) => [r, i]).filter(([r]) => rowMatches(r, p.filter)) : file.rows.map((r, i) => [r, i]));
  // メモに残す列は、お客様（なければ予約・会員プラン）の取り込みのうち、最初の1つに付ける
  const extraTargetIdx = parts.findIndex(p => p.type === 'customers') >= 0 ? parts.findIndex(p => p.type === 'customers') : parts.findIndex(p => EXTRA_TARGETS.includes(p.type));

  async function runImport() {
    setPhase('importing'); setError('');
    const order = parts.map((p, i) => ({ p, i })).sort((a, b) => IMPORT_ORDER.indexOf(a.p.type) - IMPORT_ORDER.indexOf(b.p.type));
    const out = [];
    for (const [n, { p, i: partIdx }] of order.entries()) {
      const target = rowsOf(p);
      const ex = partIdx === extraTargetIdx ? extras.filter(i => keepExtras[i]).map(i => ({ i, label: file.headers[i] || `${i + 1}列目` })) : [];
      const total = { type: p.type, rows: target.length, created: 0, updated: 0, skipped: 0, customers_created: 0, staff_created: 0, errors: [] };
      for (let k = 0; k < target.length; k += IMPORT_CHUNK) {
        const chunk = target.slice(k, k + IMPORT_CHUNK);
        setProgress({ part: n, ratio: k / Math.max(1, target.length) });
        const res = await fetch('/api/provider/import/commit', { method: 'POST', headers: await authH(), body: JSON.stringify({ type: p.type, mapping: p.mapping, rows: chunk.map(c => c[0]), lines: chunk.map(c => c[1]), extras: ex }) }).catch(() => null);
        const d = res ? await res.json().catch(() => ({})) : {};
        if (!res || !res.ok) {
          setError(`${IMPORT_TYPES[p.type].label}の${chunk[0][1] + 2}行目からの取り込みで止まりました：${d.error || '通信エラー'}（ここまでの分は取り込まれています。同じファイルをもう一度取り込んでも、二重には入りません）`);
          out.push(total); setResults(out); setPhase('done');
          return;
        }
        ['created', 'updated', 'skipped', 'customers_created', 'staff_created'].forEach(key => { total[key] += d[key] || 0; });
        total.errors.push(...(d.errors || []));
      }
      out.push(total);
    }
    setProgress({ part: order.length, ratio: 1 });
    setResults(out);
    setPhase('done');
    // 初期設定ガイドの「今のお客様の情報を移す」「メニュー」などを、取り込んだ内容で確かめ直す
    try { window.dispatchEvent(new Event('pd-setup-refresh')); } catch {}
  }

  const missingAll = phase === 'review' ? parts.map(p => missingRequired(p.type, p.mapping)) : [];
  const blocked = !parts.length || missingAll.some(m => m.length);
  const colLabel = i => `${file.headers[i] || `${i + 1}列目`}（例：${String(file.rows[0]?.[i] ?? '').slice(0, 16) || '空'}）`;
  const unusedTypes = Object.keys(IMPORT_TYPES).filter(t => !parts.some(p => p.type === t));

  return (
    <div className="dim">
      <style>{CSS}</style>
      {(phase === 'idle' || phase === 'reading' || phase === 'done') && (
        <div className="dim-drop">
          <b style={{ fontSize: '14px' }}>前のサービスやエクセルで書き出したCSVを選んでください</b>
          <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={onFile} disabled={phase === 'reading'} />
          <p className="dim-note">どのサービスのCSVでも大丈夫です。顧客・回数券・来店履歴などが1つのファイルにまとまっていても、AIが中身を読んで種類ごとに振り分けます。どこにも入らない列は、お客様のメモに残せます（AIに送るのは見出しと最初の3行、それに「種別」のような値の種類が少ない列の値だけです）。取り込む前に確認できます。</p>
          <p className="dim-note">取り込めるもの：</p>
          <ol className="dim-order">{ORDER.map(k => <li key={k}>{IMPORT_TYPES[k].label}：{IMPORT_TYPES[k].help}</li>)}</ol>
        </div>
      )}
      {phase === 'reading' && <p className="dim-note" role="status">ファイルを読んでいます…</p>}
      {phase === 'analyzing' && <div className="dim-box" role="status"><span className="dim-ai">AIが「{file?.name}」の中身を読み取って、種類ごとにFinemeの項目へ振り分けています…</span></div>}

      {phase === 'review' && file && (
        <div className="dim-box">
          <div className="dim-row"><b>{file.name}</b><span>{file.rows.length.toLocaleString()}行</span>{file.over && <span className="dim-warn">{MAX_IMPORT_ROWS.toLocaleString()}行までです。残りはファイルを分けてください</span>}</div>
          {ai && !ai.fallback && parts.length > 0 && <span className="dim-ai">AIが{parts.length > 1 ? `${parts.length}種類に振り分けました` : '割り振りました'}（{ai.confidence === 'high' ? '自信あり' : ai.confidence === 'low' ? '自信なし・よく確かめてください' : 'だいたい合っているはず・確かめてください'}）</span>}
          {ai?.fallback && <p className="dim-warn">{ai.msg}</p>}
          {ai?.unsupported && <p className="dim-warn">このファイルは、Finemeに取り込める種類（下の「取り込みを足す」の一覧）に当てはまりませんでした。種類を選んで手で割り振ることもできます。</p>}
          {ai?.notes?.length > 0 && <ul className="dim-note" style={{ paddingLeft: '18px', margin: 0 }}>{ai.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}

          {parts.map((p, idx) => {
            const def = IMPORT_TYPES[p.type];
            const target = rowsOf(p);
            const used = Object.entries(p.mapping).filter(([, v]) => Number.isInteger(v));
            const missing = missingAll[idx] || [];
            return (
              <div key={idx} className="dim-part">
                <div className="dim-part-h">
                  <label>取り込み{parts.length > 1 ? ` ${idx + 1}` : ''}：
                    <select value={p.type} onChange={e => updatePart(idx, { type: e.target.value, mapping: {} })} style={{ marginLeft: '6px' }}>
                      {Object.entries(IMPORT_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                    </select>
                    <span style={{ marginLeft: '8px' }}>{target.length.toLocaleString()}行</span>
                  </label>
                  {parts.length > 1 && <button type="button" className="btn btn-ghost" style={{ fontSize: '12px' }} onClick={() => setParts(ps => ps.filter((_, i) => i !== idx))}>この取り込みはしない</button>}
                </div>
                {p.filter && (
                  <div className="dim-row">
                    <span className="dim-note">「{file.headers[p.filter.i] || `${p.filter.i + 1}列目`}」が {p.filter.values.map(v => `「${v}」`).join('・')} の行だけ</span>
                    <button type="button" className="btn btn-ghost" style={{ fontSize: '12px' }} onClick={() => updatePart(idx, { filter: null })}>全部の行にする</button>
                  </div>
                )}
                <p className="dim-note">{def.help}。各項目に、CSVのどの列を入れるかを選んでください（使わない項目は「入れない」のまま）。</p>
                <div className="dim-grid">
                  {def.fields.map(([k, label]) => (
                    <label key={k} className={Number.isInteger(p.mapping[k]) ? 'on' : ''}>{label}
                      <select value={Number.isInteger(p.mapping[k]) ? p.mapping[k] : ''} onChange={e => updatePart(idx, { mapping: { ...p.mapping, [k]: e.target.value === '' ? null : Number(e.target.value) } })}>
                        <option value="">入れない</option>
                        {file.headers.map((_, i) => <option key={i} value={i}>{colLabel(i)}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                {missing.length > 0 && <p className="dim-warn">次の項目の列を選んでください：{missing.join('、')}</p>}
                {used.length > 0 && target.length > 0 && (
                  <div className="dim-prev">
                    <table>
                      <thead><tr>{used.map(([k]) => <th key={k}>{def.fields.find(f => f[0] === k)?.[1]}</th>)}</tr></thead>
                      <tbody>{target.slice(0, 4).map(([r], i) => { const v = pick(r, p.mapping); return <tr key={i}>{used.map(([k]) => <td key={k}>{v[k]}</td>)}</tr>; })}</tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {parts.length < MAX_IMPORT_PARTS && unusedTypes.length > 0 && (
            <div className="dim-row">
              <label>このファイルから取り込みを足す：
                <select value="" onChange={e => { if (e.target.value) setParts(ps => [...ps, { type: e.target.value, mapping: {}, filter: null }]); }} style={{ marginLeft: '6px' }}>
                  <option value="">種類を選ぶ</option>
                  {unusedTypes.map(k => <option key={k} value={k}>{IMPORT_TYPES[k].label}</option>)}
                </select>
              </label>
            </div>
          )}

          {extras.length > 0 && extraTargetIdx >= 0 && (
            <div className="dim-part" style={{ borderLeftColor: '#2f4f8f' }}>
              <b style={{ fontSize: '13px' }}>どの項目にも入らない列（{IMPORT_TYPES[parts[extraTargetIdx].type].label}のメモに「見出し：値」で残します）</b>
              <div className="dim-extras">
                {extras.map(i => (
                  <label key={i}><input type="checkbox" checked={!!keepExtras[i]} onChange={e => setKeepExtras(k => ({ ...k, [i]: e.target.checked }))} />{colLabel(i)}</label>
                ))}
              </div>
            </div>
          )}

          <p className="dim-note">すでにFinemeにいるお客様（電話・メール・氏名が同じ方）は新しく作らず、空いている項目だけを埋めます。同じ名前のメニュー・スタッフは作りません。同じファイルを2回取り込んでも、二重には入りません。</p>
          <div className="dim-row">
            <button type="button" className="btn" disabled={blocked} onClick={runImport}>{parts.length > 1 ? `${parts.length}種類をまとめて取り込む` : parts.length ? `${rowsOf(parts[0]).length.toLocaleString()}行を${IMPORT_TYPES[parts[0].type].label}として取り込む` : '取り込む種類を選んでください'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setPhase('idle'); setFile(null); setParts([]); }}>やめる</button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div className="dim-box" role="status">
          <b style={{ fontSize: '13px' }}>取り込んでいます…（{parts.length > 1 ? `${Math.min(progress.part + 1, parts.length)}/${parts.length}種類目・` : ''}{Math.round(progress.ratio * 100)}%）</b>
          <div className="dim-bar"><span style={{ width: `${Math.round(((progress.part + progress.ratio) / Math.max(1, parts.length)) * 100)}%` }} /></div>
          <p className="dim-note">終わるまでこの画面を開いたままにしてください。</p>
        </div>
      )}

      {error && <p className="dim-warn" role="alert">{error}</p>}

      {phase === 'done' && results.length > 0 && (
        <div className="dim-done" role="status">
          {results.map((r, i) => (
            <div key={i} style={{ marginTop: i ? '8px' : 0 }}>
              <b>{IMPORT_TYPES[r.type].label}</b>：新しく入れた {r.created.toLocaleString()}件{r.updated ? `・既存のお客様に情報を足した ${r.updated.toLocaleString()}件` : ''}・飛ばした {r.skipped.toLocaleString()}件
              {r.customers_created > 0 && <><br />あわせて、Finemeにまだいなかったお客様を{r.customers_created}人登録しました。</>}
              {r.staff_created > 0 && <><br />Finemeにまだいなかったスタッフを{r.staff_created}人、非公開で作りました（「スタッフ」で確かめてください）。</>}
              {r.type === 'staff' && r.created > 0 && <><br />スタッフは非公開・指名候補なしで作りました。「スタッフ」で公開と「予約時の指名候補に出す」を選んでください。</>}
              {r.type === 'memberships' && <><br />月額プランは、お客様のメモに残しました。Finemeで引き落としを始めるには、お客様に入会のご案内を送ってください。</>}
              {r.errors.length > 0 && <><br />入れられなかった行：<ul className="dim-err">{r.errors.map((e, j) => <li key={j}>{e}</li>)}</ul></>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
