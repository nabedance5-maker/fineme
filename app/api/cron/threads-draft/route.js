// GET /api/cron/threads-draft
// 毎日8時JST(23時UTC)に Threads「AI経営」スレッド下書きを生成してオーナーへメール
// Schedule: "0 23 * * *"
// ⚠️ Threadsは投稿APIを持たない → 生成のみ自動・投稿は手動（でおがコピペ）
// コンセプト「AI会社の経営日誌」。ターゲット=AI中級者。1パッケージ=本文+リプ①+リプ②+編集長メモ。
// 仕様SSoT：business/threads-ai-keiei-spec.md ／ 一次情報：data/threads-facts.json
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { fetchAgentMemory, withMemory } from '@/lib/agent-memory';
import { BRAND_PHILOSOPHY } from '@/lib/brand-philosophy';
import THREADS_FACTS from '@/data/threads-facts.json';
import { threadsAutopostEnabled, publishThread, getUserInsights } from '@/lib/threads-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

// カテゴリ（比率 価値提供70% / AI経営日誌20% / note誘導10%）
const CATEGORIES = {
  value: { label: '価値提供（中級者の盲点・新視点）' },
  diary: { label: 'AI経営日誌（今日AI社員がやった/失敗/改善）' },
  note:  { label: 'note誘導（好奇心ギャップ→プロフ）' },
};

// 曜日×3枠の週次プラン ≈ 70/20/10（週21枠：value15 / diary4 / note2）
const WEEKLY_PLAN = {
  0: ['value', 'value', 'diary'], // 日
  1: ['value', 'value', 'note'],  // 月
  2: ['value', 'value', 'diary'], // 火
  3: ['value', 'value', 'value'], // 水
  4: ['value', 'value', 'note'],  // 木
  5: ['value', 'value', 'diary'], // 金
  6: ['value', 'value', 'diary'], // 土
};

// value（70%枠）の切り口プール。同日に value が複数入る日でも被らせない
const VALUE_ANGLES = [
  '権限設計＝提案/判断/承認/実行の4つを分ける',
  'AIに"役職"を与えて組織にする発想',
  '定時起動で"自分が起点"をやめる設計',
  '失敗した自動化構造から学んだこと',
  '「効率化」と「AIに経営させる」の決定的な違い',
  '人間が最後に残す仕事＝承認と方向づけだけ',
  'AI社員に"監査役(懐疑役)"を置く理由',
  'コスト/時間でなく"自分が抜けられるか"で設計する',
  'AIの出力がブレる本当の原因＝前提(引き継ぎ)の設計不足',
  '事業を止めないための"承認フロー"の作り方',
];

// 一次情報を鮮度づけて取り出す（seeds=でお生ネタ最優先 → facts → 無ければ空）
function pickPrimarySource(dayOffset = 0) {
  const seeds = Array.isArray(THREADS_FACTS.seeds) ? THREADS_FACTS.seeds.filter(Boolean) : [];
  const facts = Array.isArray(THREADS_FACTS.facts) ? THREADS_FACTS.facts.filter(Boolean) : [];
  // 日替わりで facts を回す（同じ事実ばかりにならないよう）
  const rotated = facts.length
    ? facts.slice(dayOffset % facts.length).concat(facts.slice(0, dayOffset % facts.length))
    : [];
  return { seeds, facts: rotated };
}

