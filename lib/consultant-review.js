// AIによる導入設定の定期の見直し（2026-11-13 渡邉要望）。
// はじめの質問の答え（業態・規模・運営・目的・負担）・今の機能のオン/オフと使われ方・道筋の数字の動き・タスクと声かけの結果から、
// 「この期間に何が動いたか」「今の設定がお店に合っているか」「次の期間に何に絞るか」をAIが振り返る。
// 間隔はお店が選ぶ（1/3/6/12か月、既定3か月）。期限が来たら、AIコンサルの画面を開いた時に作る。
// 機能の提案は、存在する機能キーで・今のプランで使えるものだけ残す（AIが無い機能を勧めないように）。
import { FEATURE_DEFS, planAllows, resolveFeatures } from '@/lib/feature-flags';
import { normalizeAnswers, answersText } from '@/lib/onboarding';
import { freeJson } from '@/lib/ai';

export const INTERVALS = [1, 3, 6, 12];
const REPEAT_FEATURES = ['dormant_outreach', 'review_request', 'line_channel', 'customer_packages', 'membership_enrollment', 'referral_program'];
export const DEFAULT_INTERVAL = 3;
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

export function nextReviewDate({ interval, lastReviewAt, onboardedAt, createdAt }) {
  const base = lastReviewAt || onboardedAt || createdAt;
  return base ? addMonths(base, interval || DEFAULT_INTERVAL) : null;
}

export async function reviewMaterial(db, provider, state) {
  const since = state.lastReview?.created_at || state.onboarding?.completed_at || provider.created_at || new Date(Date.now() - 90 * 86400000).toISOString();
  const [{ data: tasks }, { data: prov }] = await Promise.all([
    db.from('provider_consultant_tasks').select('title, status, cadence, created_at, done_at').eq('provider_id', provider.id).gte('created_at', since).limit(300),
    db.from('providers').select('enabled_features, plan').eq('id', provider.id).single(),
  ]);
  const feats = resolveFeatures(prov || provider);
  const featLines = Object.entries(FEATURE_DEFS).map(([k, d]) => `- ${k}（${d.label}）：${feats[k] ? 'オン' : 'オフ'}${planAllows(prov || provider, k) ? '' : '・今のプランでは使えない'}`).join('\n');
  const done = (tasks || []).filter(t => t.status === 'done');
  const skipped = (tasks || []).filter(t => t.status === 'skipped');
  const rm = state.plan?.strategy?.roadmap;
  return `【はじめの質問への答え（導入時）】\n${state.onboarding?.answers ? answersText(normalizeAnswers(state.onboarding.answers)) : '（まだ答えていない）'}
【前回の見直し】${state.lastReview ? `${String(state.lastReview.created_at).slice(0, 10)}：${state.lastReview.content?.summary || ''}` : '（初めての見直し）'}
【この期間】${String(since).slice(0, 10)} 〜 今日
【機能のオン/オフ（キー・名前）】\n${featLines}
【この期間のAIコンサルのタスク】できた ${done.length}件・見送り ${skipped.length}件\nできた例：${done.slice(0, 6).map(t => t.title).join('／') || 'なし'}\n見送った例：${skipped.slice(0, 6).map(t => t.title).join('／') || 'なし'}
【今の道筋】${rm?.kpi ? `${rm.kpi}：決めた時 ${rm.current} → 目標 ${rm.target}${rm.deadline ? `（${rm.deadline}まで）` : ''}` : '（まだ無い）'}`;
}

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'この期間の振り返り。数字がどう動いたか・何が効いて何が効かなかったか（3〜4文）' },
    fit: { type: 'string', description: '導入時の答え・今の使い方・数字から見て、今の設定と運用がお店に合っているか（2〜3文）' },
    feature_changes: {
      type: 'array', description: 'オン/オフを変えた方がいい機能（最大4）。キーは【機能のオン/オフ】にあるものだけ。今のプランで使えないものは出さない',
      items: { type: 'object', properties: { key: { type: 'string' }, on: { type: 'boolean' }, reason: { type: 'string', description: 'このお店のどの数字・答え・使われ方から（一文）' } }, required: ['key', 'on', 'reason'] },
    },
    reask: { type: 'array', items: { type: 'string' }, description: '導入時から変わっていそうで、答え直してほしいこと（例：スタッフの人数・予約の受け方・目的）。最大3' },
    next_focus: { type: 'string', description: '次の見直しまでに絞ること（2文）' },
  },
  required: ['summary', 'fit', 'next_focus'],
};

export async function generateReview(db, provider, state, contextText) {
  const material = await reviewMaterial(db, provider, state);
  const out = await freeJson({
    system: `あなたはFineme（ファインミ）の店舗専属コンサルタントです。今回の仕事は、導入時の設定と運用を定期的に見直すことです。
このお店の数字・答え・使われ方を根拠にし、どのお店にも当てはまる一般論は書かない。データが少ない時は正直にそう書く。
使っていない機能を無理に勧めない（お店の目的と数字に効く時だけオンを勧める）。
オフの提案は、業態・導入時の答えと合わない機能だけ（例：グループレッスンをしていないのにグループレッスンがオン、ロッカーが無いのにロッカー管理がオン）。
リピートに効く機能（休眠の声かけ・クチコミのお願い・お店のLINE・回数券・会員プラン・紹介）は、使われていないだけを理由にオフにしない。使い始め方を next_focus に書く。
文章では「客」でなく「お客様」。絵文字・他社の名前は使わない。`,
    messages: [{ role: 'user', content: `${contextText}\n\n${material}\n\n見直しの結果を JSON で返してください。` }],
    schema: SCHEMA,
    max_tokens: 2500,
    budget_ms: 100000,
  });
  const prov = (await db.from('providers').select('enabled_features, plan').eq('id', provider.id).single()).data || provider;
  const feats = resolveFeatures(prov);
  const changes = (Array.isArray(out.feature_changes) ? out.feature_changes : [])
    .filter(c => c && c.key in FEATURE_DEFS && typeof c.on === 'boolean' && c.key !== 'ai_consultant' && planAllows(prov, c.key) && !!feats[c.key] !== c.on)
    // リピートに効く機能は、AIが「使われていない」だけでオフを勧めても採らない
    .filter(c => c.on || !REPEAT_FEATURES.includes(c.key))
    .slice(0, 4).map(c => ({ key: c.key, label: FEATURE_DEFS[c.key].label, on: c.on, reason: String(c.reason || '').slice(0, 200) }));
  const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  return {
    summary: clip(out.summary, 800), fit: clip(out.fit, 600), next_focus: clip(out.next_focus, 400),
    feature_changes: changes, reask: (Array.isArray(out.reask) ? out.reask : []).map(x => clip(x, 120)).filter(Boolean).slice(0, 3),
  };
}
