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
  return key === process.env.ADMIN_API_KEY;
}

const SYSTEM_PROMPT = `あなたはショートドラマの台本作家です。以下の条件に従って台本を書いてください。

【スタイル】
- コメディーチック。くすっと笑える内容
- オチあり（笑えるオチ）。ただし主人公の問題は解決しない
- 「これ俺だ」と視聴者が自分に重ね合わせる等身大のリアル
- 「変わろう」というメッセージは一切出さない
- Fineme・サービス名・商品名は一切出さない
- 説教臭くしない

【フォーマット】
縦型ショート動画（60〜90秒）の台本として書く。
以下の形式で出力する：

【シーン1】
（場所・状況の説明）
（動き・ト書き）
セリフ：「...」（表情・トーン指定）

【シーン2】
...

最後に：
【オチ】
（オチの説明と演技指示）

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
    ? 'でお（主人公）と友人（1名）の2人芝居'
    : 'でお（主人公）の一人芝居';

  const userPrompt = `以下のエピソードの台本を書いてください。

タイトル：${title}
出演：${castDescription}
エピソードのポイント・オチの方向性：${notes || 'タイトルから自由に発想してください'}

上記の条件で台本を書いてください。`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

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
