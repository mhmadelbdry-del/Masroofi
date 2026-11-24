import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderCategoriesByUsage} from '../src/lib/masroufi/category-order.ts';
const make=(id,usageCount,sortOrder=1,spent=0)=>({id,name:id,kind:'necessity',usageCount,sortOrder,spent,monthlyLimit:0});
test('ranks by frequency not amount, preserves identity and does not mutate',()=>{
 const cats=[make('big',1,1,10000),make('frequent',8,3,10),make('medium',3,2,100)];
 assert.deepEqual(orderCategoriesByUsage(cats).map(c=>c.id),['frequent','medium','big']);
 assert.deepEqual(cats.map(c=>c.id),['big','frequent','medium']);
 assert.equal(orderCategoriesByUsage(cats)[0],cats[1]);
});
test('unused and equal counts keep existing order; fallback handles old bridges/data',()=>{
 assert.deepEqual(orderCategoriesByUsage([make('b',0,2),make('a',0,1)]).map(c=>c.id),['a','b']);
 assert.deepEqual(orderCategoriesByUsage([make('b',2,2),make('a',2,1)]).map(c=>c.id),['a','b']);
 assert.deepEqual(orderCategoriesByUsage([make('first',undefined),make('second',NaN)]).map(c=>c.id),['first','second']);
 assert.deepEqual(orderCategoriesByUsage([]),[]);
});
test('snapshot usage SQL counts all months of this household only',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const {readFileSync}=await import('node:fs');const db=new PGlite();
 try {
  await db.exec("create table categories(id text,household_id text); create table expenses(category_id text,household_id text,amount int,accounting_month int,accounting_year int default 2026); insert into categories values('a','h'),('b','h'),('unused','h'); insert into expenses (category_id,household_id,amount,accounting_month) values('a','h',10,10),('a','h',10,11),('a','other',999,11),('b','h',10000,11);");
  const q=readFileSync('src/lib/masroufi/queries.ts','utf8');
  const aggregate=q.match(/select category_id, count\(\*\) as usage_count,[\s\S]*?group by category_id/)[0].replaceAll('${hid}',"'h'").replaceAll('${year}','2026').replaceAll('${month}','11');
  const rows=(await db.query("select c.id,coalesce(u.usage_count,0) as usage_count,coalesce(u.spent,0) as spent from categories c left join ("+aggregate+")u on u.category_id=c.id where c.household_id='h' order by c.id")).rows;
  assert.deepEqual(rows,[{id:'a',usage_count:2,spent:10},{id:'b',usage_count:1,spent:10000},{id:'unused',usage_count:0,spent:0}]);
 } finally {await db.close();}
});
