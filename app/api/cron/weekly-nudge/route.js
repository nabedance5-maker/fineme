// GET /api/cron/weekly-nudge
// Vercel Cron: 毎週月曜 9:00 JST（0:00 UTC）
// 診断済みユーザーにAI生成のパーソナルナッジをLINE送信

import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import Anthropic from '@anthropic-ai/sdk';
import { fetchAgentMemory, withMemory } from '@/lib/agent-memory';

export const dynamic = 'force-dynamic';

const AXIS_LABEL = {
  body: '体型', eyebrow: '眉', hair: '髪',
  fashion: '服', skin: '肌', teeth: '歯', nail: '爪',
};

const GOAL_LABEL = {
  others_perception: '他者からの印象を変えたい',
  self_confidence:   '自分を好きになりたい',
  action_ease:       '行動できる自分になりたい',
  life_options:      '諦めを一つずつ減らしたい',
};

async function generateNudge(compassAxis, goalChange, trigger, stepCount) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const axisLabel = AXIS_LABEL[compassAxis] || compassAxis;
  const goalLabel = GOAL_LABEL[goalChange] || trigger || '外見を変えて自信をつけたい';
  const stepMsg = stepCount > 0
    ? `これまでに${stepCount}個のステップを完了しています。`
    : 'まだステップを始めていません。';

  const baseSystem = 'あなたはFineme（男性向け外見変容診断ポータル）の変容コーチです。でおのブランドボイス（誠実・温かい・押しつけない）で書いてください。';
  const memory = await fetchAgentMemory();
  const system = withMemory(baseSystem, memory);

  const prompt = `以下のユーザーに、今週の行動を後押しする短いLINEメッセージを書いてください。

【ユーザー情報】
- 今週取り組むべき軸（Compass）: ${axisLabel}
- 変容の動機: ${goalLabel}
- ${stepMsg}

【メッセージのルール】
- 200字以内
- 「Fineme」という名前は使わない
- 説教くさくない。寄り添うトーン
- 「${axisLabel}」について、今週できる具体的な小さな一歩を1つ提案する
- 末尾に「変容の旅は続いています 🧭」で締める
- 改行を使い読みやすく

メッセージ本文のみ出力してください。`;

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  return res.content?.[0]?.text?.trim() || '';
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  const db = getSupabase();

  // LINE連携済みかつ診断結果がある全ユーザーを取得
  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, line_user_id, compass_first, goal_change, trigger, step_done')
    .not('line_user_id', 'is', null)
    .not('compass_first', 'is', null)
    .limit(500); // 1回の実行で最大500人

  if (error) {
    console.error('[cron/weekly-nudge] fetch error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return Response.json({ sent: 0, message: 'No eligible users' });
  }

  let sent = 0;
  let failed = 0;

  for (const profile of profiles) {
    try {
      const stepCount = Object.values(profile.step_done || {}).filter(Boolean).length;

      const message = await generateNudge(
        profile.compass_first,
        profile.goal_change,
        profile.trigger,
        stepCount,
      );

      if (!message) { failed++; continue; }

      const result = await sendLinePush(profile.line_user_id, message);
      if (result.ok) sent++;
      else failed++;

      // レート制限対策
      await new Promise(r => setTimeout(r, 500));

    } catch (e) {
      console.error('[cron/weekly-nudge] user error', profile.id, e.message);
      failed++;
    }
  }

  console.log(`[cron/weekly-nudge] total=${profiles.length} sent=${sent} failed=${failed}`);
  return Response.json({ sent, failed, total: profiles.length });
}
