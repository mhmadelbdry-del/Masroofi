import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import vm from'node:vm';
const root=readFileSync('src/routes/__root.tsx','utf8');
const expression=root.match(/beforeLoad: async \(\) => (\(\{.*?\}\)),/)[1];
test('root resolves server session for SSR but not on browser transitions',async()=>{
 let calls=0;const fetchSessionUser=async()=>{calls++;return{id:'synthetic'}};
 const server=await vm.runInNewContext('(async()=>'+expression+')()',{fetchSessionUser});assert.equal(server.sessionUser.id,'synthetic');assert.equal(calls,1);
 for(let i=0;i<5;i++){const client=await vm.runInNewContext('(async()=>'+expression+')()',{fetchSessionUser,window:{}});assert.equal(client.sessionUser,null)}assert.equal(calls,1);
});
test('protected pages retain client gates and backend independently authenticates requests',()=>{
 for(const path of ['index','expenses','budget','home-requests']){const page=readFileSync('src/routes/'+path+'.tsx','utf8');assert.ok(page.includes('<AuthGate>'));assert.ok(page.includes('<HouseholdGate>'))}
 const gate=readFileSync('src/components/masroufi/auth-gate.tsx','utf8');assert.ok(gate.includes('if (!user) return <RedirectToSignIn />'));assert.ok(gate.includes('error && isUnauthorized(error)'));
 const middleware=readFileSync('src/lib/auth/middleware.ts','utf8');assert.ok(middleware.includes('await requireUserId('));
 const queries=readFileSync('src/lib/masroufi/queries.ts','utf8');assert.ok(queries.includes('.middleware([authMiddleware])'));
});
test('section/settings links preload code when visible',()=>{
 const shell=readFileSync('src/components/masroufi/app-shell.tsx','utf8');assert.equal((shell.match(/preload="viewport"/g)||[]).length,2);
});