const THREADS_SYSTEM = `あなたは日本トップクラスのThreads編集長。書き手は「でお」＝非エンジニアのまま、AIに自分の会社(Fineme)を"経営させて"いる人。この人の名義でThreadsのスレッド投稿を設計する。

【アカウントの正体】
・AI活用アカウントでも、Claude Code紹介アカウントでもない。テーマは「AI経営」＝AIを"使う"のではなく、AIに"会社を経営させる"。
・コンセプトは「AI会社の経営日誌」。今日AI社員が何をしたか／失敗したか／改善したか／AI役員会で何を決めたか、のリアルを出す。

【ターゲット（初心者向けは禁止）】
・Claude Code / MCP / AI Agent / Cursor を触っている中級者。
・でも「自分がAIを操作して働いている」「便利ツール止まり」「事業が自動化・収益化できていない」「AIを"社員"にできていない」層。
・伝えたい一言：「AIを"使う側"から、AIに"働かせる側"へ」。

【最重要（売れる原理・全投稿に貫通）】
・読者の"悩みから逆算"して書く（自分の言いたいことでなく）。中級者の盲点（AI作ったのに自分が一番働いてる 等）を突く。
・売るのは情報でなく"変われる未来"＝「自分が現場から抜けて、AIに経営させる側になる」姿を見せる。
・読者の言葉で書く（現場感のある具体語）。抽象論・きれいごと・自己啓発ポエムにしない。

【最終ゴール】インプレでなく、プロフクリック・保存・コメント・note購入。だから「保存したくなる/プロフを見たくなる/コメントしたくなる」設計を最優先する。

【投稿構造（スレッド・厳守）】
■本文：①最初の2行でスクロールを止めるフック（違和感・断定・痛点／中級者が"自分のことだ"と思う）→ ②違和感 → ③共感 → ④新しい考え方の提示 → ⑤答えを最後まで書かない → ⑥最後は「続きはリプ👇」で終える。
■リプ①：本文の"答え"。読むだけで学べる・保存したくなる価値提供。
■リプ②：自然にプロフィールへ誘導。noteは直接売らない。本文にもリプにもURLを貼らない。「プロフ(固定)を見て」に寄せる。

【文体（厳守）】短文。改行多め。一文40字以内。断言。テンポ良く。前置きなし。スマホで一気に読める塊。

【一次情報を優先（AIは編集者）】与えられた"生ネタ/事実"を素材に構造化する。一次情報が無い時だけ一般論。実際に無い数字は捏造せず「◯」で残す。

【絶対ガードレール】
・嘘・数字の捏造をしない（実数は「◯」）。読者や過去の自分を嘲笑わない。
・実際のスタックは Claude Code。Make/Zapier/n8n等の外部ノーコードツールを"使ってる"と書かない。
・日本語（かな/カナ/漢字）＋半角英数・一般記号のみ。外国語スクリプト(ハングル等)を混ぜない。
・禁止：初心者向けAI活用術／便利ツール紹介／AIニュース／ChatGPTの使い方／プロンプト集／抽象論だけ／内容の薄い自己啓発／ポエム／販売の押し売り。

${BRAND_PHILOSOPHY}
※思想は投稿の根に流れる温度として効かせる。上のルールは厳守。`;

function categoryPrompt(category, primary, recentTexts, strategy, angle) {
  const c = CATEGORIES[category];
  const seedLine = primary.seeds.length
    ? `\n【今日の生ネタ（でお提供・最優先で使う）】\n- ${primary.seeds.slice(0, 3).join('\n- ')}`
    : '';
  const factLine = primary.facts.length
    ? `\n【使える一次情報（Fineme実運用の事実・ここから鮮度づけて使う）】\n- ${primary.facts.slice(0, 6).join('\n- ')}`
    : '';
  const stratLine = strategy
    ? `\n【今週の方針（前週の反応から・参考）】\n${strategy}`
    : '';
  const recentLine = recentTexts?.length
    ? `\n【直近の投稿（フック・切り口・締めを絶対に被らせない）】\n- ${recentTexts.slice(0, 8).join('\n- ')}`
    : '';

  const focus = {
    value: `カテゴリ：価値提供（70%枠）。中級者の"盲点"を突く新視点を1つ。${angle ? `\n★今日のこの1本の切り口＝「${angle}」に絞る（直近の投稿と角度を変える）。` : ''}
狙い：保存されること。中級者の痛点（例：AIを作ったのに自分が一番働いてる）から逆算→AIに経営させる側の考え方へ。`,
    diary: `カテゴリ：AI経営日誌（20%枠）。一次情報（生ネタ/事実）から"今日のAI会社のリアル"を1つ。
狙い：この人ホンモノだ、と思わせる信頼。AI社員がやったこと/失敗/改善/AI役員会で決めたこと、を現場の温度で。`,
    note: `カテゴリ：note誘導（10%枠）。価値提供の延長で、続き・全体像を"プロフの固定"に置いてある、と好奇心ギャップで示す。
狙い：プロフクリック。★直接売らない・URL貼らない・値段や「買って」は書かない。リプ②で「固定を見て」に寄せる。`,
  };

  return `今回の1パッケージは「${c.label}」を書いてください。

${focus[category]}
${seedLine}${factLine}${stratLine}${recentLine}

【出力形式（この見出しを必ずこの順で・過不足なく）】
■投稿本文
（フック2行→違和感→共感→新視点→答えは書かず→最後の行は「続きはリプ👇」）
■リプ①
（本文の答え・保存したくなる価値提供）
■リプ②
（自然にプロフ誘導・noteは直接売らない・URLなし）
■投稿の狙い
（この投稿で何を取りにいくか＝保存/プロフ/コメントのどれか）
■なぜこのフック
（1行目でスクロールが止まる理由）
■想定コメント
（読者が付けそうなコメントを2つ）

本文とリプは"読者の悩みから逆算"し、短文・断言・一文40字以内。前置き・説明・「承知しました」等は書かない。`;
}

function extractText(content) {
  if (!Array.isArray(content)) return '';
  const texts = content.filter(b => b.type === 'text').map(b => (b.text || '').trim()).filter(Boolean);
  return texts.length ? texts[texts.length - 1] : '';
}

