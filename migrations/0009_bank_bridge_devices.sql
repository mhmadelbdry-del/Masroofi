-- Additive. Per-device, revocable credentials for the notification bridge.
-- Only a SHA-256 hash of the token is stored; the token itself is shown once at enrollment.
create table if not exists bank_bridge_devices (
  id text primary key,
  user_id text not null,
  household_id text not null,
  member_id text not null,
  category_id text not null,
  label text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists bank_bridge_devices_user_idx on bank_bridge_devices (user_id);

-- Failed-token throttle. Stores a hash of the caller address and a time, nothing else.
create table if not exists bank_bridge_failures (ip_hash text not null, at timestamptz not null);
create index if not exists bank_bridge_failures_idx on bank_bridge_failures (ip_hash, at);
