// GET /api/cron/note-money-draft
// 収益note（有料note販売ライン）の本文ドラフトをAIが書いてオーナーへメール
// Schedule: "0 0 * * 5"（金9時JST）— 水のnote-draft(集客)とは別ライン
// mode: front（既定・「AIで事業を自動化・収益化する方法」＝結果不要の汎用ノウハウ）
//       main （?mode=main・「AI×外見磨き(=Fineme)で収益化した方法」＝実数はプレースホルダ）
// 設計：business/note-threads-strategy.md / note-front-draft.md / note-main-draft.md
import Anthropic from '@anthropic-ai/sdk';
import { fetchAgentMemory, withMemory } from '@/lib/agent-memory';
import { BRAND_PHILOSOPHY } from '@/lib/brand-philosophy';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const BASE_URL = 'https://www.fineme.me';

// フロント（結果不要の汎用AI収益化ノウハウ）のテーマローテ
const FRONT_TOPICS = [
  '顔もセンスもお金もなかった僕が、AIに事業を丸ごと動かしてもらってる話',
  'プログラミング未経験の僕が、AIで"自動で回る事業"を作るためにやったこと',
  '寝てる間に事業が進む。個人がAIで事業を自動化・収益化する現実的な手順',
  '"すごいアイデア"はいらない。誰でもAIで小さく稼ぎ始めるための設計図',
  'AIに任せる仕事・自分でやる仕事の線引き｜個人事業を自動化する考え方',
];

// メイン（Fineme=AI×外見磨きで収益化した方法・実数はプレースホルダ）
const MAIN_TOPICS = [
  '誰もやってない『AI×外見磨き』でnoteを収益化した全手順を公開します',
  '"競合ゼロのニッチ" × AI で個人事業を作ったら、こうなった｜収益化の裏側',
  '大きい市場で消耗するのをやめた。ニッチ×AIで"勝てる場所"を作る方法',
];

// でお文体ルール（note-draft と同じ呼吸感）＋ 収益note向けの立場
const STYLE_RULES = `【この文章の根本的な立場（最重要）】
「尊敬している先輩（読者）に向かって、自分の失敗と成功体験を交えながら、"あなたにもできる"を熱心に共有する後輩」として書く。先生でも専門家でもない。読者を上に置く。知識を配るのではなく、体験を共有する。読者が最後に「なるほど」ではなく「ちょっとやってみようかな」で終わる記事を書く！

【文末ルール（絶対厳守）】
・すべての文末は「！」か「？」で終わる。「。」は1記事で最大3個まで
・NG：「〜することが大切です。」→ OK：「〜が大事なんですよ！」

【改行ルール（絶対厳守）】
・1センテンス＝1行。必ず改行。2センテンスを同じ行に続けない
・段落の間は必ず空行。短い文を連続させてリズムを作る

【文体の原則】
・一人称は「僕」。後輩目線（「僕も昔そうだったんですよ」）
・失敗を材料にする（モテなかった・ダサかった・遠回りした。恥ではなく材料）
・提案型（命令しない。「こういう考え方もあると思うんです！」）
・自己突っ込み（「お前誰やねん(笑)」）で自分をいじる。読者を攻撃しない
・応援文体：読者に「あ、自分も変われる/稼げるかも！」と思わせるのがゴール

【絶対禁止】
・教科書的文体（〜が大切です／〜が重要です／〜しましょう）・上から目線・「〜である」調
・長い段落（3文以上を同じ段落に入れない）
・過去の非モテ/ダサさを嘲笑うこと（始点は通過点・敬意を持つ）`;

