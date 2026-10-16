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
- 「店舗の操作の記録」がある時は、店舗の実際の動き方として使う。忙しい時間帯を避けてタスクの時間を決める、同じ操作の繰り返しが続いていれば効率化できる機能や手順を提案する、使われていない機能は店舗に合うと思う時だけ勧める。操作の件数だけで店舗の頑張りや怠慢を決めつけない（記録は Fineme 上の操作に限る）。特定のスタッフを責める言い方はしない。
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

${insightForPrompt(state.insight, state.ctx)}${state.activity ? `\n\n${state.activity}` : ''}

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

// 画面の名前だけだとAIが取り違える（でお指摘 2026-10-16：「LINE連携中の2人へ送信」の作業が、
// お店のLINEをつなぐ設定画面「LINE連携」に飛んでいた）。主な画面は「そこで何をするか」も渡す。
const TAB_PURPOSE = {
  customers: 'お客様一覧と顧客情報。1人ずつの声かけ（LINE・メッセージの送信）、カルテ、担当、回数券の確認はここ',
  'broadcast-email': '絞り込んだお客様へのメールの一斉送信',
  'line-channel': 'お店のLINE公式アカウントをFinemeにつなぐ設定だけの画面。お客様へのメッセージ送信はここではしない',
  scripts: '今日来るお客様ごとの接客メモ・会計時の次回の一言・次回予約',
  calendar: '予約の確認・手入力・変更',
  requests: '届いた予約リクエストの承認・代替提案',
  reviews: 'クチコミのお願いの設定と状況',
  'visit-settings': '来店周期の目安や休眠と判断する日数の設定',
  packages: '回数券の発行・残り回数',
  sales: '売上の記録と集計',
  shift: 'シフトの作成・確定',
  stats: '数字の概況',
};

export function tabGuide() {
  return Object.entries(TAB_LABELS).map(([k, v]) => `${k}=${v}${TAB_PURPOSE[k] ? `（${TAB_PURPOSE[k]}）` : ''}`).join(' / ');
}

// 送信・声かけの作業なのに、LINEの接続設定画面が選ばれていたら顧客管理へ直す（AIの取り違えの保険）
export function fixTaskTab(title, tab) {
  const t = String(title || '');
  if (tab === 'line-channel' && /送信|送る|送って|声かけ|声を?かけ|メッセージ|連絡|お知らせ/.test(t) && !/(連携|つな|接続|設定|チャネル|トークン)(する|して|を|の)/.test(t)) return 'customers';
  return tab;
}
