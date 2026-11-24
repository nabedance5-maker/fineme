// GET /api/auth/line-callback?code=xxx&state=xxx
// LINE Login OAuth2.0 コールバック（ユーザー認証・新規登録共通）
import { getSupabase } from '@/lib/supabase';
import { verifyState } from '@/lib/oauth-state';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const BASE_URL = 'https://fineme.me';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    return Response.redirect(`${BASE_URL}/login?line_error=${encodeURIComponent(errorParam)}`);
  }
  if (!code || !stateParam) {
    return Response.redirect(`${BASE_URL}/login?line_error=missing_params`);
  }

  // state の署名と期限（10分）を確かめる（lib/oauth-state.js。2026-11-11 セキュリティ点検：
  // 署名の無い state を受け付けていたため、他人のアカウントにLINEを結びつけられた）
  const stateData = verifyState(stateParam);
  if (!stateData) return Response.redirect(`${BASE_URL}/login?line_error=invalid_state`);
  if (stateData.expired) return Response.redirect(`${BASE_URL}/login?line_error=state_expired`);
  const rawNext = typeof stateData.next === 'string' ? stateData.next : '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\') ? rawNext : '';
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  if (!channelId || !channelSecret) {
    return Response.redirect(`${BASE_URL}/login?line_error=server_config`);
  }

  // code → LINE access token 交換
  let lineAccessToken;
  try {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${BASE_URL}/api/auth/line-callback`,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });
    if (!tokenRes.ok) throw new Error('token_error');
    const tokenData = await tokenRes.json();
    lineAccessToken = tokenData.access_token;
    if (!lineAccessToken) throw new Error('no_token');
  } catch {
    return Response.redirect(`${BASE_URL}/login?line_error=token_exchange_failed`);
  }

  // LINE プロフィールから userId・displayName 取得
  let lineUserId, lineDisplayName;
  try {
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${lineAccessToken}` },
    });
    if (!profileRes.ok) throw new Error('profile_error');
    const p = await profileRes.json();
    lineUserId = p.userId;
    lineDisplayName = p.displayName || '';
    if (!lineUserId) throw new Error('no_user_id');
  } catch {
    return Response.redirect(`${BASE_URL}/login?line_error=profile_fetch_failed`);
  }

  // ── 連携モード ──
  // マイページからの「LINEで連携する」はここに合流する（state.link_user_id あり）。
  // 専用の /api/me/line-callback を使うと Callback URL の登録がもう1本必要になり、
  // 登録漏れで Invalid redirect_uri になるため、登録済みのこのURLに相乗りさせている。
  // スタッフのシフト用リンクからの「LINEで通知を受け取る」（state.link_staff_token あり）
  if (stateData.link_staff_token) {
    const back = `${BASE_URL}/staff-shift/${encodeURIComponent(stateData.link_staff_token)}`;
    const { data: staffRow, error: staffErr } = await supabase
      .from('provider_staff')
      .update({ line_user_id: lineUserId })
      .eq('shift_access_token', stateData.link_staff_token)
      .select('id')
      .maybeSingle();
    if (staffErr || !staffRow) return Response.redirect(`${back}?line_error=save_failed`);
    return Response.redirect(`${back}?line_connected=1`);
  }

  if (stateData.link_user_id) {
    const { error: linkError } = await supabase
      .from('profiles')
      .update({ line_user_id: lineUserId, updated_at: new Date().toISOString() })
      .eq('id', stateData.link_user_id);
    if (linkError) {
      console.error('[line-callback] link error:', linkError);
      return Response.redirect(`${BASE_URL}/mypage/profile?line_error=db_update_failed`);
    }
    return Response.redirect(`${BASE_URL}/mypage/profile?line_connected=1`);
  }

  // LINE ユーザー専用メールアドレス（Supabase auth の識別子として使用）。
  // Supabase はメールアドレスを小文字で保存するため、照合も小文字で行う
  // （LINE の userId は "U..." と大文字で始まり、厳密一致では既存の人が必ず見つからなかった。
  //  2026-11-24 実地確認で /login?line_error=user_lookup_failed が出た原因の1つ）。
  const lineEmail = `line_${lineUserId}@line.fineme.me`.toLowerCase();

  // 既存ユーザーを検索、なければ作成
  let userId;
  try {
    // LINE でログインした時に入るのは、その LINE 専用のアカウント（lineEmail）だけ。
    // マイページで LINE を連携したメールのアカウントには入れない：連携の手続きを他人に踏ませると
    // その人の LINE が別のアカウントに結びつき、LINE ログインで他人のアカウントへ入らせる
    // （ログインの取り違え）ことができてしまうため（2026-11-25 判断）。
    //
    // 以前は profiles を line_user_id で maybeSingle() 検索していたが、同じ LINE が複数の
    // アカウントに入っていると（LINE専用＋メールのアカウントへ連携）2件で失敗し、さらにメールの
    // 大文字・小文字の違いで既存の LINE 専用アカウントも見つからず user_lookup_failed になっていた。
    // ここでは line_user_id の持ち主の中から、メールアドレスが lineEmail のものだけを選ぶ。
    const { data: linked } = await supabase
      .from('profiles')
      .select('id')
      .eq('line_user_id', lineUserId)
      .limit(10);
    for (const row of linked || []) {
      const { data: u } = await supabase.auth.admin.getUserById(row.id);
      if (String(u?.user?.email || '').toLowerCase() === lineEmail) { userId = row.id; break; }
    }

    if (!userId) {
      // まず作成を試みる（既存なら error になる）
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: lineEmail,
        email_confirm: true,
        user_metadata: { display_name: lineDisplayName, line_user_id: lineUserId },
      });

      if (createError) {
        // 既存ユーザーの場合 → email が一致するユーザーをページ検索（小文字どうしで比べる）
        let found = null;
        let page = 1;
        while (!found && page <= 200) {
          const { data: pg } = await supabase.auth.admin.listUsers({ page, perPage: 50 });
          if (!pg?.users?.length) break;
          found = pg.users.find(u => String(u.email || '').toLowerCase() === lineEmail) || null;
          if (pg.users.length < 50) break;
          page++;
        }
        if (!found) {
          console.error('[line-callback] user lookup failed:', createError?.message);
          return Response.redirect(`${BASE_URL}/login?line_error=user_lookup_failed`);
        }
        userId = found.id;
      } else {
        userId = newUser.user.id;
        // profiles に line_user_id を保存
        await supabase
          .from('profiles')
          .upsert({ id: userId, line_user_id: lineUserId, display_name: lineDisplayName, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      }
    }

    // 既存ユーザーにも line_user_id が未セットなら更新
    if (userId) {
      await supabase
        .from('profiles')
        .update({ line_user_id: lineUserId, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .is('line_user_id', null);
    }
  } catch {
    return Response.redirect(`${BASE_URL}/login?line_error=user_create_failed`);
  }

  // Supabase magic link を生成してセッションを確立させる
  const redirectTo = next
    ? `${BASE_URL}/auth/line-session?next=${encodeURIComponent(next)}`
    : `${BASE_URL}/auth/line-session`;

  let actionLink;
  try {
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: lineEmail,
      options: { redirectTo },
    });
    if (linkError || !linkData?.properties?.action_link) throw new Error('link_error');
    actionLink = linkData.properties.action_link;
  } catch {
    return Response.redirect(`${BASE_URL}/login?line_error=session_create_failed`);
  }

  return Response.redirect(actionLink);
}
