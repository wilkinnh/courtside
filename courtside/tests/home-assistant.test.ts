import {test} from 'node:test';
import assert from 'node:assert/strict';
import {homeAssistantApi} from '../lib/home-assistant.ts';
const config={url:'http://ha.local:8123',token:'private-token'};
const request=(path='players',data?:unknown)=>new Request('http://localhost/api/v1/home-assistant/'+path,data?{method:'POST',body:JSON.stringify(data)}:{});
const payload={media_player:'media_player.tv',media_url:'https://www.espn.com/watch/player?id=abc',provider:'espn',start_mode:'live'};
test('HA discovery, script variables and failures',async()=>{
 const original=globalThis.fetch;const calls:{url:string;options:any}[]=[];
 globalThis.fetch=async(input,options)=>{calls.push({url:String(input),options});return Response.json(String(input).endsWith('/states')?[{entity_id:'sensor.private',state:'on'},{entity_id:'media_player.tv',state:'idle',attributes:{friendly_name:'TV',private:'hidden'}}]:{state:'idle'});};
 try{
  assert.equal((await homeAssistantApi(request())).status,503);
  const discovered=await homeAssistantApi(request(),config);assert.deepEqual(await discovered.json(),{players:[{entity_id:'media_player.tv',name:'TV',state:'idle'}]});
  assert.equal(calls[0].options.headers.Authorization,'Bearer private-token');
  for(const mode of ['live','beginning']){assert.equal((await homeAssistantApi(request('play',{...payload,start_mode:mode}),config)).status,202);assert.deepEqual(JSON.parse(calls.at(-1)!.options.body),{entity_id:'script.courtside_play',variables:{...payload,start_mode:mode}});assert.equal(calls.at(-1)!.url,'http://ha.local:8123/api/services/script/turn_on');}
  const peacockWeb='https://www.peacocktv.com/watch/asset/sports/eagles-vs.-commanders/179340d1-fca6-3d44-b69a-a0db822d82ef';
  const peacockApp='https://www.peacocktv.com/deeplink?deeplinkData='+encodeURIComponent(JSON.stringify({pvid:'179340d1-fca6-3d44-b69a-a0db822d82ef',type:'PROGRAMME',action:'PLAY'}));
  // Exercise the website's raw URL request through the actual HA script boundary.
  for(const media_url of [peacockWeb,peacockApp,'https://www.peacocktv.com/watch/sports']){
   const input={...payload,provider:'peacock',media_url};
   assert.equal((await homeAssistantApi(request('play',input),config)).status,202);
   assert.deepEqual(JSON.parse(calls.at(-1)!.options.body),{entity_id:'script.courtside_play',variables:{...input,media_url:media_url===peacockWeb?peacockApp:media_url}});
  }
  for(const change of [{media_url:'javascript:bad'},{provider:'bad'},{start_mode:'bad'},{media_player:'sensor.tv'}])assert.equal((await homeAssistantApi(request('play',{...payload,...change}),config)).status,400);
  calls.length=0;
  globalThis.fetch=async(input,options)=>{calls.push({url:String(input),options});return String(input).endsWith('/states/script.courtside_play')?new Response('{}',{status:404}):Response.json({state:'idle'});};
  const missing=await homeAssistantApi(request('play',payload),config);assert.equal(missing.status,502);assert.match((await missing.json()).error,/script.courtside_play was not found/);assert.equal(calls.some(c=>c.options.method==='POST'),false);
  globalThis.fetch=async(input)=>Response.json({state:String(input).includes('/states/script.')?'unavailable':'idle'});
  assert.equal((await homeAssistantApi(request('play',payload),config)).status,409);
  globalThis.fetch=async()=>Response.json({state:'unavailable'});assert.equal((await homeAssistantApi(request('play',payload),config)).status,409);
  globalThis.fetch=async()=>new Response('secret',{status:401});const rejected=await homeAssistantApi(request(),config);assert.equal(rejected.status,502);assert.doesNotMatch(await rejected.text(),/private-token|secret/);
  globalThis.fetch=async()=>{throw new Error('secret-token')};assert.doesNotMatch(await (await homeAssistantApi(request(),config)).text(),/secret-token/);
 }finally{globalThis.fetch=original;}
});
