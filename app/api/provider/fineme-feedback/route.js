// GET  /api/provider/fineme-feedback → 自店舗が送った意見の一覧（運営の対応状況・返信つき）
// POST /api/provider/fineme-feedback → Finemeへの意見を送る（でお要望2026-10-16：
//   使い勝手の生の声を運営管理画面 /admin/provider-feedback に溜めて対応していくため）
export const dynamic = 'force-dynamic';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const CATEGORIES = ['usability', 'bug', 'request', 'other'];
const CATEGORY_LABEL = { usability: '使い勝手', bug: '不具合', request: '機能の要望', other: 'その他' };
const MAX_LEN = 4000;

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name, slug').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('provider_feedback')
    .select('id, category, tab, message, status, admin_note, created_at, updated_at')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const message = String(body.message || '').trim();
  if (!message) return Response.json({ error: 'ご意見の内容を入力してください' }, { status: 400 });
  if (message.length > MAX_LEN) return Response.json({ error: `${MAX_LEN}文字以内で入力してください` }, { status: 400 });
  const category = CATEGORIES.includes(body.category) ? body.category : 'usability';
  const tab = typeof body.tab === 'string' && body.tab.trim() ? body.tab.trim().slice(0, 100) : null;

  const { data, error } = await supabase
    .from('provider_feedback')
    .insert({
      provider_id: provider.id,
      category,
      tab,
      message,
      user_agent: (request.headers.get('user-agent') || '').slice(0, 300) || null,
    })
    .select('id, category, tab, message, status, admin_note, created_at')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 運営への通知（届いたことに気づけるように）。失敗しても送信自体は成立させる。
  if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Fineme <noreply@fineme.me>',
        to: process.env.ADMIN_EMAIL,
        subject: `【掲載者からの意見】${provider.name || '店舗'}（${CATEGORY_LABEL[category]}）`,
        text: [
          `${provider.name || '店舗'}（${provider.slug || '-'}）からFinemeへの意見が届きました。`,
          '',
          `種類: ${CATEGORY_LABEL[category]}`,
          `対象の画面: ${tab || '指定なし'}`,
          '',
          message,
          '',
          '運営管理画面で確認: https://www.fineme.me/admin/provider-feedback',
        ].join('\n'),
      });
    } catch (e) { console.error('[provider-feedback notify]', e); }
  }

  return Response.json(data);
}
