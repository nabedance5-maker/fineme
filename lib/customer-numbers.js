// 店舗ごとの顧客会員番号（provider_customer_numbers）。店舗内で1から振る連番。
// 会員（user_id）・非会員（manual_customer_id）どちらにも振り、一覧表示・検索で使う。
// 番号は一覧を開いた時に未採番の顧客へ遅延採番する（採番漏れを気にせず済むように）。

const MAX_RETRY = 3;

export function formatMemberNumber(n) {
  return n == null ? '' : String(n).padStart(4, '0');
}

// userIds / manualIds は採番したい順（先頭ほど小さい番号）で渡す。
// 返り値: { user: {userId: number}, manual: {manualId: number} }
export async function ensureCustomerNumbers(supabase, providerId, { userIds = [], manualIds = [] } = {}) {
  const user = {};
  const manual = {};
  if (!userIds.length && !manualIds.length) return { user, manual };

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    const { data: rows, error } = await supabase
      .from('provider_customer_numbers')
      .select('user_id, manual_customer_id, member_number')
      .eq('provider_id', providerId);
    if (error) throw new Error(error.message);

    let max = 0;
    Object.keys(user).forEach(k => delete user[k]);
    Object.keys(manual).forEach(k => delete manual[k]);
    const userWanted = new Set(userIds);
    const manualWanted = new Set(manualIds);
    (rows || []).forEach(r => {
      if (r.member_number > max) max = r.member_number;
      if (r.user_id && userWanted.has(r.user_id)) user[r.user_id] = r.member_number;
      if (r.manual_customer_id && manualWanted.has(r.manual_customer_id)) manual[r.manual_customer_id] = r.member_number;
    });

    const inserts = [];
    userIds.forEach(id => { if (!(id in user)) inserts.push({ provider_id: providerId, user_id: id, member_number: ++max }); });
    manualIds.forEach(id => { if (!(id in manual)) inserts.push({ provider_id: providerId, manual_customer_id: id, member_number: ++max }); });
    if (!inserts.length) return { user, manual };

    const { error: insErr } = await supabase.from('provider_customer_numbers').insert(inserts);
    if (!insErr) {
      inserts.forEach(r => {
        if (r.user_id) user[r.user_id] = r.member_number;
        else manual[r.manual_customer_id] = r.member_number;
      });
      return { user, manual };
    }
    // 同時リクエストで番号が衝突したら読み直してやり直す
    if (insErr.code !== '23505' || attempt === MAX_RETRY - 1) throw new Error(insErr.message);
  }
  return { user, manual };
}

// 非会員を会員に紐付けた時、店頭で案内済みの番号が変わらないよう非会員の番号を会員へ引き継ぐ。
// 会員側が既に番号を持っている場合は会員の番号を残し、非会員の番号は破棄する。
export async function transferManualNumberToUser(supabase, providerId, manualId, userId) {
  const { data: manualRow } = await supabase
    .from('provider_customer_numbers')
    .select('id')
    .eq('provider_id', providerId)
    .eq('manual_customer_id', manualId)
    .maybeSingle();
  if (!manualRow) return;

  const { data: userRow } = await supabase
    .from('provider_customer_numbers')
    .select('id')
    .eq('provider_id', providerId)
    .eq('user_id', userId)
    .maybeSingle();

  if (userRow) {
    await supabase.from('provider_customer_numbers').delete().eq('id', manualRow.id);
  } else {
    await supabase.from('provider_customer_numbers').update({ user_id: userId, manual_customer_id: null }).eq('id', manualRow.id);
  }
}
