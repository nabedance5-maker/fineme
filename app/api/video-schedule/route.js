export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// GET /api/video-schedule — 全スケジュール取得
export async function GET() {
  const { data, error } = await supabase
    .from('video_schedule')
    .select('*')
    .order('scheduled_date', { ascending: true, nullsFirst: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// POST /api/video-schedule — 登録 or 更新（video_idでupsert）
export async function POST(req) {
  const body = await req.json();
  const { video_id, video_title, scheduled_date, youtube_done, reels_done, tiktok_done, notes } = body;

  if (!video_id) return Response.json({ error: 'video_id is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('video_schedule')
    .upsert({
      video_id,
      video_title,
      scheduled_date: scheduled_date || null,
      youtube_done: youtube_done ?? false,
      reels_done: reels_done ?? false,
      tiktok_done: tiktok_done ?? false,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'video_id' })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
