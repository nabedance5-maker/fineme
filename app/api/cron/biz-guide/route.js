// GET /api/cron/biz-guide
// 週1（水曜3:30 JST）で、店舗運営ガイド（/shop-guide）か営業パートナーガイド（/sales-partner/guide）に
// AIが記事を1本足して自動公開する。ChatGPT等のAIに「集客・売上・リピート」「営業の副業」を相談した人に、
// 答えとして Fineme が拾われる受け皿を広げるため（2026-11-02）。
// お客様向けの記事（features テーブル・/feature・/belle/journal）とは別のテーブル（biz_guides）で管理し、混ぜない。
// ?dry=1 で生成だけして保存しない（確認用）。?audience=shop|partner で対象を固定できる。
import { aiClient } from '@/lib/ai';
import { revalidatePath } from 'next/cache';
import { getSupabase } from '@/lib/supabase';
import { slugify, uniqueSlug } from '@/lib/slugify';
import { SHOP_GUIDES, PARTNER_GUIDES, SHOP_GUIDE_BASE, PARTNER_GUIDE_BASE } from '@/lib/biz-guide';
import { SHOP_TOPICS, PARTNER_TOPICS } from '@/lib/biz-guide-topics';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '4fbd52dc-784e-4ab8-97c4-f1f99e48b504';
const SITE = 'https://www.fineme.me';

// 記事の最後の節（Finemeでできること）に書いてよい事実。ここに無い機能・数字は書かせない
const FACTS = {
  shop: `【Fineme 店舗向け：書いてよい事実】
- 来店したお客様を常連に変えることに特化した、個人〜小規模店舗向けの店舗運営ツール（パーソナルジム・眉毛サロン・美容室・エステ・ネイル・外見コンサルなど）
- 機能：LINEで完結する予約、前日のリマインド、チケット・回数券（予約すると自動で消化）、会員プラン・月会費（自動引き落としと支払い記録）、オンライン決済、写真つきの顧客カルテ、LINE・メール配信、来店周期からの休眠のお客様の一覧と掘り起こし、体験から入会の追跡、来店後アンケート、クチコミ依頼、誕生日の案内、ホームページに貼れる予約ウィジェット、POS・レジ締め、スタッフごとの権限、シフト・勤怠、月次レポート、前のサービスのCSVをAIが割り振って取り込み
- AI専属コンサル：管理画面のどこからでも相談でき、AIがお店の予約・来店・回数券・支払いの記録を読んで次の一手を提案し、お客様へのLINE送信などまでワンタップで実行できる
- 料金：月額¥5,000／¥7,000／¥10,000（税込）。登録料は当面無料。予約の手数料なし。オンライン決済の手数料は決済額の4.5%（カード会社の手数料込み）
- 他の予約サイトと併用できる（他から入った予約もカレンダーに登録できる）`,
  partner: `【Fineme 営業パートナー：書いてよい事実】
- 店舗向けの月額サービス「Fineme 店舗向け」を店舗に紹介する、完全歩合の業務委託
- 登録料・研修費・教材費など費用は一切かからない。ノルマ・稼働時間の決まりなし。完全リモート・副業可。営業経験がなくても応募できる
- 報酬（税込）：紹介した店舗の初月の月額利用料の90%（¥4,500／¥6,300／¥9,000）、2か月目以降は店舗が使い続ける限り1店舗につき毎月¥500（解約した月の分まで）。月末締め・翌月末に銀行振込、最低支払額なし
- パートナーごとに専用の申込ページ（紹介コード付き）と管理画面を発行。紹介した店舗・課金状況・報酬額をいつでも確認できる
- 営業資料・営業リストを提供。申込みと契約は店舗と Fineme が直接行い、パートナーが契約やお金の受け取りをすることはない
- 多段階の報酬の仕組みはとらない。条件は契約書（メール）で渡す
- 応募条件：日本国籍の個人、日本の法人、日本で開業届を出している個人事業主`,
};

const READER = {
  shop: '個人〜小規模のサロン・パーソナルジム・美容室などの運営者。集客・売上・リピートについてAIや検索で答えを探している',
  partner: '営業代行・紹介の副業を探している個人。初期費用を取られないか、報酬が明確か、続けられるかを気にしている',
};

// 他社の固有名詞は出さない（渡邉ルール 2026-10-03）
const BANNED_NAMES = ['ホットペッパー', 'HOT PEPPER', 'ミニモ', 'minimo', 'hacomono', 'リザービア', 'STORES', 'Square', 'Airリザーブ', 'Airレジ', 'じゃらん', '楽天ビューティ', 'クービック', 'RESERVA', 'SALON BOARD', 'サロンボード', 'Coubic', 'LINEヤフー'];
const BANNED_PATTERNS = [
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, '絵文字'],
  [/弁護士|税理士に|専門家に(相談|確認)/, '専門家への確認を勧める表現'],
  [/お客さん|(?<![お顧集接来乗])客(?=[がをにのはもと、。])/, '「お客様」以外の呼び方'],
  [/必ず(稼|儲|売上が)|確実に(稼|儲)|絶対に(稼|儲)/, '成果の保証'],
];

