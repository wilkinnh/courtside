import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paramountAppUrl,paramountAppleLinks,enrichParamount} from '../lib/paramount.ts';
import {appleTvUrl,enrichProviderCatalogs} from '../lib/provider-catalogs.ts';
import {homeAssistantApi} from '../lib/home-assistant.ts';
import type {Game} from '../lib/catalog.ts';
const evidence=JSON.parse(readFileSync(new URL('../docs/paramount-arsenal-2026-11-04.json',import.meta.url),'utf8'));
const payload=()=>({data:{content:{...structuredClone(evidence.content),competitors:structuredClone(evidence.competitors)},channels:{'tvs.sbd.10120':evidence.paramount_channel},playables:{one:structuredClone(evidence.playable)}}});
const game=():Game=>({id:'401915381',league:'ucl',name:'Arsenal at Slavia Prague',date:'2026-11-04T20:00Z',state:'in',detail:'HT',venue:'',eventUrl:'',teams:[{id:'359',name:'Arsenal',homeAway:'away'},{id:'494',name:'Slavia Prague',homeAway:'home'}] as Game['teams'],broadcasts:['Paramount+'],links:[]});
const app='pplus://www.paramountplus.com/live-tv/stream/uefa-champions-league/aadcb004-4ada-46a0-9f46-2afa641e981f/';
test('Paramount exact event produces separate browser and normalized TV links',()=>{
 const links=paramountAppleLinks(payload(),game());assert.equal(links.length,1);assert.equal(links[0].url,app.replace('pplus:','https:'));assert.equal(links[0].appUrl,app);assert.equal(appleTvUrl(links[0]),app);assert.equal(links[0].deviceVerified,false);
});
test('Paramount rejects wrong teams, home/away, dates, competition, replay and provider',()=>{
 const mutations=[(d:any)=>d.content.competitors[0].name='Chelsea',(d:any)=>d.content.competitors[0].isHome=false,(d:any)=>d.content.eventTime.gameKickOffStartTime+=86400000,(d:any)=>d.content.leagueName='Premier League',(d:any)=>d.playables.one.airingType='Replay',(d:any)=>d.playables.one.channelId='prime',(d:any)=>d.playables.one.canonicalId='umc.cse.other',(d:any)=>d.playables.one.externalId='wrong',(d:any)=>d.playables.one.primaryLocale.locale='es_US',(d:any)=>d.playables.one.eventTime.gameKickOffStartTime+=86400000];
 for(const mutate of mutations){const p=payload();mutate(p.data);assert.deepEqual(paramountAppleLinks(p,game()),[]);}
 assert.deepEqual(paramountAppleLinks(payload(),{...game(),state:'post'}),[]);
 const p=payload();const other=structuredClone(p.data.playables.one);other.externalId='11111111-1111-1111-1111-111111111111';other.punchoutUrls.play=app.replace(evidence.playable.externalId,other.externalId);(p.data.playables as any).two=other;assert.deepEqual(paramountAppleLinks(p,game()),[]);
});
test('Paramount URL validation excludes other apps, hosts, credentials and malformed routes',()=>{
 assert.equal(paramountAppUrl(evidence.playable.punchoutUrls.play),app);
 assert.equal(paramountAppUrl(app.replace('pplus:','https:')),app);
 for(const bad of [app.replace('www.paramountplus.com','www.paramountplus.com.evil.example'),app.replace('www.paramountplus.com','user@www.paramountplus.com'),app.replace('www.paramountplus.com','www.paramountplus.com:443'),app.replace('pplus:','evil:'),app.replace(evidence.playable.externalId,'LET-123'),app+'?redirect=https://evil.example',app+'#other','pplus://www.paramountplus.com/live-tv/'])assert.equal(paramountAppUrl(bad),null);
});
test('Paramount discovery requests only Apple endpoints and enriches matched games',async()=>{
 const g=game();const calls:string[]=[];const search={data:[{data:{configuration:{applicationProps:{requiredParamsMap:{Default:{utsk:'public-config',utscf:'public-config',v:'101'}}}}}},{data:{items:[{$kind:'SportingEventLockup',id:evidence.content.id,ariaLabel:evidence.content.title}]}}]};
 const status=await enrichParamount([g],async url=>{calls.push(url);return url.includes('/collection/')?`<script id="serialized-server-data">${JSON.stringify(search)}</script>`:JSON.stringify(payload());});
 assert.equal(status,true);assert.equal(g.links[0].appUrl,app);assert.equal(calls.length,2);assert.equal(new URL(calls[1]).hostname,'uts-api.itunes.apple.com');
 assert.equal(await enrichParamount([game()],async()=>{throw new Error('offline')}),false);
 assert.equal(await enrichParamount([{...game(),state:'post'}],async()=>{throw new Error('must not fetch')}),null);
});
test('Home Assistant accepts only Paramount-scoped native links and normalizes browser event links',async()=>{
 const original=globalThis.fetch;const sent:any[]=[];
 globalThis.fetch=async(_url,init)=>{if(init?.body)sent.push(JSON.parse(String(init.body)));return Response.json({state:'idle'});};
 const run=(url:string,provider='paramount')=>homeAssistantApi(new Request('http://localhost/api/v1/home-assistant/play',{method:'POST',body:JSON.stringify({media_player:'media_player.tv',media_url:url,provider,start_mode:'live'})}),{url:'http://ha.local:8123',token:'test'});
 try{
  for(const url of [app,app.replace('pplus:','https:'),evidence.playable.punchoutUrls.play]){assert.equal((await run(url)).status,202);assert.equal(sent.at(-1).variables.media_url,app);}
  assert.equal((await run(app,'peacock')).status,400);assert.equal((await run(app.replace('www.paramountplus.com','evil.example'))).status,400);
 }finally{globalThis.fetch=original;}
});

test('provider enrichment requests JSON from Apple and HTML for search',async()=>{
 const original=globalThis.fetch;const g=game();const search={data:[{data:{configuration:{applicationProps:{requiredParamsMap:{Default:{utsk:'test-header',utscf:'test',v:'101'}}}}}},{data:{items:[{$kind:'SportingEventLockup',id:evidence.content.id,ariaLabel:evidence.content.title}]}}]};
 globalThis.fetch=async(input,init)=>{const u=new URL(String(input));const accept=(init?.headers as Record<string,string>)?.Accept;if(u.hostname==='uts-api.itunes.apple.com'){assert.equal(accept,'application/json');return Response.json(payload());}assert.equal(accept,'text/html');return new Response(`<script id="serialized-server-data">${JSON.stringify(search)}</script>`);};
 try{const status=await enrichProviderCatalogs([g]);assert.equal(status.paramount,true);assert.equal(g.links[0].appUrl,app);}finally{globalThis.fetch=original;}
});
