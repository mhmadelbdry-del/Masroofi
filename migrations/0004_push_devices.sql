create table if not exists push_devices (
  token text primary key,
  user_id text not null,
  household_id text not null references households(id) on delete cascade,
  platform text not null default 'android' check (platform in ('android', 'ios', 'web')),
  updated_at timestamptz not null default now()
);

create index if not exists push_devices_household_idx
  on push_devices (household_id, updated_at desc);

create index if not exists push_devices_user_idx
  on push_devices (user_id);
