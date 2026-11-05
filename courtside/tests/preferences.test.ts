import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCourtsideServer} from '../lib/http-server.ts';
import {createPreferenceStore} from '../lib/preference-store.ts';
import {initialPreferences,type Prefs} from '../lib/preferences.ts';

test('shared preferences migrate once, merge concurrent edits, and survive a server restart',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'courtside-prefs-'));
 const key='shared-preferences-test-key-long-enough';
 const start=async()=>{
  const server=createCourtsideServer({assetDirectory:join(directory,'public'),dataDirectory:join(directory,'data'),key});
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const base=`http://127.0.0.1:${address.port}`;
  return {server,base,request:(method='GET',body?:unknown)=>fetch(base+'/api/v1/preferences',{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})})};
 };
 const close=async(server:ReturnType<typeof createCourtsideServer>)=>{server.closeAllConnections();await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));};
 let running=await start();
 try{
  assert.equal((await fetch(running.base+'/api/v1/preferences')).status,401);
  assert.deepEqual(await (await running.request()).json(),{preferences:null});
  const migrated={...initialPreferences,services:['peacock'],favorites:['123'],hideScores:true,overrides:[{event_id:'123',league:'nhl',service:'espn',url:'https://www.espn.com/watch/player/example'}]};
  assert.deepEqual((await (await running.request('POST',migrated)).json() as {preferences:Prefs}).preferences,migrated);
  // A second device's old local state must never replace the household profile.
  assert.deepEqual((await (await running.request('POST',initialPreferences)).json() as {preferences:Prefs}).preferences,migrated);
  const writes=await Promise.all([running.request('PATCH',{onlyMine:true}),running.request('PATCH',{channels:['NBC']})]);
  assert.ok(writes.every(r=>r.status===200));
  const expected={...migrated,onlyMine:true,channels:['NBC']};
  const response=await running.request();assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual((await response.json() as {preferences:Prefs}).preferences,expected);
  assert.equal((await running.request('PATCH',{hideScores:'true'})).status,400);
  assert.equal((await running.request('PATCH',{apiKey:'secret'})).status,400);
  assert.equal((await running.request('PATCH',{overrides:[{url:'javascript:alert(1)'}]})).status,400);
  assert.equal((await running.request('PUT',initialPreferences)).status,405);
  assert.equal((await running.request('PATCH',{favorites:['x'.repeat(33000)]})).status,413);
  assert.equal((await fetch(running.base+'/api/v1/preferences',{method:'PATCH',headers:{Authorization:'Bearer '+key},body:'{}'})).status,415);
  assert.equal((await fetch(running.base+'/api/v1/preferences',{method:'PATCH',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:'{'})).status,400);
  await close(running.server);running=await start();
  assert.deepEqual((await (await running.request()).json() as {preferences:Prefs}).preferences,expected);
  assert.equal((await fetch(running.base+'/data/preferences.json')).status,404);
 }finally{await close(running.server);await rm(directory,{recursive:true,force:true});}
});

test('first migration wins races and corrupt storage is never silently replaced',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'courtside-store-'));
 try{
  const store=createPreferenceStore(directory);
  const first={...initialPreferences,hideScores:true};
  const results=await Promise.all([store.update(first,true),store.update(initialPreferences,true)]);
  assert.deepEqual(results,[first,first]);
  await writeFile(join(directory,'preferences.json'),'broken');
  await assert.rejects(store.read());
  await assert.rejects(store.update(initialPreferences,true));
  assert.equal(await readFile(join(directory,'preferences.json'),'utf8'),'broken');
 }finally{await rm(directory,{recursive:true,force:true});}
});
