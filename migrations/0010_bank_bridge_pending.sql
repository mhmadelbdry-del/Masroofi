-- Additive. Notifications now arrive WITHOUT a category and wait here until the user picks one in the app.
-- Only amount and notification time are stored. Resolving inserts the expense with this row's id; dismissing deletes the row.
-- Repeat deliveries stay deduplicated by bank_sms_receipts (not touched here), so a resolved or dismissed item never comes back.
alter table bank_bridge_devices alter column category_id drop not null;
create table if not exists bank_bridge_pending (
  id text primary key,
  device_id text not null,
  user_id text not null,
  household_id text not null,
  member_id text not null,
  sms_key text not null,
  amount numeric(12,2) not null check (amount > 0),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists bank_bridge_pending_user_idx on bank_bridge_pending (user_id, created_at);
