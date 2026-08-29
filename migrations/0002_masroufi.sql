create table if not exists households (
  id text primary key,
  monthly_income numeric(12,2) not null default 0,
  savings_goal numeric(12,2) not null default 0,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create index if not exists household_members_household_id_idx
  on household_members (household_id);

create table if not exists household_users (
  user_id text primary key,
  household_id text not null references households(id) on delete cascade,
  member_id text not null references household_members(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists household_users_household_id_idx
  on household_users (household_id);

create table if not exists categories (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('necessity', 'extra', 'unexpected')),
  monthly_limit numeric(12,2) not null default 0,
  sort_order int not null default 0,
  archived boolean not null default false
);

create index if not exists categories_household_id_idx
  on categories (household_id);

create table if not exists expenses (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  category_id text not null references categories(id) on delete restrict,
  description text not null,
  amount numeric(12,2) not null,
  occurred_at timestamptz not null default now(),
  created_by_member_id text not null references household_members(id),
  updated_by_member_id text not null references household_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_household_occurred_idx
  on expenses (household_id, occurred_at desc);

create table if not exists reflections (
  household_id text not null references households(id) on delete cascade,
  year int not null,
  month int not null,
  note text not null default '',
  updated_by_member_id text references household_members(id),
  updated_at timestamptz not null default now(),
  primary key (household_id, year, month)
);