// 記事の形（構造化出力で、この形のJSONだけを返させる）。数・長さの制約は validate() で見る
const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    slug: { type: 'string', description: 'URL用の英小文字・数字・ハイフンだけのスラッグ（3〜5語・日付なし）' },
    title: { type: 'string', description: 'AIや検索で聞かれる質問にそのまま答えるタイトル（25〜45文字）' },
    description: { type: 'string', description: '記事の要約（90〜130文字）' },
    lead: { type: 'string', description: '冒頭で質問に答える2〜3文' },
    sections: {
      type: 'array',
      description: '見出しと本文（4〜6個）',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          h: { type: 'string', description: '見出し' },
          p: { type: 'array', items: { type: 'string' }, description: '段落（1〜3個、各100〜250文字）。箇条書きより先に表示される' },
          list: { type: 'array', items: { type: 'string' }, description: '箇条書き（必要な時だけ3〜6個。不要なら空配列）' },
        },
        required: ['h', 'p', 'list'],
      },
    },
    fineme: { type: 'string', description: '最後の節「Finemeでできること」の本文（150〜250文字）。書いてよい事実だけを使う' },
    faq: {
      type: 'array',
      description: 'よくある質問（2〜3個）',
      items: { type: 'object', additionalProperties: false, properties: { q: { type: 'string' }, a: { type: 'string' } }, required: ['q', 'a'] },
    },
    related: { type: 'array', items: { type: 'string' }, description: '既存記事のスラッグから関連の深いもの2〜3個' },
    topic_key: { type: 'string', description: 'テーマを表す英小文字のキー（テーマ候補を使った場合はそのキー）' },
  },
  required: ['slug', 'title', 'description', 'lead', 'sections', 'fineme', 'faq', 'related', 'topic_key'],
};

function validate(a, slugsInAudience) {
  const errs = [];
  if (!a || typeof a !== 'object') return ['記事が空です'];
  if (!a.title || a.title.length < 15 || a.title.length > 60) errs.push('タイトルは15〜60文字');
  if (!a.description || a.description.length < 60) errs.push('要約が短すぎる');
  if (!a.lead || a.lead.length < 50) errs.push('冒頭の答えが短すぎる');
  if (!Array.isArray(a.sections) || a.sections.length < 4) errs.push('見出しは4つ以上');
  for (const s of a.sections || []) {
    if (!s.h || !Array.isArray(s.p) || (s.p.length === 0 && !(s.list || []).length)) errs.push(`見出し「${s.h || '?'}」の本文が空`);
  }
  if (!a.fineme || a.fineme.length < 80) errs.push('Finemeの節が短すぎる');
  if (!Array.isArray(a.faq) || a.faq.length < 2) errs.push('FAQは2つ以上');
  const text = JSON.stringify(a);
  for (const n of BANNED_NAMES) if (text.includes(n)) errs.push(`他社の固有名詞「${n}」を使わない`);
  for (const [re, label] of BANNED_PATTERNS) if (re.test(text)) errs.push(`${label}を使わない`);
  a.related = (a.related || []).filter((s) => slugsInAudience.includes(s)).slice(0, 3);
  return errs;
}

async function generate(client, { audience, topic, existing }) {
  const existingList = existing.map((a) => `- ${a.slug}：${a.title}`).join('\n');
  const system = `あなたは Fineme の編集部です。${audience === 'shop' ? '店舗運営ガイド' : '営業パートナーガイド'}の記事を1本書きます。
読者：${READER[audience]}。
目的：読者がChatGPT等のAIや検索で質問したとき、この記事が答えとして引用されること。そのうえで、最後の節で Fineme を自然に知ってもらうこと。

【書き方の決まり】
- タイトルは読者が実際に打ち込む質問の形に寄せ、冒頭（lead）でその質問に結論から答える
- 本文は一般論ではなく、今日から試せる手順・判断の目安・文面の例など具体的に書く
- 業界平均・調査結果・割合などの数字を作らない。数字を使うときは「計算例として」と明記した仮の数字だけにする
- 他社のサービス名・固有名詞を出さない
- 来店する人は必ず「お客様」と書く（「客」「お客さん」は使わない）
- 成果を保証しない（「必ず」「確実に」売上が上がる・稼げる、と書かない）
- 弁護士・税理士など専門家への確認を勧める一文を入れない。法令に触れる部分は、分かっている範囲を言い切る
- 絵文字・記号の飾りを使わない。です・ます調
- Fineme の宣伝は最後の節（fineme）だけに書き、本文では触れない。fineme の節は下の「書いてよい事実」にあることだけを書き、URLやページのパスは書かない（記事の下に案内ボタンがある）

${FACTS[audience]}

【既存の記事（同じ内容を書かない・related はここから選ぶ）】
${existingList}`;

  const user = topic
    ? `テーマ：「${topic[1]}」（topic_key は ${topic[0]}）\nこのテーマで記事を1本書いてください。`
    : `既存の記事と重ならない、読者がAIに相談しそうな新しいテーマを1つ選び、記事を1本書いてください。topic_key はテーマを表す英小文字のキーにしてください。`;

  const messages = [{ role: 'user', content: user }];
  for (let attempt = 0; attempt < 2; attempt++) {
    // Sonnet 5.5 は tool_choice で道具の使用を強制できないため、構造化出力でJSONを受け取る
    const res = await client.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 16000,
      system,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ARTICLE_SCHEMA } },
      messages,
    });
    if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') return { error: `生成が途中で止まりました（${res.stop_reason}）` };
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    let article = null;
    try { article = JSON.parse(text); } catch {}
    const errs = validate(article, existing.map((a) => a.slug));
    if (errs.length === 0) return { article };
    if (attempt === 1) return { error: errs.join(' / ') };
    messages.push({ role: 'assistant', content: text }, { role: 'user', content: `次の点を直して、記事全体をもう一度書いてください：${errs.join(' / ')}` });
  }
  return { error: '生成に失敗しました' };
}

