import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('atomic category replacement preserves all-month expenses and rejects invalid/stale writes',async()=>{
 const db=new PGlite();
 try {
  for(const n of readdirSync('migrations').filter(n=>/^000[1-6]_.*\.sql$/.test(n)).sort())await db.exec(readFileSync('migrations/'+n,'utf8'));
  await db.exec("insert into households(id,join_code) values('h','ABCDEF'),('other','UVWXYZ'); insert into household_members(id,household_id,name) values('m','h','A'); insert into categories(id,household_id,name,kind,monthly_limit) values('old','h','بقالة','necessity',1000),('new','h','علاج','extra',500),('empty','h','Empty','necessity',10),('only','other','Other','extra',0),('archived','h','Archived','extra',0); update categories set archived=true where id='archived'; insert into expenses(id,household_id,category_id,description,amount,occurred_at,accounting_year,accounting_month,created_by_member_id,updated_by_member_id) values('e','h','old','existing1',125,'2026-10-12',2026,10,'m','m'),('e2','h','old','existing2',75,'2026-11-12',2026,11,'m','m');");
  const before=(await db.query('select * from expenses order by id')).rows;
  const migration=readFileSync('migrations/0008_category_removal.sql','utf8');await db.exec(migration);await db.exec(migration);
  const call=(source,target=null,house='h')=>db.query('select archive_expense_category($1,$2,$3)',[house,source,target]);
  for(const [source,target,house] of [['old',null,'h'],['old','old','h'],['old','only','h'],['old','archived','h'],['old','missing','h'],['old','new','other']])await assert.rejects(call(source,target,house));
  assert.equal((await db.query("select archived from categories where id='old'")).rows[0].archived,false);
  assert.deepEqual((await db.query('select * from expenses order by id')).rows,before);
  await db.exec("create function fail_archive_fixture() returns trigger language plpgsql as $$ begin raise exception 'fixture rollback'; end $$; create trigger fail_archive_fixture before update of archived on categories for each row execute function fail_archive_fixture();");
  await assert.rejects(call('old','new'));
  assert.deepEqual((await db.query('select * from expenses order by id')).rows,before);
  await db.exec('drop trigger fail_archive_fixture on categories; drop function fail_archive_fixture()');
  await call('old','new');
  const after=(await db.query('select * from expenses order by id')).rows;
  assert.deepEqual(after.map(e=>({...e,category_id:'old'})),before);
  assert.ok(after.every(e=>e.category_id==='new'));
  assert.equal((await db.query("select sum(amount) as total from expenses where household_id='h'")).rows[0].total,'200.00');
  assert.equal((await db.query("select sum(e.amount) as total from expenses e join categories c on c.id=e.category_id where c.kind='extra'")).rows[0].total,'200.00');
  assert.equal((await db.query("select archived from categories where id='old'")).rows[0].archived,true);
  assert.equal((await db.query("select monthly_limit from categories where id='new'")).rows[0].monthly_limit,'500.00');
  await assert.rejects(call('old','new'));
  await call('empty');assert.equal((await db.query("select archived from categories where id='empty'")).rows[0].archived,true);
  await assert.rejects(db.exec("insert into expenses(id,household_id,category_id,description,amount,created_by_member_id,updated_by_member_id) values('late','h','old','stale client',20,'m','m')"));
  await assert.rejects(db.exec("update expenses set category_id='old' where id='e'"));
  await db.exec("update expenses set description='normal edit' where id='e'");
  assert.equal((await db.query("select description from expenses where id='e'")).rows[0].description,'normal edit');
 } finally {await db.close();}
});
test('route requires authenticated household and replacement UI starts blank',()=>{
 const q=readFileSync('src/lib/masroufi/queries.ts','utf8');
 const route=q.split('export const archiveCategory =')[1].split('const updateHouseholdInput')[0];
 assert.match(route,/authMiddleware/);assert.match(route,/membership\(sql, context.userId\)/);assert.match(route,/mine.household_id/);assert.match(route,/replacementId/);
 const ui=readFileSync('src/components/masroufi/budget-view.tsx','utf8');
 assert.match(ui,/setReplacementId\(""\)/);assert.match(ui,/deleteUsage.count > 0 && !replacementId/);assert.match(ui,/mutateAsync/);assert.match(ui,/getCategoryUsage/);
});
