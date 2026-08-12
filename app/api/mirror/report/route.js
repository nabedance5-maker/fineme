// POST /api/mirror/report
// paid=true が確定したMirrorセッションについて、保存済み写真を使いClaude Haikuで
// 「フル統合分析」を1回だけ生成・キャッシュする。統合分析は以下の両方を兼ねる:
//   - mirror_sessions.analysis（旧axes形式。New Me Map / New Me Navi / 月次比較が
//     依存する唯一のデータソース。ここを更新することで新しいMirror結果がそのまま
//     Map・Naviのパーソナライズに反映される）
//   - mirror_sessions.report_content（STEP1-15相当のリッチなビジュアルレポート。
//     MirrorReportCardがHTML/CSSで描画する）
// 画像生成AIは使わない。
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { buildReportPrompt } from '@/lib/mirror-report-prompt';
import { validateReportContent, validateAxesPayload, REPORT_SCHEMA_VERSION } from '@/lib/mirror-report-content';
import { fetchCuratedPostsPrompt } from '@/lib/mirror-analysis-shared';

export const maxDuration = 90;

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

// ログイン済みユーザーの状態（guest/member/diagnosed）をサーバー側で判定。
// クライアントの自己申告に頼らず diagnosis_results の実在で判定する。
async function resolveUserState(userId, gender) {
  if (!userId) return 'guest';
  try {
    const track = gender === 'female' ? 'belle' : 'fineme';
    const { data } = await supabase
      .from('diagnosis_results')
      .select('id')
      .eq('user_id', userId)
      .eq('track', track)
      .limit(1);
    return data?.length ? 'diagnosed' : 'member';
  } catch {
    return 'member';
  }
}

export async function POST(request) {
  try {
    const { session_id } = await request.json();
    if (!session_id) {
      return Response.json({ error: 'session_id が必要です' }, { status: 400 });
    }

    const { data: sessionRow, error: fetchError } = await supabase
      .from('mirror_sessions')
      .select('id, user_id, paid, gender, photo_type, age_band, photo_path, report_status, report_content')
      .eq('id', session_id)
      .single();

    if (fetchError || !sessionRow) {
      return Response.json({ error: 'セッションが見つかりません' }, { status: 404 });
    }
    if (!sessionRow.paid) {
      return Response.json({ error: '未購入のセッションです' }, { status: 403 });
    }

    // 冪等: 生成済みかつ現行のスコアリングロジックと同じバージョンならHaikuを
    // 再呼び出しせず、写真の署名URLだけ再発行して返す。バージョンが古い場合は
    // （採点ロジック変更後の再生成漏れバグの再発防止）キャッシュを使わず再生成する。
    if (
      sessionRow.report_status === 'ready' &&
      sessionRow.report_content &&
      sessionRow.report_content.schema_version === REPORT_SCHEMA_VERSION
    ) {
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

      const [userState, curatedPostsPrompt] = await Promise.all([
        resolveUserState(sessionRow.user_id, sessionRow.gender),
        fetchCuratedPostsPrompt(sessionRow.gender),
      ]);

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const systemPrompt = buildReportPrompt({
        gender: sessionRow.gender,
        photoTypeHint: sessionRow.photo_type,
        ageBand: sessionRow.age_band,
        userState,
        curatedPostsPrompt,
      });

      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 14000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: photoBase64 } },
            { type: 'text', text: 'この写真を分析して、Fineme Mirror のフル分析（axes + ビジュアルレポート）をJSON形式で出力してください。' },
          ],
        }],
      });

      const raw = message.content[0]?.text?.trim() || '{}';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

      const axesPayload = validateAxesPayload(parsed);
      if (!axesPayload) throw new Error('axes の形式が不正です');
      const reportContent = validateReportContent(parsed);
      if (!reportContent) throw new Error('レポート内容の形式が不正です');

      // analysis を更新することで、New Me Map / New Me Navi / 月次比較が
      // このセッションを読む際、次回から自動的に今回の分析結果を使うようになる
      // （それらのコード側は一切変更不要 — mirror_sessions.analysis だけを見ているため）
      await supabase
        .from('mirror_sessions')
        .update({ analysis: axesPayload, report_status: 'ready', report_content: reportContent, report_error: null })
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
