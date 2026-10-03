// AI専属コンサルの記録と学習。ゴールの変遷・過去の見立て・相談の要約・タスクの実績を店舗ごとに積み、次の見立てと相談の材料にする。
import Anthropic from '@anthropic-ai/sdk';

const SUMMARY_MODEL = 'claude-haiku-4-5-20251001';
const SUMMARIZE_AFTER = 8;

const jstDate = iso => new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

// ゴールが前回と変わった時だけ履歴に残す
export async function recordGoal(supabase, providerId, goal, source = 'user') {
  const text = String(goal || '').trim();
  if (!text) return;
  const { data } = await supabase.from('provider_consultant_goal_history').select('goal_text').eq('provider_id', providerId).order('set_at', { ascending: false }).limit(1);
  if (data?.[0]?.goal_text === text) return;
  await supabase.from('provider_consultant_goal_history').insert({ provider_id: providerId, goal_text: text, source });
}

export async function loadMemory(supabase, providerId) {
  const [goalRes, planRes] = await Promise.all([
    supabase.from('provider_consultant_goal_history').select('goal_text, source, set_at').eq('provider_id', providerId).order('set_at', { ascending: false }).limit(10),
    supabase.from('provider_consultant_plan_history').select('goal_text, diagnosis, focus, generated_at').eq('provider_id', providerId).order('generated_at', { ascending: false }).limit(6),
  ]);
  return { goalHistory: goalRes.data || [], planHistory: planRes.data || [] };
}

function taskRecord(tasks) {
  const closed = tasks.filter(t => t.status !== 'open');
  if (closed.length < 3) return '';
  const lines = [];
  for (const [key, label] of [['daily', '毎日'], ['weekly', '毎週'], ['monthly', '毎月'], ['once', '単発']]) {
    const rows = closed.filter(t => t.cadence === key);
    if (!rows.length) continue;
    const done = rows.filter(t => t.status === 'done').length;
    lines.push(`- ${label}：${rows.length}件中 ${done}件できた（${Math.round((done / rows.length) * 100)}%）`);
  }
  const skipped = closed.filter(t => t.status === 'skipped').slice(0, 6).map(t => `「${t.title}」`).join('、');
  const done = closed.filter(t => t.status === 'done').slice(0, 6).map(t => `「${t.title}」`).join('、');
  return `${lines.join('\n')}${done ? `\n- 続いた・できたこと：${done}` : ''}${skipped ? `\n- できなかった・見送ったこと：${skipped}` : ''}`;
}

// プロンプトに足す「この店舗について積み上がった知識」
export function memoryForPrompt(state) {
  const parts = [];
  if (state.memorySummary) parts.push(`【これまでの相談から学んだこの店舗のこと】\n${state.memorySummary}`);
  const gh = (state.goalHistory || []).slice(0, 5);
  if (gh.length > 1) {
    parts.push(`【ゴールの変遷（新しい順）】\n${gh.map(g => `- ${jstDate(g.set_at)}：${g.goal_text}`).join('\n')}`);
  }
  const ph = (state.planHistory || []).slice(0, 3);
  if (ph.length) {
    parts.push(`【過去の見立て（新しい順）】\n${ph.map(p => `- ${jstDate(p.generated_at)}：${p.diagnosis}`).join('\n')}`);
  }
  const rec = taskRecord(state.tasks || []);
  if (rec) parts.push(`【この店舗のタスクの実績（続くもの・続かないものの傾向）】\n${rec}`);
  return parts.length ? `\n\n${parts.join('\n\n')}` : '';
}

// 未要約の会話が溜まったら、これまでの要約に統合する（店舗について分かったことの圧縮記憶）
export async function maybeSummarize(supabase, provider, state) {
  if (!process.env.ANTHROPIC_API_KEY) return;
  let q = supabase.from('provider_consultant_messages').select('role, content, created_at').eq('provider_id', provider.id).order('created_at', { ascending: true }).limit(60);
  if (state.summarizedUntil) q = q.gt('created_at', state.summarizedUntil);
  const { data } = await q;
  const msgs = data || [];
  if (msgs.length < SUMMARIZE_AFTER) return;

  const transcript = msgs.map(m => `${m.role === 'user' ? '店舗' : 'AI'}：${String(m.content).slice(0, 500)}`).join('\n');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 900,
    system: `あなたは店舗専属コンサルの記憶を整理する係です。これまでの要約と新しい会話から、今後の提案に効く「この店舗について分かったこと」を、更新した要約として書き直します。
- 残すのは、店舗の方針・こだわり・強み・弱み・客層・スタッフの事情・制約・やってみた結果と反応・好む/嫌う提案の傾向。
- 一時的な雑談、挨拶、すでに終わった一回きりの作業は捨てる。古い要約と矛盾する時は新しい会話を優先する。
- 会話に無いことを足さない。箇条書き、全体で700字以内。要約本文だけを出力する。`,
    messages: [{ role: 'user', content: `【これまでの要約】\n${state.memorySummary || '（まだありません）'}\n\n【新しい会話】\n${transcript}` }],
  });
  const summary = res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim().slice(0, 1200);
  if (!summary) return;
  await supabase.from('provider_consultant_settings').upsert(
    { provider_id: provider.id, memory_summary: summary, summarized_until: msgs[msgs.length - 1].created_at, updated_at: new Date().toISOString() },
    { onConflict: 'provider_id' });
}