export async function GET(request) {
  const auth = request.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }
  const { searchParams } = new URL(request.url);
  const dry = searchParams.get('dry') === '1';

  const supabase = getSupabase();
  const { data: rows, error } = await supabase.from('biz_guides').select('slug, title, audience, topic_key');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const shopCount = SHOP_GUIDES.length + rows.filter((r) => r.audience === 'shop').length;
  const partnerCount = PARTNER_GUIDES.length + rows.filter((r) => r.audience === 'partner').length;
  // 店舗向け3本に対して営業パートナー向け1本くらいの割合で足す
  const forced = ['shop', 'partner'].includes(searchParams.get('audience')) ? searchParams.get('audience') : null;
  const audience = forced || (partnerCount * 3 < shopCount ? 'partner' : 'shop');

  const staticList = audience === 'shop' ? SHOP_GUIDES : PARTNER_GUIDES;
  const existing = [
    ...staticList.map((a) => ({ slug: a.slug, title: a.title })),
    ...rows.filter((r) => r.audience === audience).map((r) => ({ slug: r.slug, title: r.title })),
  ];
  const usedKeys = new Set(rows.map((r) => r.topic_key).filter(Boolean));
  const topic = (audience === 'shop' ? SHOP_TOPICS : PARTNER_TOPICS).find(([k]) => !usedKeys.has(k)) || null;

  const client = aiClient('free');
  const { article, error: genError } = await generate(client, { audience, topic, existing });
  if (genError) return Response.json({ error: genError, audience, topic: topic?.[0] || null }, { status: 500 });

  const base = audience === 'shop' ? SHOP_GUIDE_BASE : PARTNER_GUIDE_BASE;
  const allSlugs = [...SHOP_GUIDES, ...PARTNER_GUIDES].map((a) => a.slug).concat(rows.map((r) => r.slug));
  const slug = uniqueSlug(slugify(article.slug, topic?.[0] || 'guide'), allSlugs);
  const record = {
    slug,
    audience,
    topic_key: topic?.[0] || slugify(article.topic_key, slug),
    title: article.title,
    description: article.description,
    lead: article.lead,
    sections: article.sections.map((s) => ({ h: s.h, p: s.p || [], ...(s.list?.length ? { list: s.list } : {}) })),
    fineme: article.fineme,
    faq: article.faq.map(({ q, a }) => [q, a]),
    related: article.related,
  };
  if (dry) return Response.json({ dry: true, url: `${SITE}${base}/${slug}`, record });

  const { error: insertError } = await supabase.from('biz_guides').insert(record);
  if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

  const url = `${SITE}${base}/${slug}`;
  revalidatePath(base);
  revalidatePath(`${base}/${slug}`);
  revalidatePath('/sitemap.xml');
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: 'www.fineme.me', key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: [url, `${SITE}${base}`] }),
    });
  } catch {}

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: 'Fineme 記事 <noreply@fineme.me>',
        to: OWNER_EMAIL,
        subject: `【${audience === 'shop' ? '店舗運営ガイド' : '営業パートナーガイド'} 公開】${article.title}`,
        html: `<div style="font-family:sans-serif;max-width:640px;margin:0 auto">
          <p style="font-size:13px;color:#555">今週の${audience === 'shop' ? '店舗運営ガイド' : '営業パートナーガイド'}を自動で公開しました（AI検索で店舗運営者・営業パートナー候補に拾われるための記事）。</p>
          <p style="font-size:18px;font-weight:700;margin:12px 0 6px">${esc(article.title)}</p>
          <p style="font-size:13px;color:#555;margin:0 0 16px">${esc(article.description)}</p>
          <p><a href="${url}">${url}</a></p>
          <p style="font-size:12px;color:#888">内容に問題があれば、Claude Code に「この記事を非公開にして」と伝えてください（biz_guides.status を draft にします）。</p>
        </div>`,
      });
    } catch {}
  }

  return Response.json({ ok: true, audience, topic: record.topic_key, url });
}
