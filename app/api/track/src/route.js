// GET /api/track/src?src=<value>
// 診断ページ（/diagnosis?src=*）への流入元をsns_postsに記録する。
// D-20260712-3: CTA張り替え後の流入計測。migration不要（既存sns_postsを再利用）。

import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SRC_ALLOW = /^[a-z0-9_]{1,60}$/;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get('src');
  if (!src || !SRC_ALLOW.test(src)) return Response.json({ ok: false });

  try {
    const sb = getSupabase();
    await sb.from('sns_posts').insert({
      channel: 'src_inbound',
      post_type: src,
      text: `diagnosis_visit:${src}`,
      posted: true,
    });
  } catch {}

  return Response.json({ ok: true });
}