// 稀に混入する非日本語スクリプト（ハングル等）を除去（日本語本文には出現しない）
function stripStrayScripts(s) {
  if (!s) return s;
  const cleaned = s.replace(/[가-힣ᄀ-ᇿ㄰-㆏ꥠ-꥿ힰ-퟿]/g, '');
  return cleaned.replace(/[ \t]{2,}/g, ' ');
}

// ラベル区切りでパッケージを分解
const SECTION_KEYS = [
  ['body', '■投稿本文'],
  ['reply1', '■リプ①'],
  ['reply2', '■リプ②'],
  ['aim', '■投稿の狙い'],
  ['hook', '■なぜこのフック'],
  ['comments', '■想定コメント'],
];
function parsePackage(raw) {
  const out = {};
  const labels = SECTION_KEYS.map(k => k[1]);
  for (let i = 0; i < SECTION_KEYS.length; i++) {
    const [key, label] = SECTION_KEYS[i];
    const start = raw.indexOf(label);
    if (start < 0) { out[key] = ''; continue; }
    const after = start + label.length;
    // 次のラベルまで
    let end = raw.length;
    for (const nl of labels) {
      const n = raw.indexOf(nl, after);
      if (n >= 0 && n < end) end = n;
    }
    let seg = raw.slice(after, end).replace(/^[\s:：]*\n?/, '').trim();
    // 見出し前後に混入する区切り線(---)を除去（コピペ時のノイズ回避）
    seg = seg.replace(/^(?:\s*-{3,}\s*\n?)+/, '').replace(/(?:\n?\s*-{3,}\s*)+$/, '').trim();
    out[key] = stripStrayScripts(seg);
  }
  return out;
}

async function generatePackage(client, system, category, primary, recentTexts, strategy, angle) {
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      temperature: 0.9,
      system,
      messages: [{ role: 'user', content: categoryPrompt(category, primary, recentTexts, strategy, angle) }],
    });
    const raw = extractText(msg.content);
    if (!raw) return null;
    const pkg = parsePackage(raw);
    if (!pkg.body || pkg.body.length < 20) return null;
    return { category, ...pkg };
  } catch (e) {
    console.error(`[threads-draft] gen error (${category}):`, e.message);
    return null;
  }
}

async function emailPackages(packages, posted = 0) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const esc = s => (s || '').replace(/</g, '&lt;');
    const copyBox = (label, text) => `
      <p style="font-size:12px;font-weight:700;color:#555;margin:12px 0 4px">${label}（コピー）</p>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;font-size:15px;color:#111;line-height:1.85;white-space:pre-line">${esc(text)}</div>`;

    const cards = packages.map((p, i) => `
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin:0 0 22px;background:#fafafa">
        <p style="font-size:13px;font-weight:800;color:#111;margin:0 0 6px">${i + 1}本目：${CATEGORIES[p.category].label}</p>
        ${copyBox('本文', p.body)}
        ${copyBox('リプ①', p.reply1)}
        ${copyBox('リプ②', p.reply2)}
        <div style="background:#eef6ff;border:1px solid #cfe3ff;border-radius:8px;padding:12px 14px;margin:12px 0 0;font-size:12px;color:#334">
          <b>狙い：</b>${esc(p.aim)}<br><b>なぜこのフック：</b>${esc(p.hook)}<br><b>想定コメント：</b>${esc(p.comments)}
        </div>
      </div>`).join('\n');

    const html = `
      <div style="font-family:sans-serif;max-width:660px;margin:0 auto">
        <h2 style="color:#111;font-size:20px;margin:0 0 4px">🧵 本日のThreads「AI経営」スレッド（${packages.length}本）</h2>
        <p style="color:#666;font-size:13px;margin:0 0 4px">${posted > 0
          ? `✅ うち ${posted} 本は Threads API で<b>自動投稿済み</b>（記録用）。`
          : '各パッケージ＝本文→リプ①→リプ②の順で手動投稿（本文を投稿→自分の投稿にリプでぶら下げる）。'}</p>
        <p style="color:#999;font-size:12px;margin:0 0 8px">狙う指標：保存・プロフクリック・コメント・note購入（フォロワー数は追わない）。仕様：business/threads-ai-keiei-spec.md</p>
        ${cards}
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin:8px 0 0">
          <p style="font-size:13px;font-weight:700;color:#9a3412;margin:0 0 6px">📈 今週の検証（1〜2行でOK・返信 or data/threads-facts.json に追記）</p>
          <p style="font-size:12px;color:#7c2d12;margin:0">・保存が多かった投稿は？ ・プロフに飛ばせた投稿は？ ・コメントが付いた投稿は？<br>→ 次週の生成が"効いた切り口"を厚くします。</p>
        </div>
        <p style="font-size:12px;color:#999;margin:16px 0 0">※「◯」は実数に置き換えてから投稿（虚偽の数字は書かない）。プロフの固定＝最も保存された投稿 or note入口に。</p>
      </div>`;

    await resend.emails.send({
      from: 'Fineme Threads <noreply@fineme.me>',
      to: OWNER_EMAIL,
      subject: `【Fineme Threads】本日のAI経営スレッド${packages.length}本（本文＋リプ2）`,
      html,
    });
  } catch (e) {
    console.error('[threads-draft] email error:', e.message);
  }
}

