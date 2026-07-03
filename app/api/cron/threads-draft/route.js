// GET /api/cron/threads-draft
// 毎日8時JST(23時UTC)に Threads 投稿の下書きを4本生成してオーナーへメール
// Schedule: "0 23 * * *"
// ⚠️ Threadsは投稿APIを持たない → 生成のみ自動・投稿は手動（でおがコピペ）
// 型は business/threads-playbook.md の5型。実数が要る①実績・⑤予告はプレースホルダ(◯)で生成
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { fetchAgentMemory, withMemory } from '@/lib/agent-memory';
import { BRAND_PHILOSOPHY } from '@/lib/brand-philosophy';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const BASE_URL = 'https://www.fineme.me';

// business/threads-playbook.md の投稿5型
// numbers: 実数が必要か（true=プレースホルダ◯を必ず残す）
const THREADS_TYPES = {
  achievement: { label: '実績数字', numbers: true },
  story:       { label: 'ゼロ→成功の物語', numbers: false },
  insight:     { label: 'AI×事業自動化・収益化の気づき/持論', numbers: false },
  behindscene: { label: '実演ログ（Fineme運用の裏側）', numbers: false },
  teaser:      { label: 'note予告・希少性', numbers: true },
};

// 週次カレンダー（threads-playbook.md）＝ 朝/昼/夕/夜 の4枠を曜日でローテ
// 実数の要る achievement/teaser は週の一部に配置し、多くの枠は実数不要の型で回す（虚偽実績を機械生成しない）
const WEEKLY_PLAN = {
  0: ['story', 'insight', 'behindscene', 'insight'],       // 日
  1: ['achievement', 'insight', 'behindscene', 'teaser'],  // 月
  2: ['story', 'insight', 'behindscene', 'story'],         // 火
  3: ['behindscene', 'insight', 'story', 'insight'],       // 水
  4: ['achievement', 'insight', 'behindscene', 'story'],   // 木
  5: ['story', 'insight', 'behindscene', 'teaser'],        // 金
  6: ['behindscene', 'insight', 'story', 'insight'],       // 土
};

const THREADS_SYSTEM = `あなたは「でお」＝元・非モテ→現役モデルで、いまはAIで自分の事業(Fineme)を丸ごと自動化・収益化している発信者。Threads(でお個人名義)の投稿を書く。

【何を発信するアカウントか】
「センスも金もスキルもなかった普通の僕が、AIで事業を自動化して稼げるようになった」というゼロ→成功ナラティブ。読者に「僕にもできるかも」と思わせ、note(有料)へ送客する。

【文体（絶対厳守・note/Threads共通のでお文体）】
・一人称は「僕」
・文末は「！」か「？」を圧倒的に多く使う。「。」は1投稿で最大2個まで
・1センテンス＝1行。必ず改行。2文を同じ行に続けない
・段落の間は空行を入れて余白を作る
・尊敬する先輩に、後輩の僕が1対1で話しかけるトーン。先生・専門家として教えない
・読者への問いかけ（〜ですよね？ 〜と思いませんか？）と自己突っ込み（〜ってなりますよね(笑)）を自然に混ぜる
・「正直に言います」「ぶっちゃけると」の本音告白を効かせる

【禁止】
・教科書的文体（〜が大切です／〜が重要です／〜しましょう）
・上から目線・講義調・「〜である」調
・過去の非モテ/ダサさを嘲笑うこと（始点は通過点。敬意を持って扱う）
・実際には無い数字を勝手に断言すること（実数は必ず「◯」プレースホルダのまま残す）

【長さ】1投稿 100〜280字程度。Threadsで読みやすい短さ。ハッシュタグは付けない（or 1個まで）。
【出力】投稿本文のみ。前置き・説明・引用符・「承知しました」等は一切不要。

${BRAND_PHILOSOPHY}
※思想は投稿の根っこに流れる温度として効かせる。上の文体ルールは引き続き厳守する。`;

