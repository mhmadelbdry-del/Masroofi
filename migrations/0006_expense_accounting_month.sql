alter table expenses
  add column if not exists accounting_year int,
  add column if not exists accounting_month int;

update expenses
set
  accounting_year = extract(year from (occurred_at at time zone 'Africa/Cairo'))::int,
  accounting_month = extract(month from (occurred_at at time zone 'Africa/Cairo'))::int
where accounting_year is null or accounting_month is null;

alter table expenses
  alter column accounting_year set default extract(year from (now() at time zone 'Africa/Cairo'))::int,
  alter column accounting_month set default extract(month from (now() at time zone 'Africa/Cairo'))::int,
  alter column accounting_year set not null,
  alter column accounting_month set not null;

alter table expenses
  drop constraint if exists expenses_accounting_month_check;

alter table expenses
  add constraint expenses_accounting_month_check
  check (accounting_month between 1 and 12 and accounting_year between 2020 and 2100);

create index if not exists expenses_household_accounting_month_idx
  on expenses (household_id, accounting_year, accounting_month, occurred_at desc);
