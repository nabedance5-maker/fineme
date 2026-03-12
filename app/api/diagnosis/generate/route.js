import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `あなたはFinemeの「変容コンサルタント」です。

## Finemeとは何か（最重要）
Finemeは検索ポータルでも予約サイトでもありません。
「外見を起点に自信を再設計するための『地図』と『羅針盤』を提供するプラットフォーム」です。
診断はサービスへの送客ツールではありません。診断そのものがこのサービスの価値であり、ユーザーにとって「変容の旅の入口」です。

## 事業の哲学
Philosophy: 「外見を整えることで生まれる小さな自信が人に優しくなれる余白をつくり、世界は少しずつ愛で満たされていく」
Mission: 「外見を起点に、自信を再設計する人を増やす」
Vision: 「外見を理由に、人生を諦めなくていい世界をつくる」
事業の軸: 「人生転換インフラ」── 検索して終わりではなく「変容の旅の入口」

## ターゲットユーザーの理解
恋愛がうまくいかない、または自信が持てない男性。
重要：彼らの多くは「何が問題かを自分でわかっていない」。
自己評価は実態と乖離していることが多い。
「変わりたいのに変われない」経験を持っている。
それはサボっていたからではなく、正しい地図がなかったから。

## あなたの役割
ユーザーのプロファイルを読んで「変容の地図」を生成する。
地図とは：
・現在地（自分が今どこにいるかの深い認識）
・歩いてきた道（過去の試みと失敗の本質）
・最初の分岐点（今すぐ取れる具体的な一手）
・このユーザー特有の障壁（失敗パターンに基づく警告）
・旅に合うガイドの条件（プロ選びの軸）

## 生成の原則
❌ 一般論を言わない（「清潔感が大事です」は禁止）
❌ カテゴリ名で終わらせない（「眉毛サロンがおすすめです」は禁止）
❌ 励ます・肯定するだけにならない（チアリーダーではない）
✅ このユーザーの組み合わせでしか出てこない洞察を書く
✅ 「なぜこの人にこれが必要か」の理由を含める
✅ failure_patternとcare_levelsの組み合わせを必ず参照する
✅ 読んだ瞬間に「これは私のことだ」と感じさせる文にする
✅ Stage 2データがある場合は必ずその内容を反映させる

## 文体
・一文は短く（40字以内推奨）
・断定的に書く（「〜かもしれません」は使わない）
・感情に触れながら事実を伝える
・希望を示すが、甘くない

## 出力形式（JSON厳守・他のテキスト不要）
{
  "current_position": "あなたの現在地（150字以内）",
  "core_insight": "変われなかった本当の理由（100字以内）",
  "first_step": "最初の一手・具体的行動（120字以内）",
  "warning": "このユーザー特有のリスク（80字以内）",
  "guide_criteria": ["条件1（30字以内）", "条件2（30字以内）", "条件3（30字以内）"]
}`;

// ラベル定数

const TRIGGER_LABELS = {
  matching_photo: 'マッチングアプリで写真が原因で損している',
  matching_date: 'マッチングはできるが会うと続かない',
  love_now: '好きな人ができた・次に会う時に印象を変えたい',
  career: '就職・転職・大事な場面が近い',
  mirror: '毎朝鏡を見るたびに気分が上がらない',
  word: '誰かの一言が頭から離れない',
  comparison: '同世代と並んだとき自分だけが違う気がした',
  vague: '明確なきっかけはないがこのままでいいとは思っていない'
};

const SCENE_LABELS = {
  date_first: '初めてのデートの前夜（緊張より不安が大きい）',
  photo_gap: '写真に映った自分と思っていた自分が全然違う',
  clothes_fit: '気に入った服が似合わなくて棚に戻した',
  morning_mirror: '朝の洗面台で一日のやる気が下がる',
  video_call: 'オンライン通話の自分を見て落ち込んだ',
  group_scene: '集合写真や街中で同世代との差が目に入った',
  daily_low: '日常的に自信が持てていない'
};

const AREA_LABELS = {
  hair: '髪型・髪',
  skin: '肌・ニキビ',
  eyebrow: '眉毛',
  body: '体型・体',
  fashion: '服・コーデ',
  photo: '写真写り',
  overall: '全体の雰囲気',
  beard: 'ひげ',
  teeth: '歯・口元',
  posture: '姿勢'
};

const CARE_LEVEL_LABELS = {
  none: '気にしていない・取り組んでいない',
  concerned: '気になっているが何もしていない（未着手）',
  self: '自分なりにケアしている（自己流・不定期）',
  pro: 'プロ・サロンに定期的に任せている'
};

const FAILURE_LABELS = {
  no_continuation: '効果はあったが気づいたら続いていなかった',
  lost_direction: '何をすればいいかわからなくなった',
  no_trust: '担当者と合わなかった・信頼できなかった',
  cost_money: 'お金が続かなかった',
  cost_time: '時間が続かなかった',
  no_result: '変化が感じられなかった',
  self_doubt: '「自分には無理かも」という気持ちが出てきた',
  ongoing: '今も続けている（さらに改善したい）'
};

const URGENCY_LABELS = {
  high: '1ヶ月以内に変化を感じたい（具体的な予定がある）',
  mid: '2〜3ヶ月で少しずつ変えたい',
  low: '半年〜1年で根本から変えたい',
  continuous: '期限はないが続けられるものがいい'
};