// ── 売れている有料note／セールスレターの型を移植（構造のみ・表現の丸写しはしない）──
// 出典：ロールモデル @baby_ponpoko の販売note構造 ＋ PASONA・売れるnote構成テンプレの定石
const SELLING_SKELETON = `【購買動機の核（最重要・note全体を貫く大前提）】
読者が本当に欲しいのは「AIの自動化」そのものではない！その先にある「収益化・起業・"お金になる"」がゴール。
だから自動化を"目的"として語らない。一貫して「自動化＝収益化への最短距離に必須のインフラ／土台」として位置づける。
・接続の主張を各所で繰り返す：「稼ぎたいなら、まず自動化で"時間・仕組み・継続力"を先に手に入れるのが最速」「個人が収益化でつまずく原因＝時間切れ・続かない・スケールできない。それを外すのが自動化」
・自動化で空いた時間・仕組み・スケールを、どう"お金"に変えるかへの橋を必ず架ける（時間短縮の話で終わらせない）。
・読後感は「これをやれば"稼ぎ・収益化"に一歩近づく」。購入は"収益化への近道を買う"感覚にする。

【有料に持っていく"欲求の高め方"（売れてる有料noteのセールス構造を移植・内容/表現はコピーしない）】
以下を①〜⑫の型に溶け込ませ、読者の「欲しい」を購入直前まで一気に積み上げる。トーンは**強めに煽ってよい**（断定・熱量・緊急性を効かせる）。でおの温かさは根に残しつつ、遠慮しすぎない。
★越えてはいけない線（絶対）：嘘・数字の捏造をしない／読者や過去の自分（過去の非モテ等）を嘲笑わない／人格否定・虚偽の恐怖を作らない。この範囲でなら強く煽ってよい。
・冒頭は"手に入る未来"から入る：ノウハウ説明より先に「これができると、あなたの毎日はこう変わる」という憧れの情景を鮮明に・大きく描く（未来ペーシング）
・読者の欲求と痛みを"あなたの言葉"で刺すように言語化して自己投影させる（「〜したいですよね？」「〜な経験、ありませんか？」）
・"隠れたメカニズム"を強く匂わせる：「稼げてる個人は、実はほぼ全員"ある同じこと"をやってる」＝好奇心＋FOMO（※その正体は無料で明かさない・有料の目玉）
・"憧れの未来"のベネフィットを畳みかける箇条書き（「〜できる」「〜になる」を並べて情景を積み、欲しさを最大化）
・"今のままでいいか？"の自己変革ナッジを効かせる（前向きな決断を強く迫ってよい。ただし脅し・自己否定・嘲笑はしない）
・購入直前で特典を"リビール"して価値を跳ね上げる（後出しのプレゼント感で「そこまで付くなら買い」を作る）
・全体を通して「この先にもっとすごい核心がある」という前傾を強く切らさない

【売れる有料noteの型（このセクション順を必ず守る＝売れてる人の構造を移植）】
売れているnoteは「自己満足の解説」ではなく「構成された営業文」になっている。次の①〜⑫の順で書く（各見出しは ## で立て、内容に合った自然な日本語見出しにする）。

① 強いフック（タイトル直後の数行）
　- 読者の痛み or 憧れを1行目でズバッと突く（PASONAのProblem）。★痛み/憧れは"お金・収益化・起業"の文脈で刺す（例：稼ぎたいのに時間が足りない／副業を仕組みにできない／自分の商売を大きくできない）。「自動化したい」で止めない
　- 「これは◯◯な人のための記事です」と対象を名指しして"自分ごと化"させる
　- ★除外を書くなら"本気度・行動意欲"でだけフィルタする（例：情報を集めて満足したいだけの人・1個も行動する気がない人には向かない＝"選ばれた本気の人向け"の希少感で価値を上げる）。**夢・成果イメージを下げる自己限定表現は禁止**：「地味だけど確実」「魔法のような抜け道はない」「一夜にして億は無理」「派手なことは書いてない」等は絶対に書かない（買う気を削ぐ）
② 放置した未来（Agitation・軽く）
　- このまま何もしないとどうなるか。ただし読者や過去の自分を嘲笑わない（脅しすぎない）
③ 自己紹介＝ゼロ→成功ストーリー
　- 「顔もセンスも金もスキルもゼロだった僕」から今へ。弱さをさらけ出して信頼を作る（アンダードッグ物語）。ここは長めに、情景が浮かぶ具体で
④ この記事で得られること（ベネフィット箇条書き）
　- 読むと"何ができるようになるか"を箇条書きで具体的に。特典もここで軽く予告
　- ★ベネフィットの少なくとも1つは必ず"収益化・お金"に接続する（例：空いた時間を稼ぎに回せる／副業を仕組み化して伸ばせる）。自動化そのものをゴールにしない
⑤ 社会的証明＝proof-of-work（★自己減点の告白は絶対禁止）
　- ★禁止：「実績はまだ無い」「まだ稼げていない」「大きな数字はない」「集客フェーズの入り口」等、自分でマイナスを申告する文は一切書かない（"この人から買う気が失せる"を生む）。無い事実をわざわざ言わない
　- 嘘・数字の捏造もしない：部数・view・金額は無ければ書かない or「◯」プレースホルダのみ
　- 代わりに"事実のうち強い部分だけ"を堂々と提示：この記事の配信・SNS投稿・サービス運用が実際にAIで自動で回っている＝それが実力の証拠（proof-of-work）。動いてる現物をポジティブに見せて信頼を作る
⑥ 独自メソッドの"宣言"（Solution・無料側では正体を明かさない）
　- 「みんなは◯◯してるけど、逆」の逆張り・独自の切り口が"ある"ことを宣言し、"ありきたりじゃない"と好奇心を最大化する
　- ★ただし無料側では「それが何か」の正体・具体・理屈は明かさない（＝有料⑨の目玉）。ここでは「その答えは有料で全部話す」と引く
⑦ 無料パートは短く"入口"だけ（★核心を無料で明かさない・★"無料で手に入る感"を出さない）
　- ★最重要：無料は全体の3〜4割まで。長く出しすぎない。**核心（"稼いでる個人がほぼ全員やってること"の正体・独自メソッドの中身・具体的な全手順）は絶対に無料で書かない**（有料の目玉として温存する）
　- 無料でやるのは「欲求と好奇心を最大化する」ことだけ：未来ペーシング→物語→得られること→"核心が「ある」"と匂わせて、正体は明かさず止める（「その"みんながやってること"が何か——ここから先で全部話します」の形）
　- ★禁止語：「ここまでが無料」「無料のまとめ」「無料で全部見せます／出します」「出し惜しみしない」等、"無料で手に入る"と感じさせる文言は一切書かない
⑧ 有料の境界＝"欲求が最高潮＋核心の直前"に置く（★早めに・「ここまでが無料」ではなく「ここからが本題」）
　- 境界は「ここから先が本当の核心／ここからが本題」と前傾で書く。「ここまでが無料のまとめ」とは絶対に書かない。**核心を明かす直前で区切る**（無料が長引かないうちに）
　- ★価格を出す前に必ず"比較の錨"を置く（例：外注したら◯万円・独学で調べると◯時間かかる → だからこの価格は安い）。そのうえで「失敗せず最短で進める時間を買う」と正当化
　- ★有料で手に入るのは"あなたの収益化に直結する道具（知識・手順・テンプレ）"だと明言する。「買う＝自分も稼げる状態に近づく」と直感でわかる橋を境界の直前に置く
⑨ 有料パート＝この記事で最も厚い本編（★払って薄いと感じさせない）
　- ここに核心を全部置く：⑥独自メソッドの"正体"／"みんながやってること"の答え → 再現できる**全手順**（番号付き・そのまま真似できる粒度・各ステップに"つまずき先回り"と"具体例"）→ プロンプトやテンプレの中身
　- ★有料パートの分量は無料パートより明確に多くする（6〜7割）。具体・実例・手順を厚く書き、「お金を払ったのに中身が少ない」と絶対に感じさせない
　- ★各手順は「これができると、収益化にこう近づく」の一言を添えて、作業→お金の線を切らさない
⑩ 反論処理＋リスクリバーサル
　- 「でも自分には無理では？」「時間がない」「センスがない」等への先回りの一言で背中を押す
　- 「読んで損はない／まず1個だけ試せばいい」と踏み出すハードルを下げる安心材料を置く
⑪ 特典パッケージ（購入者限定として）
　- プロンプト集・テンプレ・チェックリスト・DM相談 等を"購入者だけの特典"として提示。1つ1つのベネフィットも書く
　- ★核心：「買う→知識・手順・テンプレが手に入る→それがそのまま自分の収益化の道具になる」という因果を、直感でわかる形で1本の線として見せる（"手に入れたら明日から自分の稼ぎに使える"を明言）
⑫ 希少性＋段階値上げ＋ダメ押しCTA＋追伸
　- 「残り◯部」「◯部売れたら¥◯◯◯→¥◯◯◯に値上げ」の限定・緊急性（PASONAのNarrowdown）
　- 最後のひと押し（Action）→ 追伸（P.S.）で1番刺さる一言をもう一度

※上は"骨格"。テンプレ臭を出さず、でお本人が熱く語る文章として肉付けする。見出しに①②の番号は出さない。
※長さを削るために型を飛ばさない。各セクションを具体例・体験・セリフで厚く肉付けして、じっくり読ませる長文にする。`;

