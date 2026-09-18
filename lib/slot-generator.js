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

// サーバー（Vercel）はUTCタイムゾーンで動くため、new Date()を素直に使うと
// JST 0:00〜9:00の間だけ「日本時間の前日」の日付になってしまっていた
// （でお報告2026-09-15：「予約カレンダーの日付がズレてる。今日は9/15なのに
// 9/14が表示されてる」。手動で「今すぐ枠を生成する」を押した時にこの時間帯だと、
// 前日付けの枠が生成されカレンダーがその日を指してしまっていた）。
// Financeは日本国内向けサービスのため、「今日」は常に日本時間で判定する。
function todayInJST() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
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
  const start = new Date((fromDate || todayInJST()) + 'T00:00:00Z');
  const all = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    all.push(...generateSlotsForDate(dateStr, businessHours, durationMinutes, staffIds));
  }
  return all;
}

// 候補スロットのうち、時間帯が重なるものを除外する共通ヘルパー。
// intervals: [{staffId, date, start, end}] のような「除外すべき区間」の配列を受け取り、
// candidate（{staff_id, date, start_time, end_time}）が1つでも重なればtrue。
function overlaps(aStart, aEnd, bStart, bEnd) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
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

  let candidates = generateSlotsForRange({
    businessHours: provider.business_hours || {},
    durationMinutes: provider.slot_duration_minutes || 60,
    staffIds,
    days: days || 14,
  });
  if (!candidates.length) return { createdCount: 0 };

  const fromDate = candidates[0].date;
  const toDate = candidates[candidates.length - 1].date;

  // 臨時休業日（でお要望2026-09-18：「特定の1日だけ臨時休業、みたいな例外日の設定も
  // できるようにしたい」）。曜日ベースの営業時間だけでは表現できない不定休に対応する。
  const { data: closedDates } = await supabase
    .from('provider_closed_dates')
    .select('date')
    .eq('provider_id', providerId)
    .gte('date', fromDate)
    .lte('date', toDate);
  if (closedDates?.length) {
    const closedSet = new Set(closedDates.map(c => c.date));
    candidates = candidates.filter(c => !closedSet.has(c.date));
    if (!candidates.length) return { createdCount: 0 };
  }

  // スタッフの休憩・外出ブロック（でお要望2026-09-14）と重なる候補は生成しない
  // （「自動でブロックして予約が入らないように」）。
  const { data: staffBlocks } = await supabase
    .from('provider_staff_blocks')
    .select('staff_id, date, start_time, end_time')
    .eq('provider_id', providerId)
    .gte('date', fromDate)
    .lte('date', toDate);
  if (staffBlocks?.length) {
    candidates = candidates.filter(c => {
      if (!c.staff_id) return true;
      return !staffBlocks.some(b => b.staff_id === c.staff_id && b.date === c.date && overlaps(c.start_time, c.end_time, b.start_time, b.end_time));
    });
  }

  // シフト管理がONの店舗は、確定済みシフトでカバーされている日については、
  // そのスタッフの勤務時間内だけに候補を絞り込む（勤務していない時間に予約が
  // 入らないようにする。でお要望2026-09-14）。確定シフトが無い日はこれまで通り
  // 営業時間ベースのまま（シフト機能を使っていない大半の店舗の挙動は変えない）。
  if (hasFeature(provider, 'shift_management')) {
    const { data: periods } = await supabase
      .from('provider_shift_periods')
      .select('id, period_start, period_end')
      .eq('provider_id', providerId)
      .eq('status', 'confirmed')
      .lte('period_start', toDate)
      .gte('period_end', fromDate);
    const periodIds = (periods || []).map(p => p.id);
    if (periodIds.length) {
      const { data: entries } = await supabase
        .from('provider_shift_entries')
        .select('staff_id, date, start_time, end_time')
        .in('period_id', periodIds)
        .gte('date', fromDate)
        .lte('date', toDate);
      // その日付がどれかの確定期間に含まれるかどうかの判定用
      const coveredDates = new Set();
      (periods || []).forEach(p => {
        let d = new Date(p.period_start + 'T00:00:00Z');
        const end = new Date(p.period_end + 'T00:00:00Z');
        while (d <= end) { coveredDates.add(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
      });
      candidates = candidates.filter(c => {
        if (!c.staff_id || !coveredDates.has(c.date)) return true; // シフト対象外の日・スタッフ無し枠はそのまま
        const windows = (entries || []).filter(e => e.staff_id === c.staff_id && e.date === c.date);
        if (!windows.length) return false; // その日は出勤予定が無い＝候補から除外
        return windows.some(w => toMinutes(c.start_time) >= toMinutes(w.start_time) && toMinutes(c.end_time) <= toMinutes(w.end_time));
      });
    }
  }

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
