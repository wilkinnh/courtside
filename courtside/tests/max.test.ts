import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {maxAppleLinks,maxAppUrl,enrichMax} from '../lib/max.ts';
import {appleTvUrl} from '../lib/provider-catalogs.ts';
import type {Game} from '../lib/catalog.ts';
const fixture=()=>JSON.parse(readFileSync(new URL('../docs/max-event-2026-11-04.json',import.meta.url),'utf8'));
const game=():Game=>({id:'123456',league:'nhl',name:'Chicago Blackhawks at Florida Panthers',date:'2026-11-05T00:30:00Z',state:'pre',detail:'',venue:'',eventUrl:'',broadcasts:['TNT'],links:[],teams:fixture().data.content.competitors.map((t:any)=>({id:'',name:t.name,abbreviation:'',logo:'',score:'',record:'',homeAway:t.isHome?'home':'away'}))});
test('Apple HBO Max listing supplies exact NHL links for TNT games',()=>{const p=fixture(),links=maxAppleLinks(p,game());assert.equal(links.length,1);assert.equal(appleTvUrl(links[0]),p.data.playables.max.punchoutUrls.play);assert.equal(links[0].deviceVerified,false);});
test('HBO Max refuses wrong teams, time, league, provider, replay and IDs',()=>{
 for(const mutate of [(d:any)=>d.content.competitors[0].name='Other',(d:any)=>d.content.eventTime.gameKickOffStartTime+=86400000,(d:any)=>d.content.leagueName='NBA',(d:any)=>d.channels[d.playables.max.channelId].name='Prime Video',(d:any)=>d.playables.max.airingType='Replay',(d:any)=>d.playables.max.externalId='wrong',(d:any)=>d.playables.max.canonicalId='wrong']){const p=fixture();mutate(p.data);assert.deepEqual(maxAppleLinks(p,game()),[]);}
 assert.deepEqual(maxAppleLinks(fixture(),{...game(),state:'post'}),[]);
 const p=fixture();p.data.playables.other={...p.data.playables.max,externalId:'11111111-1111-1111-1111-111111111111',punchoutUrls:{play:'https://play.hbomax.com/sport/11111111-1111-1111-1111-111111111111'}};assert.deepEqual(maxAppleLinks(p,game()),[]);
});
test('HBO Max handoff rejects service pages and spoofed URLs',()=>{const url=fixture().data.playables.max.punchoutUrls.play;for(const bad of [url.replace('play.hbomax.com','play.hbomax.com.evil.example'),url.replace('https:','max:'),url+'&redirect=https://evil.example','https://www.hbomax.com/sports'])assert.equal(maxAppUrl(bad),null);});
test('HBO Max discovery enriches TNT games and reports failures',async()=>{
 const g=game(),p=fixture();const search={data:[{data:{configuration:{applicationProps:{requiredParamsMap:{Default:{utsk:'test',utscf:'test'}}}}}}],result:{$kind:'SportingEventLockup',id:p.data.content.id,ariaLabel:g.name}};
 assert.equal(await enrichMax([g],async url=>url.includes('uts-api')?JSON.stringify(p):'<script id="serialized-server-data">'+JSON.stringify(search)+'</script>'),true);assert.equal(g.links[0].service,'max');
 assert.equal(await enrichMax([game()],async()=>{throw new Error('offline')}),false);
 assert.equal(await enrichMax([{...game(),broadcasts:['ESPN+']}],async()=>{throw new Error('unexpected')}),null);
});

test('HBO Max discovers other leagues using structured identity rather than display titles',async()=>{
 const g=game(),p=fixture();g.league='nba';g.broadcasts=['HBO Max'];
 g.teams[0].name='Example Visitors';g.teams[1].name='Example Hosts';
 p.data.content.leagueName='NBA';
 p.data.content.competitors.forEach((t:any,i:number)=>t.name=g.teams[i].name);
 p.data.playables.max.title='National broadcast';
 const search={data:[{data:{configuration:{applicationProps:{requiredParamsMap:{Default:{utsk:'test',utscf:'test'}}}}}}],result:{$kind:'SportingEventLockup',id:p.data.content.id,ariaLabel:'National broadcast'}};
 assert.equal(await enrichMax([g],async url=>url.includes('uts-api')?JSON.stringify(p):'<script id="serialized-server-data">'+JSON.stringify(search)+'</script>'),true);
 assert.equal(g.links.length,1);
 p.data.channels[p.data.playables.max.channelId].name='Different subscription';
 assert.deepEqual(maxAppleLinks(p,g),[]);
});
