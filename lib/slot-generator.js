// 即時予約の空き枠を、営業時間から自動生成するロジック（でお要望2026-09-14）。
// 「空き枠を手動で1つずつ登録させるのは非効率。営業時間さえ分かれば自動で
// 生成すべき」との指摘を受けて新設。スタッフ指名予約がONの店舗はスタッフ
// ごとに（各スタッフが同時間帯に対応可能という前提で）、OFFの店舗は
// スタッフ無しの枠を1つだけ生成する。
import { getSupabase } from '@/lib/supabase';
import { hasFeature } from '@/lib/feature-flags';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function fromMinutes(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * @param {string} date - YYYY-MM-DD
 * @param {object} businessHours - {mon:{open,close,closed}, ...}
 * @param {number} durationMinutes - 枠の刻み幅
 * @param {Array<string>} staffIds - スタッフ指名予約ONの場合、このスタッフごとに枠を作る（空配列/nullならスタッフ無しで1つ）
 * @returns {Array<{date, start_time, end_time, staff_id, capacity, auto_generated}>}
 */
export function generateSlotsForDate(date, businessHours, durationMinutes, staffIds) {
  const weekday = WEEKDAY_KEYS[new Date(date + 'T00:00:00Z').getUTCDay()];
  const hours = (businessHours || {})[weekday];
  if (!hours || hours.closed || !hours.open || !hours.close) return [];

  const dur = Number(durationMinutes) > 0 ? Number(durationMinutes) : 60;
  const start = toMinutes(hours.open);
  const end = toMinutes(hours.close);
  const targets = (staffIds && staffIds.length) ? staffIds : [null];

  const slots = [];
  for (let m = start; m + dur <= end; m += dur) {
    targets.forEach(staffId => {
      slots.push({
        date,
        start_time: fromMinutes(m),
        end_time: fromMinutes(m + dur),
        staff_id: staffId,
        capacity: 1,
        auto_generated: true,
      });
    });
  }
  return slots;
}

/**
 * 指定日数分（今日を含む）の枠をまとめて生成する。
 * @param {object} params
 * @param {object} params.businessHours
 * @param {number} params.durationMinutes
 * @param {Array<string>} params.staffIds
 * @param {number} params.days - 生成する日数
 * @param {string} [params.fromDate] - 省略時は今日（サーバーのタイムゾーンに依存しないようYYYY-MM-DD文字列で渡すのが望ましい）
 */
export function generateSlotsForRange({ businessHours, durationMinutes, staffIds, days, fromDate }) {
  const start = fromDate ? new Date(fromDate + 'T00:00:00Z') : new Date();
  const all = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    all.push(...generateSlotsForDate(dateStr, businessHours, durationMinutes, staffIds));
  }
  return all;
}

// DB連携込みの実行本体：店舗の設定を読み、既存枠と重複しない分だけ挿入する。
// 手動トリガー（/api/provider/slots/auto-generate）とcron（/api/cron/generate-slots）の
// 両方から呼ばれる共有ロジック。
export async function generateForProvider(providerId, days) {
  const { data: provider } = await supabase
    .from('providers')
    .select('id, business_hours, slot_duration_minutes, enabled_features')
    .eq('id', providerId)
    .single();
  if (!provider) return { createdCount: 0 };

  let staffIds = null;
  if (hasFeature(provider, 'staff_designation')) {
    const { data: staffRows } = await supabase.from('provider_staff').select('id').eq('provider_id', providerId).eq('bookable', true);
    if (staffRows?.length) staffIds = staffRows.map(s => s.id);
  }

  const candidates = generateSlotsForRange({
    businessHours: provider.business_hours || {},
    durationMinutes: provider.slot_duration_minutes || 60,
    staffIds,
    days: days || 14,
  });
  if (!candidates.length) return { createdCount: 0 };

  const fromDate = candidates[0].date;
  const toDate = candidates[candidates.length - 1].date;
  const { data: existing } = await supabase
    .from('provider_slots')
    .select('date, start_time, staff_id')
    .eq('provider_id', providerId)
    .gte('date', fromDate)
    .lte('date', toDate);
  const existingSet = new Set((existing || []).map(s => `${s.date}|${s.start_time}|${s.staff_id || ''}`));

  const rows = candidates
    .filter(c => !existingSet.has(`${c.date}|${c.start_time}|${c.staff_id || ''}`))
    .map(c => ({ ...c, provider_id: providerId }));

  if (!rows.length) return { createdCount: 0 };

  const { error } = await supabase.from('provider_slots').insert(rows);
  if (error) throw new Error(error.message);

  return { createdCount: rows.length };
}
