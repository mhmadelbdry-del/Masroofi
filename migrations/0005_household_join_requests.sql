alter table households
  add column if not exists owner_user_id text;

update households h
set owner_user_id = first_member.user_id
from (
  select distinct on (household_id)
    household_id,
    user_id
  from household_users
  order by household_id, created_at asc
) as first_member
where h.owner_user_id is null
  and h.id = first_member.household_id;

create table if not exists household_join_requests (
  id text primary key,
  requester_user_id text not null,
  requester_name text not null default 'شريك',
  source_household_id text references households(id) on delete set null,
  source_member_id text references household_members(id) on delete set null,
  target_household_id text not null references households(id) on delete cascade,
  target_member_id text not null references household_members(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolution_mode text check (resolution_mode in ('erase', 'keep')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_user_id text
);

create index if not exists household_join_requests_target_idx
  on household_join_requests (target_household_id, status, created_at desc);

create index if not exists household_join_requests_requester_idx
  on household_join_requests (requester_user_id, status, created_at desc);

create unique index if not exists household_join_requests_pending_unique
  on household_join_requests (requester_user_id, target_household_id)
  where status = 'pending';
