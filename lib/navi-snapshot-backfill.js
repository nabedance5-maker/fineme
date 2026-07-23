// 月次スナップショット（navi_snapshots）の欠落月を、来訪時に自己修復的に埋める。
// cronではなく visit時バックフィル方式：受益者は「戻ってきて過去を振り返るユーザー」に
// 限られるため、来訪をトリガーにする方が計算コストと価値提供のタイミングが一致する。
import { getSupabase } from '@/lib/supabase';

export async function ensureMonthlySnapshots(userId) {
  const supabase = getSupabase();

  const { data: profile } = await supabase
    .from('profiles')
    .select('navi_steps, axis_progress')
    .eq('id', userId)
    .single();

  const naviSteps = profile?.navi_steps;
  if (!naviSteps?.generated_at) return;

  const { data: existing } = await supabase
    .from('navi_snapshots')
    .select('year_month')
    .eq('user_id', userId);
  const existingMonths = new Set((existing || []).map(s => s.year_month));

  const currentMonth = new Date().toISOString().slice(0, 7);
  const startMonth = String(naviSteps.generated_at).slice(0, 7);
  if (startMonth >= currentMonth) return;

  // generated_atの月〜前月までの欠落月を列挙（上限12ヶ月）。
  // 過去の正確な状態は復元不可能なため、現在の navi_steps/axis_progress で埋める。
  const missing = [];
  const cursor = new Date(`${startMonth}-01T00:00:00Z`);
  const end = new Date(`${currentMonth}-01T00:00:00Z`);
  while (cursor < end && missing.length < 12) {
    const ym = cursor.toISOString().slice(0, 7);
    if (!existingMonths.has(ym)) missing.push(ym);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  if (missing.length === 0) return;

  const rows = missing.map(ym => ({
    user_id: userId,
    year_month: ym,
    navi_steps: naviSteps,
    axis_progress: profile?.axis_progress ?? null,
  }));

  await supabase
    .from('navi_snapshots')
    .upsert(rows, { onConflict: 'user_id,year_month', ignoreDuplicates: true });

  await supabase
    .from('profiles')
    .update({ last_monthly_snapshot: currentMonth })
    .eq('id', userId);
}