function buildSystem(mode) {
  if (mode === 'main') {
    return `あなたはFineme代表「でお」。元・非モテ→現役モデル→AIで自分の事業(Fineme)を自動化・収益化している。
これは**有料note（メイン商材）の下書き**。売る商品は「外見磨きノウハウ」ではなく「**AI×外見磨き(=Fineme)というニッチで、noteを収益化した"稼ぎ方"**」。読者利益は「僕もニッチ×AIで稼げる」。

${STYLE_RULES}

${SELLING_SKELETON}

【このnote固有の中身】
・③の物語は「非モテ→モデル→AIで外見磨き事業(Fineme)を自動化・収益化」まで繋げる
・⑥独自メソッド＝「大きい市場で消耗せず、誰もやってないニッチ(AI×外見磨き)×AI自動化で勝つ」
・⑨手順＝ニッチ選定／AIに任せる設計／noteの商品化(フロント→メイン)／Threads送客、を再現できる粒度で
・⑪特典＝ニッチ選定ワークシート・AI事業自動化プロンプト集・DM相談

【実数の扱い（最重要）】売れた部数・金額・view・フォロワー等の数字は、まだ実データが無い。断言せず必ず「◯部」「◯円」「◯view」の ◯ プレースホルダで書く。ありもしない数字を作らない！
【CTA】⑫の後、外見の悩みがある読者向けに Fineme（${BASE_URL}/lp/mirror）へのソフトな二次導線を1つだけ添える。押し売りしない！
【長さ】10000〜15000字（有料商材なのでしっかり長く）。★無料(①〜⑧)は全体の3〜4割で欲求MAXまで／paywall後の有料(⑨〜⑫)を無料より明確に長く・厚く（核心と全手順をここに集約）。途中で失速せず最後まで濃く書き切る。
【出力形式】1行目「# {タイトル}」→空行→本文（Markdown ##見出し, 段落, **太字**, 箇条書き）。前置き不要・記事のみ出力。

${BRAND_PHILOSOPHY}
※思想は根っこの温度として効かせる。文体ルール（「！」文末・短文リズム・後輩目線）は厳守。`;
  }
  // front
  return `あなたはFineme代表「でお」。元・非モテ→現役モデル→AIで自分の事業(Fineme)を自動化・収益化している。
これは**有料note（フロント商材・安価）の下書き**。テーマは「**AIで事業を自動化・収益化する方法**」＝結果（実績）を伴わなくても書ける汎用ノウハウ。読者利益は「僕もAIで事業を自動化・収益化できる」。まだ実績を売りにしない（あくまで"やり方"を売る）。

${STYLE_RULES}

${SELLING_SKELETON}

【このnote固有の中身】
・③の物語は「顔もセンスもゼロ→今はAIに事業を任せて回してる」。実績の断言はせず"やり方"で価値を出す（ただし本文に「まだ実績がない」等の自己減点は書かない＝⑤の禁止に従う）
・⑤社会的証明は数字を無理に出さず、"動いてる仕組み(proof-of-work)"と実体験で担保（無い数字は作らない・"無い"とも言わない）
・⑥独自メソッド＝「すごいアイデアは要らない。小さく始めて、人の作業をAIに置き換え、毎日勝手に進む仕組みを積む」
・⑨手順＝AIに何を任せるか／今日できる小さな自動化1個、を再現できる粒度で
・⑪特典＝すぐ使えるプロンプト・自動化タスク分解テンプレ
【CTA】⑫の後、Threadsフォロー＋「この考え方で"誰もやってないニッチ"で実際に事業を作った話は近日メインnoteで公開します」の予告を自然に1つ。押し売りしない！
【長さ】6000〜9000字（有料商材なのでしっかり長く）。★無料(①〜⑧)は全体の3〜4割で欲求MAXまで／paywall後の有料(⑨〜⑫)を無料より明確に長く・厚く（核心と全手順をここに集約）。①〜⑫の型は省かず、各セクションを具体例・体験で厚く肉付けする。
【出力形式】1行目「# {タイトル}」→空行→本文（Markdown ##見出し, 段落, **太字**, 箇条書き）。前置き不要・記事のみ出力。

${BRAND_PHILOSOPHY}
※思想は根っこの温度として効かせる。文体ルール（「！」文末・短文リズム・後輩目線）は厳守。`;
}

