-- ✅ 本番適用済 2026-11-09
-- 無断キャンセル（no_show）：来店しなかった予約。チケット・回数券は使ったまま（お客様に戻さない）（2026-11-09 渡邉要望）
-- 予約の状態は text（チェック制約なし）。チケットの記録のトリガーで、no_show も「使った」側に数える。
CREATE OR REPLACE FUNCTION public.reservations_ticket_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_now BOOLEAN := NEW.status IN ('pending', 'approved', 'counter_proposed', 'visited', 'no_show');
  active_before BOOLEAN := TG_OP = 'UPDATE' AND OLD.status IN ('pending', 'approved', 'counter_proposed', 'visited', 'no_show');
BEGIN
  IF NEW.package_id IS NULL THEN RETURN NEW; END IF;
  IF active_now AND NOT active_before THEN
    -- 予約した時（またはキャンセル後に予約が戻った時）：まだ記録が無ければ枚数ぶん記録する
    IF NOT EXISTS (SELECT 1 FROM package_usages WHERE reservation_id = NEW.id AND undone_at IS NULL) THEN
      INSERT INTO package_usages (customer_package_id, reservation_id, used_at)
      SELECT NEW.package_id, NEW.id, NOW() FROM generate_series(1, GREATEST(COALESCE(NEW.ticket_cost, 1), 1));
    END IF;
  ELSIF active_before AND NOT active_now THEN
    -- キャンセル・お断り・期限切れ：使った記録を戻す（無断キャンセルは戻さない）
    UPDATE package_usages SET undone_at = NOW() WHERE reservation_id = NEW.id AND undone_at IS NULL;
  END IF;
  RETURN NEW;
END $function$;

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS no_show_at timestamptz;
