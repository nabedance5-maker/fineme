// POST /api/feedback/mirror
// Mirror 利用後の声を受け取り mirror_feedback テーブルに保存する
import { getSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { session_id, text } = await request.json();

    if (!session_id || !text?.trim()) {
      return Response.json({ error: 'session_id と text は必須です' }, { status: 400 });
    }
    if (text.trim().length > 2000) {
      return Response.json({ error: 'テキストが長すぎます（2000文字以内）' }, { status: 400 });
    }

    const db = getSupabase();

    // 対象セッションが paid かつ存在するか確認
    const { data: session, error: sessionError } = await db
      .from('mirror_sessions')
      .select('id, paid')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return Response.json({ error: 'セッションが見つかりません' }, { status: 404 });
    }
    if (!session.paid) {
      return Response.json({ error: '無効なセッションです' }, { status: 403 });
    }

    const { error: insertError } = await db
      .from('mirror_feedback')
      .insert({ session_id, text: text.trim() });

    if (insertError) {
      console.error('[feedback/mirror] insert error:', insertError);
      return Response.json({ error: '保存に失敗しました' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
