// アンケート（でお要望 2026-10-19：hacomono差分 #9）の質問と回答の確認
import crypto from 'crypto';

export const QTYPES = ['single', 'multi', 'text', 'rating'];
export const newToken = () => crypto.randomBytes(12).toString('base64url');

// 店舗が作った質問を整える（id は既存のものを残し、無ければ振る）
export function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return { error: '質問が正しくありません' };
  if (raw.length > 30) return { error: '質問は30個までです' };
  const out = [];
  for (const q of raw) {
    const type = QTYPES.includes(q?.type) ? q.type : null;
    const label = String(q?.label || '').trim().slice(0, 200);
    if (!type || !label) return { error: '質問文が空のものがあります' };
    const options = (type === 'single' || type === 'multi')
      ? [...new Set((Array.isArray(q.options) ? q.options : []).map(o => String(o || '').trim().slice(0, 80)).filter(Boolean))].slice(0, 20)
      : [];
    if ((type === 'single' || type === 'multi') && options.length < 2) return { error: `「${label}」の選択肢を2つ以上入れてください` };
    out.push({ id: /^[a-z0-9]{6,16}$/.test(q.id || '') ? q.id : crypto.randomBytes(5).toString('hex'), type, label, options, required: !!q.required });
  }
  return { questions: out };
}

// お客様の回答を確かめる
export function validateAnswers(questions, raw) {
  const answers = {};
  for (const q of questions) {
    let v = raw?.[q.id];
    if (q.type === 'text') v = String(v ?? '').trim().slice(0, 2000) || null;
    else if (q.type === 'rating') { v = Number(v); v = v >= 1 && v <= 5 ? Math.round(v) : null; }
    else if (q.type === 'single') v = q.options.includes(v) ? v : null;
    else if (q.type === 'multi') { v = (Array.isArray(v) ? v : []).filter(x => q.options.includes(x)); v = v.length ? [...new Set(v)] : null; }
    if (v == null && q.required) return { error: `「${q.label}」に答えてください` };
    if (v != null) answers[q.id] = v;
  }
  return { answers };
}

// 質問ごとの集計
export function summarize(questions, responses) {
  return questions.map(q => {
    const vals = responses.map(r => r.answers?.[q.id]).filter(v => v != null);
    if (q.type === 'single' || q.type === 'multi') {
      const counts = Object.fromEntries(q.options.map(o => [o, 0]));
      vals.forEach(v => (Array.isArray(v) ? v : [v]).forEach(x => { if (x in counts) counts[x]++; }));
      return { id: q.id, answered: vals.length, counts };
    }
    if (q.type === 'rating') {
      const dist = [1, 2, 3, 4, 5].map(n => vals.filter(v => v === n).length);
      return { id: q.id, answered: vals.length, avg: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null, dist };
    }
    return { id: q.id, answered: vals.length };
  });
}
