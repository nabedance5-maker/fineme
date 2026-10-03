// AI専属コンサルのプロンプト部品。計画生成とチャットで同じ前提・同じ材料を使う。
import { insightForPrompt, TAB_LABELS, STAGES } from '@/lib/consultant-insight';
import { memoryForPrompt } from '@/lib/consultant-memory';

const CATEGORY_LABELS = {
  consulting: 'コンサルティング', gym: 'ジム・トレーニング', makeup: 'メイク', hair: '美容室・ヘアサロン',
  diagnosis: '診断', fashion: 'ファッション', photo: '写真', marriage: '結婚相談', eyebrow: '眉サロン',
  hairremoval: '脱毛', esthetic: 'エステ', whitening: 'ホワイトニング', orthodontics: '矯正歯科',
  nail: 'ネイル', aga: 'AGAクリニック',
};

export const STAGE_KEYS = STAGES.map(s => s.key);

export const CONSULTANT_ROLE = `あなたはFineme（ファインミ）に組み込まれた、店舗専属の経営コンサルタントです。単なる操作案内や設定チェックリストの案内役ではありません。
店舗が「自分の言葉で書いたゴール」と、実際の来店・売上・予約・スタッフのデータ、今日の日付と時期を材料に、その店舗だけの戦略と日々の作業を考えます。
大前提は「リピートしてくれるお客様を増やす」ことです（新規集客は他のサービスに任せる前提。他サービスの名前を出さず、批判せず、広告費の話もしない）。
あわせて、店長だけでなくスタッフ一人一人が、お客様のために使える時間を作れるよう、業務の無駄を減らす観点も持ちます。

考え方の原則：
- ゴールから逆算する。「ゴールに近づくために、日々・毎週・毎月どんな行動が要るか」を具体的に出す。Fineme の設定作業を終えること自体は目的ではない。その作業が本当にゴールの役に立つ時だけ、手段として提案する。Fineme の設定が未完了でも、それだけを理由に提案を埋めない。
- お客様は一律ではない。段階（2回目を逃しかけ／常連が間隔超過／休眠など）ごとに打ち手が違う。人数が多い段階、機会損失が大きい段階から手を打つ。時間が経てば人は段階を移るので、今日の状況に合わせて考える。
- 今の時期を使う。月初・月末、曜日の偏り、季節や行事（長期休暇前、新生活、年末年始、花粉・乾燥・暑さ寒さなど店舗の業種に関係するもの）を踏まえ、「今月のこの時期だからやること」を入れる。
- スタッフの役割も固定の型に頼らず、登録されているスタッフの名前・役職を見て、誰が何を担うと店全体の時間が生まれるかを考える。
- データが少ない・分からないことは、断定せず「見えている範囲では」と前置きし、必要なら質問を返す。実データに無い数字・出来事を作らない。見えているのは Fineme 上の来店記録・売上記録・予約だけで、店舗の全体ではない。
- 一つ一つの作業は、誰が・いつ・何をするかが分かる粒度にする。「関係を深める」のような抽象語で終わらない。
- この店舗について積み上がった知識（過去の相談の要約・ゴールの変遷・過去の見立て・タスクの実績）がある時は必ず踏まえる。同じことを聞き直さない。続かなかったタイプのタスクは小さくするか変え、続いたやり方は伸ばす。店舗が嫌った提案は繰り返さない。
- 文章では「客」と書かず「お客様」と書く（集客・顧客・接客の語は可）。他社サービスの固有名詞は出さない。絵文字は使わない。やさしく実務的な日本語で。`;

export function buildContext(state, provider) {
  const cat = CATEGORY_LABELS[provider.main_category] || provider.main_category || '不明';
  const openTasks = state.tasks.filter(t => t.status === 'open');
  const taskLine = t => `- [id:${t.id}] (${cadenceJa(t.cadence)}${t.due_date ? `・期限${t.due_date}` : ''}) ${t.title}`;
  const done = state.tasks.filter(t => t.status === 'done').slice(0, 12).map(t => `- ${t.title}`).join('\n') || '（まだありません）';
  const bn = state.bottlenecks.filter(b => b.status === 'open').map(b => `- ${b.label}${b.minutes_per_week ? `（週${b.minutes_per_week}分）` : ''}`).join('\n') || '（まだ聞けていません）';
  return `店舗名：${provider.name} / 業種：${cat}

【店舗のゴール（店舗自身の言葉）】
${state.goalText || '（まだ書かれていません）'}

【これまでの会話で分かった店舗の事実】
${state.facts.length ? state.facts.map(f => `- ${f}`).join('\n') : '（まだありません）'}${memoryForPrompt(state)}

${insightForPrompt(state.insight, state.ctx)}

【時間を取られている作業（ヒアリング済み）】
${bn}

【いま未完了のタスク】
${openTasks.length ? openTasks.map(taskLine).join('\n') : '（なし）'}

【最近できたこと】
${done}`;
}

export function cadenceJa(c) {
  return { daily: '毎日', weekly: '毎週', monthly: '毎月', once: '単発' }[c] || c;
}

export function tabGuide() {
  return Object.entries(TAB_LABELS).map(([k, v]) => `${k}=${v}`).join(' / ');
}
