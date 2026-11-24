-- Atomic subcategory removal with explicit replacement for all historical expenses.
-- No expense is deleted; old category IDs remain archived, never silently redirected.
create or replace function ensure_active_expense_category()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'UPDATE' and NEW.category_id = OLD.category_id and NEW.household_id = OLD.household_id then
    return NEW;
  end if;
  perform 1 from categories where id=NEW.category_id and household_id=NEW.household_id and archived=false for share;
  if not found then
    raise exception 'الفئة لم تعد متاحة. اختر فئة أخرى للمصروف';
  end if;
  return NEW;
end;
$$;
drop trigger if exists expense_active_category_guard on expenses;
create trigger expense_active_category_guard before insert or update of category_id, household_id on expenses
for each row execute function ensure_active_expense_category();

create or replace function archive_expense_category(p_household text, p_source text, p_target text default null)
returns void language plpgsql as $$
declare
  used_count bigint;
begin
  -- Serialize the rare removal operation against expense/category writes.
  -- The guard above also rejects stale inserts after this operation commits.
  lock table categories, expenses in share row exclusive mode;
  if not exists (select 1 from categories where id=p_source and household_id=p_household and archived=false) then
    raise exception 'الفئة غير موجودة أو تم حذفها بالفعل';
  end if;
  select count(*) into used_count from expenses where category_id=p_source and household_id=p_household;
  if p_target is not null and (p_target=p_source or not exists (select 1 from categories where id=p_target and household_id=p_household and archived=false)) then
    raise exception 'اختر فئة بديلة متاحة في نفس البيت';
  end if;
  if used_count > 0 and p_target is null then
    raise exception 'الفئة فيها مصروفات مسجلة. اختر فئة بديلة قبل الحذف';
  end if;
  if used_count > 0 then
    update expenses set category_id=p_target where category_id=p_source and household_id=p_household;
  end if;
  update categories set archived=true where id=p_source and household_id=p_household;
end;
$$;
