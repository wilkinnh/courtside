import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCourtsideServer} from '../lib/http-server.ts';

test('Node serves website and API, protects API when configured, and rejects unsafe paths',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'courtside-test-'));
 await writeFile(join(directory,'index.html'),'<h1>Courtside</h1>');
 await writeFile(join(directory,'guide.md'),'Setup guide');
 await writeFile(join(directory,'.env'),'not public');
 const key='test-only-key-with-enough-characters';
 const server=createCourtsideServer({assetDirectory:directory,key});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 const base=`http://127.0.0.1:${address.port}`;
 try{
  const home=await fetch(base);assert.equal(home.status,200);assert.match(home.headers.get('content-type')!,/text\/html/);assert.match(await home.text(),/Courtside/);
  const head=await fetch(base,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await fetch(base+'/guide.md')).headers.get('content-type'),'text/plain; charset=utf-8');
  assert.equal((await fetch(base+'/api/v1/health')).status,200);
  assert.equal((await fetch(base+'/api/v1/services')).status,401);
  assert.equal((await fetch(base+'/api/v1/services',{headers:{Authorization:'Bearer wrong'}})).status,401);
  const authorized=await fetch(base+'/api/v1/services',{headers:{Authorization:'Bearer '+key}});assert.equal(authorized.status,200);assert.ok((await authorized.json() as any).services.length>0);
  for(const path of ['/.env','/%2e%2e%2fsecret','/missing.js'])assert.equal((await fetch(base+path)).status,404);
  assert.equal((await fetch(base,{method:'POST'})).status,405);
  assert.equal((await fetch(base+'/api/v1/resolve',{method:'POST',headers:{Authorization:'Bearer '+key},body:'x'.repeat(33000)})).status,413);
 }finally{server.closeAllConnections();await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));await rm(directory,{recursive:true,force:true});}
});

test('trusted LAN mode allows API without a key',async()=>{
 const server=createCourtsideServer({assetDirectory:tmpdir()});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert.ok(address&&typeof address!=='string');
 try{assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/services`)).status,200);}
 finally{server.closeAllConnections();await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));}
});