// 日曜：でおのfeedback（threads-facts.json）＋直近投稿から「来週の方針」を作り保存（自走PDCA）
async function maybeUpdateStrategy(client, system, sb, recentTexts) {
  const feedback = Array.isArray(THREADS_FACTS.feedback) ? THREADS_FACTS.feedback.filter(Boolean) : [];
  if (!feedback.length) return; // 生の反応が無ければ据え置き
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      temperature: 0.5,
      system,
      messages: [{ role: 'user', content: `【前週の反応メモ（でお）】\n- ${feedback.join('\n- ')}\n\n【直近の投稿】\n- ${recentTexts.slice(0, 8).join('\n- ')}\n\nこの反応から、来週のThreads方針を「効いた切り口を厚く／外れた切り口を減らす」の観点で、箇条書き3〜5行で簡潔に。断定で。前置き不要。` }],
    });
    const text = stripStrayScripts(extractText(msg.content));
    if (text && text.length > 10) {
      await sb.from('sns_posts').insert({ channel: 'threads_strategy', post_type: 'weekly', text, posted: true });
    }
  } catch (e) {
    console.error('[threads-draft] strategy update error:', e.message);
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

  const sb = getSupabase();
  // 被り回避＋PDCA方針の読み込み
  let recentTexts = [], strategy = null;
  try {
    const { data: recent } = await sb.from('sns_posts')
      .select('text').eq('channel', 'threads')
      .order('created_at', { ascending: false }).limit(12);
    recentTexts = (recent || []).map(r => r.text).filter(Boolean);
    const { data: strat } = await sb.from('sns_posts')
      .select('text').eq('channel', 'threads_strategy')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    strategy = strat?.text || null;
  } catch {}

  const debug = new URL(request.url).searchParams.get('debug') === '1';
  const dow = new Date().getUTCDay();
  const plan = WEEKLY_PLAN[dow] || ['value', 'value', 'diary'];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);

  // 同日に value が複数入っても切り口を分けるため、value出現順に別angleを割り当て
  let valueSeen = 0;
  const packages = [];
  for (let idx = 0; idx < plan.length; idx++) {
    const primary = pickPrimarySource(dayOfYear + idx);
    let angle = null;
    if (plan[idx] === 'value') {
      angle = VALUE_ANGLES[(dayOfYear + valueSeen) % VALUE_ANGLES.length];
      valueSeen++;
    }
    const pkg = await generatePackage(
      client, system, plan[idx], primary,
      [...recentTexts, ...packages.map(p => p.body)], strategy, angle,
    );
    if (pkg) packages.push(pkg);
  }

  if (!packages.length) {
    return Response.json({ error: 'no packages generated' }, { status: 500 });
  }

  if (debug) {
    return Response.json({ success: true, categories: plan, strategy, packages });
  }

  // 記録（被り回避のため channel='threads' に本文を保存）
  try {
    for (const p of packages) {
      await sb.from('sns_posts').insert({ channel: 'threads', post_type: p.category, text: p.body, posted: false });
    }
  } catch {}

  // ★自動投稿（THREADS_AUTOPOST=1 の時だけ発火。未設定なら従来どおりメール下書きのみ）
  let posted = 0;
  if (threadsAutopostEnabled()) {
    let followersAt = null;
    try { followersAt = (await getUserInsights())?.followers_count ?? null; } catch {}
    for (const p of packages) {
      try {
        const mediaId = await publishThread({ body: p.body, reply1: p.reply1, reply2: p.reply2 });
        posted++;
        try {
          await sb.from('threads_posts').insert({
            media_id: mediaId, category: p.category,
            body: p.body, reply1: p.reply1, reply2: p.reply2,
            followers_at: followersAt,
          });
        } catch (e) { console.error('[threads-draft] threads_posts insert error:', e.message); }
      } catch (e) {
        console.error('[threads-draft] autopost error:', e.message);
      }
    }
  }

  // 自走PDCA：日曜はでおのfeedbackから来週方針を更新
  if (dow === 0) await maybeUpdateStrategy(client, system, sb, recentTexts);

  await emailPackages(packages, posted);

  console.log(`[threads-draft] ${packages.length} packages, autoposted=${posted}. cats=${plan.join(',')}`);
  return Response.json({ success: true, count: packages.length, autoposted: posted, categories: plan, emailed: !!process.env.RESEND_API_KEY });
}