async function generateNote(mode, topic) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const memory = await fetchAgentMemory();
  const system = withMemory(buildSystem(mode), memory);

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: mode === 'main' ? 20000 : 14000,
    temperature: 0.9,
    system,
    messages: [{ role: 'user', content: `今回の有料noteテーマ：「${topic}」\nこのテーマで、売れる型（①〜⑫）に沿って、最後まで読まれて"自分もやってみよう→購入"につながる有料note本文を1本書いてください。無料パートで出し切り、有料の期待値を最大化すること。` }],
  });
  return msg.content?.[0]?.text?.trim() || null;
}

// Markdown→メール用HTML（note-draft と同じ変換）
function mdToHtml(md) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#1d4ed8">$1</a>');

  const blocks = md.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
  return blocks.map(block => {
    const lines = block.split('\n');
    const first = lines[0];
    if (first.startsWith('# ')) {
      return `<h1 style="font-size:26px;font-weight:800;color:#111;line-height:1.4;margin:0 0 24px;letter-spacing:-0.01em">${inline(first.slice(2))}</h1>`;
    }
    if (first.startsWith('## ')) {
      return `<h2 style="font-size:20px;font-weight:700;color:#111;margin:36px 0 10px;padding-bottom:8px;border-bottom:2px solid #f0ede6">${inline(first.slice(3))}</h2>`;
    }
    if (first.startsWith('### ')) {
      return `<h3 style="font-size:16px;font-weight:700;color:#1a1a1a;margin:24px 0 6px">${inline(first.slice(4))}</h3>`;
    }
    const text = lines.map(l => inline(l)).join('<br>');
    return `<p style="margin:0 0 18px;line-height:1.95;color:#222;font-size:15px">${text}</p>`;
  }).join('\n');
}

