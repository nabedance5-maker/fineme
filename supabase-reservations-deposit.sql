-- ✅ 本番適用済 2026-09-27
-- 予約デポジット（決済機能Phase6③・でお要望2026-09-27「決済機能も最後のステップまで」）
-- 店舗が予約時に前払いデポジットを設定できる。即時予約（instant_booking、その場で確定する枠）
-- のみ対象——申請制はまだ店舗が承認するかどうかも決まっておらず、確定前に課金するのは
-- 順序として不自然なため対象外（Phase 1のinstant/request分岐と同じ考え方）。
-- 決済連携（payment_mediation）フラグがONの店舗のみ、deposit_amountを設定できる。

alter table providers
  add column if not exists deposit_amount integer;

alter table reservations
  add column if not exists deposit_amount integer,
  add column if not exists deposit_status text default 'none' check (deposit_status in ('none', 'pending', 'paid', 'refunded', 'failed')),
  add column if not exists stripe_deposit_session_id text,
  add column if not exists stripe_deposit_payment_intent_id text;
