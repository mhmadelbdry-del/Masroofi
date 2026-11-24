-- Additive migration: no existing expenses, budgets or category ids are changed.
alter table expenses add column if not exists bank_sms_key text;
alter table expenses add column if not exists bank_sms_owner text;
create unique index if not exists expenses_bank_sms_dedupe_idx
  on expenses (bank_sms_owner, bank_sms_key) where bank_sms_key is not null;

-- Preserve archived categories as intentional exclusions.
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:0'),1,8) || '-' || substr(md5(h.id || ':reference-category:0'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:0'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:0'),18,3) || '-' || substr(md5(h.id || ':reference-category:0'),21,12)), h.id, 'فواتير', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'فواتير');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:1'),1,8) || '-' || substr(md5(h.id || ':reference-category:1'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:1'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:1'),18,3) || '-' || substr(md5(h.id || ':reference-category:1'),21,12)), h.id, 'صدقة / زكاة', 'extra', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'صدقة / زكاة');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:2'),1,8) || '-' || substr(md5(h.id || ':reference-category:2'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:2'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:2'),18,3) || '-' || substr(md5(h.id || ':reference-category:2'),21,12)), h.id, 'ملابس', 'extra', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'ملابس');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:3'),1,8) || '-' || substr(md5(h.id || ':reference-category:3'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:3'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:3'),18,3) || '-' || substr(md5(h.id || ':reference-category:3'),21,12)), h.id, 'تعليم', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'تعليم');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:4'),1,8) || '-' || substr(md5(h.id || ':reference-category:4'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:4'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:4'),18,3) || '-' || substr(md5(h.id || ':reference-category:4'),21,12)), h.id, 'كهرباء', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'كهرباء');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:5'),1,8) || '-' || substr(md5(h.id || ':reference-category:5'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:5'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:5'),18,3) || '-' || substr(md5(h.id || ':reference-category:5'),21,12)), h.id, 'ترفيه', 'extra', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'ترفيه');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:6'),1,8) || '-' || substr(md5(h.id || ':reference-category:6'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:6'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:6'),18,3) || '-' || substr(md5(h.id || ':reference-category:6'),21,12)), h.id, 'طعام', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'طعام');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:7'),1,8) || '-' || substr(md5(h.id || ':reference-category:7'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:7'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:7'),18,3) || '-' || substr(md5(h.id || ':reference-category:7'),21,12)), h.id, 'غاز', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'غاز');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:8'),1,8) || '-' || substr(md5(h.id || ':reference-category:8'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:8'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:8'),18,3) || '-' || substr(md5(h.id || ':reference-category:8'),21,12)), h.id, 'هدايا', 'extra', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'هدايا');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:9'),1,8) || '-' || substr(md5(h.id || ':reference-category:9'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:9'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:9'),18,3) || '-' || substr(md5(h.id || ':reference-category:9'),21,12)), h.id, 'بقالة', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'بقالة');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:10'),1,8) || '-' || substr(md5(h.id || ':reference-category:10'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:10'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:10'),18,3) || '-' || substr(md5(h.id || ':reference-category:10'),21,12)), h.id, 'صحة', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name in ('صحة', 'علاج'));
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:11'),1,8) || '-' || substr(md5(h.id || ':reference-category:11'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:11'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:11'),18,3) || '-' || substr(md5(h.id || ':reference-category:11'),21,12)), h.id, 'المنزل', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'المنزل');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:12'),1,8) || '-' || substr(md5(h.id || ':reference-category:12'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:12'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:12'),18,3) || '-' || substr(md5(h.id || ':reference-category:12'),21,12)), h.id, 'إنترنت', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'إنترنت');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:13'),1,8) || '-' || substr(md5(h.id || ':reference-category:13'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:13'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:13'),18,3) || '-' || substr(md5(h.id || ':reference-category:13'),21,12)), h.id, 'أطفال', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'أطفال');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:14'),1,8) || '-' || substr(md5(h.id || ':reference-category:14'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:14'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:14'),18,3) || '-' || substr(md5(h.id || ':reference-category:14'),21,12)), h.id, 'صيانة', 'unexpected', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name in ('صيانة', 'صيانات'));
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:15'),1,8) || '-' || substr(md5(h.id || ':reference-category:15'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:15'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:15'),18,3) || '-' || substr(md5(h.id || ':reference-category:15'),21,12)), h.id, 'أخرى', 'unexpected', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'أخرى');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:16'),1,8) || '-' || substr(md5(h.id || ':reference-category:16'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:16'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:16'),18,3) || '-' || substr(md5(h.id || ':reference-category:16'),21,12)), h.id, 'شخصي', 'extra', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name in ('شخصي', 'عناية شخصية'));
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:17'),1,8) || '-' || substr(md5(h.id || ':reference-category:17'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:17'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:17'),18,3) || '-' || substr(md5(h.id || ':reference-category:17'),21,12)), h.id, 'موبايل', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'موبايل');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:18'),1,8) || '-' || substr(md5(h.id || ':reference-category:18'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:18'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:18'),18,3) || '-' || substr(md5(h.id || ':reference-category:18'),21,12)), h.id, 'إيجار', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'إيجار');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:19'),1,8) || '-' || substr(md5(h.id || ':reference-category:19'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:19'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:19'),18,3) || '-' || substr(md5(h.id || ':reference-category:19'),21,12)), h.id, 'مطاعم', 'extra', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'مطاعم');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:20'),1,8) || '-' || substr(md5(h.id || ':reference-category:20'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:20'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:20'),18,3) || '-' || substr(md5(h.id || ':reference-category:20'),21,12)), h.id, 'ادخار', 'extra', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'ادخار');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:21'),1,8) || '-' || substr(md5(h.id || ':reference-category:21'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:21'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:21'),18,3) || '-' || substr(md5(h.id || ':reference-category:21'),21,12)), h.id, 'تسوق', 'extra', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'تسوق');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:22'),1,8) || '-' || substr(md5(h.id || ':reference-category:22'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:22'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:22'),18,3) || '-' || substr(md5(h.id || ':reference-category:22'),21,12)), h.id, 'اشتراكات', 'extra', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'اشتراكات');
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:23'),1,8) || '-' || substr(md5(h.id || ':reference-category:23'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:23'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:23'),18,3) || '-' || substr(md5(h.id || ':reference-category:23'),21,12)), h.id, 'مواصلات', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name in ('مواصلات', 'مواصلات ووقود'));
insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
select (substr(md5(h.id || ':reference-category:24'),1,8) || '-' || substr(md5(h.id || ':reference-category:24'),9,4) || '-' || '4' || substr(md5(h.id || ':reference-category:24'),14,3) || '-' || 'a' || substr(md5(h.id || ':reference-category:24'),18,3) || '-' || substr(md5(h.id || ':reference-category:24'),21,12)), h.id, 'مياه', 'necessity', 0, coalesce((select max(sort_order) from categories where household_id = h.id), 0) + 1
from households h where not exists (select 1 from categories c where c.household_id = h.id and c.name = 'مياه');

-- Keep import receipts even when the expense is later deleted intentionally.
create table if not exists bank_sms_receipts (
  owner_user_id text not null,
  sms_key text not null,
  expense_id text not null,
  created_at timestamptz not null default now(),
  primary key (owner_user_id, sms_key)
);
