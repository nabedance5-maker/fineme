// POST /api/mirror/report
// paid=true が確定したMirrorセッションについて、保存済み写真を使いClaude Haikuで
// ビジュアルレポート（STEP1-15相当のリッチ構造化JSON）を生成・キャッシュする。
// 画像生成AIは使わない。生成結果は app/_components/MirrorReportCard.js がHTML/CSSで描画する。
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { buildReportPrompt } from '@/lib/mirror-report-prompt';
import { validateReportContent } from '@/lib/mirror-report-content';

export const maxDuration = 60;

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

function mediaTypeFromPath(path) {
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function signPhotoUrl(photoPath) {
  if (!photoPath) return null;
  const { data, error } = await supabase.storage.from('mirror-photos').createSignedUrl(photoPath, 300);
  if (error) return null;
  return data.signedUrl;
}

export async function POST(request) {
  try {
    const { session_id } = await request.json();
    if (!session_id) {
      return Response.json({ error: 'session_id が必要です' }, { status: 400 });
    }

    const { data: sessionRow, error: fetchError } = await supabase
      .from('mirror_sessions')
      .select('id, paid, gender, photo_type, age_band, photo_path, report_status, report_content')
      .eq('id', session_id)
      .single();

    if (fetchError || !sessionRow) {
      return Response.json({ error: 'セッションが見つかりません' }, { status: 404 });
    }
    if (!sessionRow.paid) {
      return Response.json({ error: '未購入のセッションです' }, { status: 403 });
    }

    // 冪等: 生成済みならHaikuを再呼び出しせず、写真の署名URLだけ再発行して返す
    if (sessionRow.report_status === 'ready' && sessionRow.report_content) {
      return Response.json({
        status: 'ready',
        report_content: sessionRow.report_content,
        photo_url: await signPhotoUrl(sessionRow.photo_path),
      });
    }

    if (!sessionRow.photo_path) {
      return Response.json({ error: '写真が見つかりません（保存期限切れの可能性があります）' }, { status: 400 });
    }

    try {
      const { data: photoBlob, error: downloadError } = await supabase.storage
        .from('mirror-photos')
        .download(sessionRow.photo_path);
      if (downloadError || !photoBlob) throw new Error(downloadError?.message || '写真の取得に失敗しました');

      const photoBuffer = Buffer.from(await photoBlob.arrayBuffer());
      const photoBase64 = photoBuffer.toString('base64');
      const mediaType = mediaTypeFromPath(sessionRow.photo_path);

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const systemPrompt = buildReportPrompt({
        gender: sessionRow.gender,
        photoTypeHint: sessionRow.photo_type,
        ageBand: sessionRow.age_band,
      });

      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 12000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: photoBase64 } },
            { type: 'text', text: 'この写真を分析して、Fineme Mirror のビジュアルレポートをJSON形式で出力してください。' },
          ],
        }],
      });

      const raw = message.content[0]?.text?.trim() || '{}';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      const reportContent = validateReportContent(parsed);
      if (!reportContent) throw new Error('レポート内容の形式が不正です');

      await supabase
        .from('mirror_sessions')
        .update({ report_status: 'ready', report_content: reportContent, report_error: null })
        .eq('id', session_id);

      return Response.json({
        status: 'ready',
        report_content: reportContent,
        photo_url: await signPhotoUrl(sessionRow.photo_path),
      });
    } catch (genError) {
      console.error('mirror report generation error:', genError);
      await supabase
        .from('mirror_sessions')
        .update({ report_status: 'failed', report_error: String(genError.message || genError).slice(0, 500) })
        .eq('id', session_id);
      return Response.json({ error: 'レポート生成に失敗しました。もう一度お試しください。' }, { status: 500 });
    }
  } catch (e) {
    console.error('mirror report route error:', e);
    return Response.json({ error: `レポート生成エラー: ${e.message}` }, { status: 500 });
  }
}
