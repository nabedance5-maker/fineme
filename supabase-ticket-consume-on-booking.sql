-- ✅ 本番適用済 2026-10-22
-- チケットは予約した時点で使ったことにする。来店前にキャンセル（お断り・期限切れ含む）されたら元に戻す（でお要望 2026-10-22）。
-- 予約の作られ方（お客様の予約・予約リクエスト・お店の予約入力・レッスンの参加者追加）やキャンセルの経路
-- （お客様・店舗・LINE・自動の期限切れ）が多いため、DBのトリガーで1か所にまとめて担保する。
-- 1枚＝package_usages の1行（1回で2枚使うメニューは2行）。取り消しは undone_at（行は消さない）。
-- ※ 無断キャンセル等で来店しなかった予約は status を変えない限り使ったまま（戻さない）。

CREATE OR REPLACE FUNCTION reservations_ticket_usage() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  active_now BOOLEAN := NEW.status IN ('pending', 'approved', 'counter_proposed', 'visited');
  active_before BOOLEAN := TG_OP = 'UPDATE' AND OLD.status IN ('pending', 'approved', 'counter_proposed', 'visited');
BEGIN
  IF NEW.package_id IS NULL THEN RETURN NEW; END IF;
  IF active_now AND NOT active_before THEN
    -- 予約した時（またはキャンセル後に予約が戻った時）：まだ記録が無ければ枚数ぶん記録する
    IF NOT EXISTS (SELECT 1 FROM package_usages WHERE reservation_id = NEW.id AND undone_at IS NULL) THEN
      INSERT INTO package_usages (customer_package_id, reservation_id, used_at)
      SELECT NEW.package_id, NEW.id, NOW() FROM generate_series(1, GREATEST(COALESCE(NEW.ticket_cost, 1), 1));
    END IF;
  ELSIF active_before AND NOT active_now THEN
    -- キャンセル・お断り・期限切れ：使った記録を戻す
    UPDATE package_usages SET undone_at = NOW() WHERE reservation_id = NEW.id AND undone_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reservations_ticket_usage_ins ON reservations;
CREATE TRIGGER reservations_ticket_usage_ins AFTER INSERT ON reservations FOR EACH ROW EXECUTE FUNCTION reservations_ticket_usage();
DROP TRIGGER IF EXISTS reservations_ticket_usage_upd ON reservations;
CREATE TRIGGER reservations_ticket_usage_upd AFTER UPDATE OF status ON reservations FOR EACH ROW EXECUTE FUNCTION reservations_ticket_usage();

-- 既に入っている来店前の予約（チケットを紐づけたもの）も、今の時点で使ったことにする
INSERT INTO package_usages (customer_package_id, reservation_id, used_at)
SELECT r.package_id, r.id, NOW() FROM reservations r, generate_series(1, GREATEST(COALESCE(r.ticket_cost, 1), 1))
 WHERE r.package_id IS NOT NULL AND r.status IN ('pending', 'approved', 'counter_proposed')
   AND NOT EXISTS (SELECT 1 FROM package_usages u WHERE u.reservation_id = r.id AND u.undone_at IS NULL);