function parseArticle(raw) {
  const lines = raw.split('\n');
  let title = '';
  let bodyStart = 0;
  if (lines[0].startsWith('# ')) {
    title = lines[0].slice(2).trim();
    bodyStart = lines[1]?.trim() === '' ? 2 : 1;
  } else if (lines[0].startsWith('タイトル：') || lines[0].startsWith('タイトル:')) {
    title = lines[0].replace(/^タイトル[：:]/, '').trim();
    bodyStart = lines[1]?.trim() === '' ? 2 : 1;
  }
  const body = lines.slice(bodyStart).join('\n').trim();
  return { title, body };
}

async function fetchNoteCover(title) {
  try {
    const url = `${BASE_URL}/api/og/note-cover?title=${encodeURIComponent(title)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString('base64');
  } catch (e) {
    console.error('[note-money-draft] cover image error:', e.message);
    return null;
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

  const params = new URL(request.url).searchParams;
  const mode = params.get('mode') === 'main' ? 'main' : 'front';
  const debug = params.get('debug') === '1'; // 本文をJSONで返す（CSOレビュー用・認証必須）
  const topics = mode === 'main' ? MAIN_TOPICS : FRONT_TOPICS;
  const week = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (7 * 86400000));
  const topic = topics[week % topics.length];

  try {
    const raw = await generateNote(mode, topic);
    if (!raw) return Response.json({ error: 'no article generated' }, { status: 500 });

    const { title, body } = parseArticle(raw);
    const displayTitle = title || topic;

    // debug: メール送信せず本文をそのまま返す（レビュー用）
    if (debug) {
      return Response.json({ success: true, mode, topic, title: displayTitle, chars: (body || raw).length, article: raw });
    }
    const bodyHtml = mdToHtml(body || raw);
    const coverBase64 = await fetchNoteCover(displayTitle);

    const modeLabel = mode === 'main' ? 'メイン（Fineme=AI×外見磨きで収益化した方法）' : 'フロント（AIで事業を自動化・収益化する方法）';
    const numbersNote = mode === 'main'
      ? '<p style="margin:8px 0 0;font-size:13px;color:#b45309;font-weight:700">⚠️ 本文中の「◯」は実際の部数・金額・view等に置き換えてから公開（虚偽の数字は書かない）。実績が出てから公開すること。</p>'
      : '';

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const coverNote = coverBase64
        ? '<p style="margin:0 0 4px;font-size:13px;color:#059669;font-weight:700">✅ アイキャッチ画像 → 添付（note-cover.png）を保存してアップロード</p>'
        : '<p style="margin:0 0 4px;font-size:13px;color:#dc2626">⚠️ アイキャッチ画像の生成に失敗。手動で用意してください。</p>';

      const html = `
        <div style="font-family:sans-serif;max-width:680px;margin:0 auto">
          <h2 style="color:#111;font-size:20px;margin:0 0 4px">💰 収益note ドラフト</h2>
          <p style="color:#666;font-size:13px;margin:0 0 4px">種別：${modeLabel}</p>
          <p style="color:#999;font-size:12px;margin:0 0 20px">テーマ：${topic}</p>

          <div style="background:#fefce8;border:1px solid #fbbf24;border-radius:10px;padding:16px 20px;margin:0 0 24px">
            <p style="font-size:14px;font-weight:700;color:#92400e;margin:0 0 10px">📋 投稿手順</p>
            ${coverNote}
            <p style="margin:0 0 4px;font-size:13px;color:#333">② タイトルをコピー → noteのタイトル欄へ</p>
            <p style="margin:0;font-size:13px;color:#333">③ 本文をコピー → note本文欄へ → 価格・有料範囲・「残り◯部」を設定して公開</p>
            ${numbersNote}
          </div>

          <p style="font-size:13px;font-weight:700;color:#555;margin:0 0 6px">① タイトル</p>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin:0 0 24px;font-size:18px;font-weight:700;color:#0f172a;line-height:1.4">
            ${displayTitle.replace(/</g, '&lt;')}
          </div>

          <p style="font-size:13px;font-weight:700;color:#555;margin:0 0 6px">③ 本文</p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:28px 32px;margin:0 0 20px">
            ${bodyHtml}
          </div>

          <p style="font-size:12px;color:#999;margin:0">
            ※ 価格：フロント ¥500〜¥1,000／メイン ¥1,500〜¥3,000。段階値上げ＋「残り◯部」の希少性を設定（business/note-main-draft.md）。
          </p>
        </div>`;

      const payload = {
        from: 'Fineme note <noreply@fineme.me>',
        to: OWNER_EMAIL,
        subject: `【Fineme 収益note・${mode === 'main' ? 'メイン' : 'フロント'}】${displayTitle}`,
        html,
      };
      if (coverBase64) {
        payload.attachments = [{ filename: 'note-cover.png', content: coverBase64 }];
      }
      await resend.emails.send(payload);
    }

    console.log(`[note-money-draft] Sent. mode=${mode} title="${displayTitle}"`);
    return Response.json({ success: true, mode, topic, title: displayTitle, emailed: !!process.env.RESEND_API_KEY });
  } catch (e) {
    console.error('[note-money-draft] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
