create table if not exists home_requests (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  quantity text not null default '1' check (char_length(quantity) between 1 and 40),
  completed boolean not null default false,
  completed_at timestamptz,
  created_by_member_id text not null references household_members(id),
  completed_by_member_id text references household_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed = false or completed_by_member_id is not null)
);

create index if not exists home_requests_household_completed_idx
  on home_requests (household_id, completed, created_at desc);

create index if not exists home_requests_created_by_member_idx
  on home_requests (created_by_member_id);

create index if not exists home_requests_completed_by_member_idx
  on home_requests (completed_by_member_id);

-- Household equality for the member references is checked in the server
-- functions before every write, since it spans related tables.
