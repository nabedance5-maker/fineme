// 店舗ごとの顧客会員番号（provider_customer_numbers）。店舗内で1から振る連番。
// 会員（user_id）・非会員（manual_customer_id）どちらにも振り、一覧表示・検索で使う。
// 番号は一覧を開いた時に未採番の顧客へ遅延採番する（採番漏れを気にせず済むように）。

const MAX_RETRY = 4;
const LOOKUP_CHUNK = 150;
const INSERT_CHUNK = 500;

export function formatMemberNumber(n) {
  return n == null ? '' : String(n);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// 欲しい顧客の番号だけをIDで引く（店舗の全件を読まない。件数が何億になっても1クエリ数百件に収まる）
async function fetchExisting(supabase, providerId, column, ids, target) {
  for (const part of chunk(ids, LOOKUP_CHUNK)) {
    const { data, error } = await supabase
      .from('provider_customer_numbers')
      .select(`${column}, member_number`)
      .eq('provider_id', providerId)
      .in(column, part);
    if (error) throw new Error(error.message);
    (data || []).forEach(r => { target[r[column]] = Number(r.member_number); });
  }
}

async function fetchMax(supabase, providerId) {
  const { data, error } = await supabase
    .from('provider_customer_numbers')
    .select('member_number')
    .eq('provider_id', providerId)
    .order('member_number', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data && data.length ? Number(data[0].member_number) : 0;
}

// userIds / manualIds は採番したい順（先頭ほど小さい番号）で渡す。
// 返り値: { user: {userId: number}, manual: {manualId: number} }
export async function ensureCustomerNumbers(supabase, providerId, { userIds = [], manualIds = [] } = {}) {
  let user = {};
  let manual = {};
  if (!userIds.length && !manualIds.length) return { user, manual };

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    user = {};
    manual = {};
    await fetchExisting(supabase, providerId, 'user_id', userIds, user);
    await fetchExisting(supabase, providerId, 'manual_customer_id', manualIds, manual);

    const missingUsers = userIds.filter(id => !(id in user));
    const missingManuals = manualIds.filter(id => !(id in manual));
    if (!missingUsers.length && !missingManuals.length) return { user, manual };

    let max = await fetchMax(supabase, providerId);
    const inserts = [];
    missingUsers.forEach(id => inserts.push({ provider_id: providerId, user_id: id, member_number: ++max }));
    missingManuals.forEach(id => inserts.push({ provider_id: providerId, manual_customer_id: id, member_number: ++max }));

    let conflict = false;
    for (const part of chunk(inserts, INSERT_CHUNK)) {
      const { error: insErr } = await supabase.from('provider_customer_numbers').insert(part);
      if (insErr) {
        // 同時リクエストで番号が衝突したら読み直してやり直す
        if (insErr.code !== '23505' || attempt === MAX_RETRY - 1) throw new Error(insErr.message);
        conflict = true;
        break;
      }
    }
    if (!conflict) {
      inserts.forEach(r => {
        if (r.user_id) user[r.user_id] = r.member_number;
        else manual[r.manual_customer_id] = r.member_number;
      });
      return { user, manual };
    }
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
