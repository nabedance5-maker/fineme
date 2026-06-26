import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { DRAMA_PHILOSOPHY } from '@/lib/brand-philosophy';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function checkAdminKey(request) {
  const key = request.headers.get('x-admin-key');
  return key === process.env.DRAMA_ADMIN_KEY;
}

const SYSTEM_PROMPT = `あなたはショートドラマの台本作家です。以下の条件に従って台本を書いてください。

【スタイル】
- コメディーチック。くすっと笑える内容
- オチあり（笑えるオチ）。ただし主人公の問題は解決しない
- 「これ俺だ」と視聴者が自分に重ね合わせる等身大のリアル
- 主人公の状態は「悩んでいる」と説明せず、具体的な行動・反射・癖で描く（Wi-Fiを確認する、鏡を避けて歯を磨く、など）
- 「変わろう」というメッセージは一切出さない
- Fineme・サービス名・商品名は一切出さない
- 説教臭くしない
- 冒頭シーン（最初の1〜3秒相当）は「事件がすでに起きている状態」から始める。起承転結の"起"から入らない
  × NG：「主人公の部屋、夜。スマホを見ている。」（状況説明→これが"起"）
  × NG：「主人公が鏡の前に立っている。」（静的な状況描写）
  ○ OK：「SE: 通知音×3連続。男、またWi-Fiの設定画面を開く。テロップ：でも電波は関係ない」
  ○ OK：「BGM: START。男、歯ブラシを持ったまま目を閉じている。鏡を直視できない。」
  ○ OK：「男が試着室から出てくる。"なんか違う"顔のまま、もうレジに向かっている。」
- 重要なリアクションや台詞にはテロップ（字幕）での強調を指示する（音なし視聴対応）
- 効果音・BGMの指示を台本に含める（例：「SE: 通知音」「BGM: テンポの速いコメディBGM」）
- 台本の最後は「次の話が気になるひっかかり」で終わらせる（「変わらないまま何かが起きた」状態）
- 視聴者が「これ俺だ」「わかる」とコメントしたくなるオチを意識して設計する

【フォーマット】
縦型ショート動画（60〜90秒）の台本として書く。
以下の形式で出力する：

【シーン1 - 冒頭0〜3秒】（← ここで視聴者を止める。状況説明は書かない）
SE/BGM指示
（動作のみ。状況説明不要。いきなり動いているところから）
テロップ：「...」（任意）

【シーン2〜N】
（場所・状況の説明はここから。ここ以降はOK）
（動き・ト書き）
セリフ：「...」（表情・トーン指定）
テロップ：「...」（強調したいリアクションや台詞）

最後に：
【オチ】
（オチの説明と演技指示）
（次への引きとなるひっかかり）

【世界観】
シリーズ名：「変わる前夜の話。」
外見を起点に自信を再設計する前夜の男たちを描くコメディドラマ。
主人公は変わりたいのに変われない、あるいはそもそもまだ変わろうとすら思っていない男。

${DRAMA_PHILOSOPHY}`;

export async function POST(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { episode_id, title, cast_type, notes } = await request.json();

  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }

  const castDescription = cast_type === 'duo'
    ? '役者（主演）とでお（サブキャスト）の2人芝居'
    : '役者（主演）の一人芝居';

  const userPrompt = `以下のエピソードの台本を書いてください。

タイトル：${title}
出演：${castDescription}
エピソードのポイント・オチの方向性：${notes || 'タイトルから自由に発想してください'}

上記の条件で台本を書いてください。`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message;
  try {
    message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (err) {
    console.error('Anthropic API error:', err);
    return NextResponse.json(
      { error: `AI生成エラー: ${err?.status ?? ''}  ${err?.message ?? String(err)}` },
      { status: 502 }
    );
  }

  const script = message.content[0]?.text ?? '';

  if (episode_id && script) {
    const supabase = getSupabase();
    await supabase
      .from('drama_episodes')
      .update({ script })
      .eq('id', episode_id);
  }

  return NextResponse.json({ script });
}