function buildNarrative(profile, stage2) {
  const lines = ['【ユーザープロファイル】', ''];

  // きっかけ
  const triggerLabel = TRIGGER_LABELS[profile.trigger] || profile.trigger || '未回答';
  lines.push(`■ きっかけ: ${triggerLabel}`);

  // 一番嫌な場面
  const sceneLabel = SCENE_LABELS[profile.scene] || profile.scene || '未回答';
  lines.push(`■ 一番嫌な場面: ${sceneLabel}`);
  lines.push('');

  // 外見ケアの現状（care_levels が存在する場合）
  if (profile.care_levels && typeof profile.care_levels === 'object') {
    lines.push('■ 外見ケアの現状（10項目）:');
    for (const [key, label] of Object.entries(AREA_LABELS)) {
      const level = profile.care_levels[key];
      const levelLabel = level ? (CARE_LEVEL_LABELS[level] || level) : '未回答';
      lines.push(`  - ${label}: ${levelLabel}`);
    }
  } else if (profile.concern_areas && Array.isArray(profile.concern_areas)) {
    // 旧バージョン: concern_areas から類推
    lines.push('■ 気になっている外見エリア:');
    const areaNames = profile.concern_areas
      .map(a => AREA_LABELS[a] || a)
      .join('、');
    lines.push(`  ${areaNames || '未回答'}`);
    lines.push('  ※ 各エリアのケアレベルは未回答');
  }
  lines.push('');

  // 過去の試み
  if (profile.past_attempts && Array.isArray(profile.past_attempts) && profile.past_attempts.length > 0) {
    lines.push('■ 過去の試み:');
    for (const attempt of profile.past_attempts) {
      const areaLabel = AREA_LABELS[attempt.area] || attempt.area || '不明';
      const careLabel = CARE_LEVEL_LABELS[attempt.level] || attempt.level || '';
      lines.push(`  - ${areaLabel}${careLabel ? `（${careLabel}）` : ''}`);
    }
  } else if (profile.past_attempt_areas && Array.isArray(profile.past_attempt_areas)) {
    lines.push('■ 過去に試みたエリア:');
    const names = profile.past_attempt_areas.map(a => AREA_LABELS[a] || a).join('、');
    lines.push(`  ${names || 'なし'}`);
  } else {
    lines.push('■ 過去の試み: なし');
  }

  if (profile.past_attempt_timing) {
    lines.push(`  - 最後に試みた時期: ${profile.past_attempt_timing}`);
  }
  if (profile.past_attempt_duration) {
    lines.push(`  - どのくらい続いたか: ${profile.past_attempt_duration}`);
  }
  lines.push('');

  // 変われなかった理由
  const failureLabel = profile.failure_pattern
    ? (FAILURE_LABELS[profile.failure_pattern] || profile.failure_pattern)
    : '試したことがない';
  lines.push(`■ 変われなかった理由: ${failureLabel}`);
  lines.push('');

  // プロとの関係スタイル
  if (profile.style_priority_top || (profile.style_priorities && profile.style_priorities.length > 0)) {
    lines.push('■ プロとの関係スタイル（優先順）:');
    if (profile.style_priority_top) {
      lines.push(`  1. ${profile.style_priority_top}`);
    }
    if (profile.style_priorities && Array.isArray(profile.style_priorities)) {
      const rest = profile.style_priority_top
        ? profile.style_priorities.filter(s => s !== profile.style_priority_top)
        : profile.style_priorities;
      if (rest.length > 0) {
        lines.push(`  その他: ${rest.join('、')}`);
      }
    }
    lines.push('');
  }

  // タイムライン
  if (profile.urgency) {
    const urgencyLabel = URGENCY_LABELS[profile.urgency] || profile.urgency;
    lines.push(`■ タイムライン: ${urgencyLabel}`);
  }

  // 月の予算
  if (profile.budget) {
    lines.push(`■ 月の予算: ${profile.budget}`);
  }

  // Stage 2 詳細情報
  if (stage2 && typeof stage2 === 'object' && Object.keys(stage2).length > 0) {
    lines.push('');
    lines.push('■ Step 2 詳細情報:');

    if (stage2.areas && typeof stage2.areas === 'object') {
      for (const [areaKey, areaData] of Object.entries(stage2.areas)) {
        const areaLabel = AREA_LABELS[areaKey] || areaKey;
        lines.push(`  【${areaLabel}】`);
        if (typeof areaData === 'object' && areaData !== null) {
          for (const [detailKey, detailVal] of Object.entries(areaData)) {
            lines.push(`    - ${detailKey}: ${detailVal}`);
          }
        } else {
          lines.push(`    ${areaData}`);
        }
      }
    } else {
      // areas キーが無い場合はそのままシリアライズ
      for (const [key, val] of Object.entries(stage2)) {
        const label = AREA_LABELS[key] || key;
        if (typeof val === 'object' && val !== null) {
          lines.push(`  【${label}】`);
          for (const [k, v] of Object.entries(val)) {
            lines.push(`    - ${k}: ${v}`);
          }
        } else {
          lines.push(`  - ${label}: ${val}`);
        }
      }
    }
  }

  return lines.join('\n');
}

export async function POST(request) {
  try {
    const { profile, stage2 } = await request.json();

    if (!profile) {
      return Response.json({ error: 'profile required' }, { status: 400 });
    }

    const narrative = buildNarrative(profile, stage2 || null);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: narrative }]
          });

          let fullText = '';

          for await (const event of response) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              fullText += event.delta.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ delta: event.delta.text, full: fullText })}\n\n`
                )
              );
            }
          }

          // 完了時にパース済みJSONを送信
          try {
            // JSONブロックが ```json ... ``` で囲まれている場合も考慮して抽出
            const jsonMatch = fullText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : fullText;
            const parsed = JSON.parse(jsonStr);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, result: parsed })}\n\n`
              )
            );
          } catch (e) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, raw: fullText })}\n\n`
              )
            );
          }

          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err.message })}\n\n`
            )
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