function typePrompt(typeKey, recentTexts) {
  const t = THREADS_TYPES[typeKey];
  const recentLine = recentTexts?.length
    ? `\n\n【直近の投稿（言い回し・切り口を被らせない）】\n- ${recentTexts.slice(0, 6).join('\n- ')}`
    : '';

  const numbersRule = t.numbers
    ? `\n【実数の扱い（重要）】売れた部数・日数・金額・view等の具体数字は、実際の数字を僕がまだ渡していない。だから断言せず「◯部」「◯日」「◯円」のように必ず ◯ のプレースホルダで書く。あとで僕が実数を入れる。`
    : '';

  const bodies = {
    achievement: `型：「実績数字」（売れた証拠でフォロー/購入の動機を作る）
例の骨：「AIで書いたnote、公開◯日で◯部売れました！ こんな普通の僕でも…って自分が一番びっくり」`,
    story: `型：「ゼロ→成功の物語」（等身大の共感）
例の骨：「20歳の僕は顔もセンスも金もスキルもゼロだった → いまAIに事業を任せて回してる → 才能じゃなくてやり方だった」`,
    insight: `型：「AI×事業自動化・収益化の気づき/持論」（ノウハウの片鱗で"もっと知りたい"を作る）
例の骨：「AIで稼ぐのは"すごいアイデア"じゃなく、誰もやってない小さいニッチ×自動化。みんな大きい市場で消耗してるけど逆」`,
    behindscene: `型：「実演ログ（Fineme運用の裏側）」（本当に自動化してる証拠＝信頼）
例の骨：「いま僕のnoteもX投稿も、ほぼ自分で書いてない。AIが毎朝下書きを作って僕は選んで直すだけ。寝てる間に事業が進む」`,
    teaser: `型：「note予告・希少性」（販売への橋渡し）
例の骨：「AIで事業を自動化する方法、noteにまとめました！ 最初の◯部は特価、埋まったら値上げします」＋ note導線を示唆（URLは書かなくてよい）`,
  };

  return `今日のこの1本は「${t.label}」タイプで書いてください。

${bodies[typeKey]}${numbersRule}${recentLine}

上の骨はあくまで方向性。丸写しにせず、でお本人が今日思いついたように自然に書く。投稿本文のみ出力。`;
}

function extractText(content) {
  if (!Array.isArray(content)) return '';
  const texts = content.filter(b => b.type === 'text').map(b => (b.text || '').trim()).filter(Boolean);
  return texts.length ? texts[texts.length - 1] : '';
}

async function generatePost(client, system, typeKey, recentTexts) {
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      temperature: 0.92,
      system,
      messages: [{ role: 'user', content: typePrompt(typeKey, recentTexts) }],
    });
    const text = extractText(msg.content);
    return text && text.length >= 20 ? text : null;
  } catch (e) {
    console.error(`[threads-draft] gen error (${typeKey}):`, e.message);
    return null;
  }
}

async function emailDrafts(posts) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const cards = posts.map((p, i) => {
      const t = THREADS_TYPES[p.typeKey];
      const numBadge = t.numbers
        ? '<span style="font-size:11px;color:#b45309;background:#fef3c7;border-radius:6px;padding:2px 8px;margin-left:8px">◯は実数を入れてね</span>'
        : '';
      return `
        <p style="font-size:13px;font-weight:700;color:#555;margin:24px 0 6px">${i + 1}本目：${t.label}${numBadge}</p>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;font-size:15px;color:#111;line-height:1.9;white-space:pre-line">${(p.text || '').replace(/</g, '&lt;')}</div>`;
    }).join('\n');

    const html = `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto">
        <h2 style="color:#111;font-size:20px;margin:0 0 4px">🧵 本日のThreads下書き（4本）</h2>
        <p style="color:#666;font-size:13px;margin:0 0 4px">Threadsは自動投稿できないので、下をコピーして手動で投稿してください（朝/昼/夕/夜の4本）。</p>
        <p style="color:#999;font-size:12px;margin:0 0 8px">運用テンプレ：business/threads-playbook.md ／ プロフィールに note リンクを設定。</p>
        ${cards}
        <p style="font-size:12px;color:#999;margin:24px 0 0">※「◯」が入っている投稿は、実際の部数・日数などの数字に置き換えてから投稿してください（虚偽の数字は書かない）。</p>
      </div>`;

    await resend.emails.send({
      from: 'Fineme Threads <noreply@fineme.me>',
      to: OWNER_EMAIL,
      subject: '【Fineme Threads】本日の下書き4本（手動投稿）',
      html,
    });
  } catch (e) {
    console.error('[threads-draft] email error:', e.message);
  }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const memory = await fetchAgentMemory();
  const system = withMemory(THREADS_SYSTEM, memory);

  // 被り回避：直近の threads 投稿を読む
  const sb = getSupabase();
  let recentTexts = [];
  try {
    const { data: recent } = await sb.from('sns_posts')
      .select('text').eq('channel', 'threads')
      .order('created_at', { ascending: false }).limit(12);
    recentTexts = (recent || []).map(r => r.text).filter(Boolean);
  } catch {}

  const dow = new Date().getUTCDay();
  const plan = WEEKLY_PLAN[dow] || ['story', 'insight', 'behindscene', 'insight'];

  const posts = [];
  for (const typeKey of plan) {
    const text = await generatePost(client, system, typeKey, [...recentTexts, ...posts.map(p => p.text)]);
    if (text) posts.push({ typeKey, text });
  }

  if (!posts.length) {
    return Response.json({ error: 'no drafts generated' }, { status: 500 });
  }

  // 記録（被り回避のため channel='threads' で保存・posted:false）
  try {
    for (const p of posts) {
      await sb.from('sns_posts').insert({ channel: 'threads', post_type: p.typeKey, text: p.text, posted: false });
    }
  } catch {}

  await emailDrafts(posts);

  console.log(`[threads-draft] Sent ${posts.length} drafts. types=${plan.join(',')}`);
  return Response.json({ success: true, count: posts.length, types: plan, emailed: !!process.env.RESEND_API_KEY });
}
