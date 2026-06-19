import Anthropic from '@anthropic-ai/sdk';
import { YoutubeTranscript } from 'youtube-transcript';
import { NextResponse } from 'next/server';
import { DRAMA_PHILOSOPHY } from '@/lib/brand-philosophy';

function checkAdminKey(request) {
  const key = request.headers.get('x-admin-key');
  return key === process.env.ADMIN_API_KEY;
}

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function fetchTranscript(videoId) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ja' });
    return transcript.map(t => t.text).join(' ');
  } catch {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      return transcript.map(t => t.text).join(' ');
    } catch {
      return null;
    }
  }
}

export async function POST(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type } = body;
  const client = getClient();

  // ── type: concept ─────────────────────────────────────────────────────────
  // 15本のエピソードnotes → キャンバス5軸の草案 JSON を生成
  if (type === 'concept') {
    const { episodes } = body;
    const episodeSummary = (episodes || [])
      .map(e => `「${e.title}」（${e.cast_type}）: ${e.notes || ''}`)
      .join('\n');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: `あなたはショートドラマのプロデューサーです。\n${DRAMA_PHILOSOPHY}`,
      messages: [{
        role: 'user',
        content: `以下の${(episodes || []).length}本のエピソードアイデアを分析して、このシリーズの「勝てるコンセプト」の5軸を設計してください。

エピソード一覧：
${episodeSummary}

以下のJSON形式のみで回答してください（マークダウン・説明文は一切不要）：
{
  "hook": "最初の3秒のフック設計（映像・状況・動作で具体的に。「〇〇している男」のような書き方で）",
  "emotion": "感情軸（視聴者の「これ俺だ」の具体的な瞬間を1〜2文で）",
  "diff": "差別化ポイント（他の恋愛/外見系ショートドラマと何が違うか。1〜2文で）",
  "rules": "シリーズ統一ルール（必ず守るフォーマット・尺・オチ構造を箇条書きで）",
  "mirror_cta": "Mirror導線（視聴→フォロー→Mirror購買への自然な流れを1〜2文で）"
}`,
      }],
    });

    const text = message.content[0]?.text || '{}';
    try {
      return NextResponse.json({ canvas: JSON.parse(text) });
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { return NextResponse.json({ canvas: JSON.parse(match[0]) }); } catch {}
      }
      return NextResponse.json({ canvas: {}, raw: text });
    }
  }

  // ── type: video ────────────────────────────────────────────────────────────
  // YouTube動画 1本 → フック・感情軸・オチ・バズ仮説を分析
  if (type === 'video') {
    const { videoId, title, description } = body;

    let transcript = null;
    let transcriptNote = '字幕が見つかりませんでした。タイトル・概要欄から推測します。';
    if (videoId) {
      transcript = await fetchTranscript(videoId);
      if (transcript) transcriptNote = '字幕あり（セリフ情報を含む詳細分析）';
    }

    const contentSection = transcript
      ? `【字幕・セリフ情報】\n${transcript.slice(0, 3000)}`
      : `【概要欄】\n${description || '（なし）'}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: `あなたはショートドラマのプロデューサーで、バズる動画の構造分析の専門家です。\n${DRAMA_PHILOSOPHY}`,
      messages: [{
        role: 'user',
        content: `以下のYouTubeショートドラマを分析してください。
注：${transcriptNote}

タイトル：${title}
${contentSection}

以下の4点を簡潔に分析してください（各項目3〜4行）：

**① フック**
最初の数秒で何をしているか。視聴者がスクロールを止める理由。

**② 感情軸**
視聴者にどんな感情を呼び起こすか。「これ俺だ」のポイント。

**③ オチ構造**
どのようにオチをつけているか。笑いのメカニズム。

**④ なぜバズったか（仮説）**
タイトル・構成・感情設計の観点から。`,
      }],
    });

    return NextResponse.json({
      analysis: message.content[0]?.text || '',
      transcriptNote,
    });
  }

  // ── type: refs ─────────────────────────────────────────────────────────────
  // 複数の参照 → 共通パターン・応用案・取り込めていない要素を抽出
  if (type === 'refs') {
    const { refs } = body;
    if (!refs || refs.length === 0) {
      return NextResponse.json({ error: 'refs required' }, { status: 400 });
    }

    const refsSummary = refs
      .map((r, i) =>
        `【参考${i + 1}】${(r.platform || '').toUpperCase()} 「${r.title}」\nClaude分析：${r.claude_analysis || 'なし'}\nでおのメモ：${r.user_notes || 'なし'}`
      )
      .join('\n\n');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `あなたはショートドラマのプロデューサーです。\n${DRAMA_PHILOSOPHY}`,
      messages: [{
        role: 'user',
        content: `以下の${refs.length}本の競合ドラマ分析から、パターンを抽出してください。

${refsSummary}

以下の3点を分析してください：

**① 共通する勝ちパターン**
複数の動画に見られる成功要因を箇条書きで。

**② シリーズ「変わる前夜の話。」への応用案**
具体的にどう取り込むか。エピソード例があれば添えて。

**③ まだ取り込めていない要素**
競合が使っているが自分たちが使えていないもの（チャレンジ可能なものを優先して）。`,
      }],
    });

    return NextResponse.json({ patterns: message.content[0]?.text || '' });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
