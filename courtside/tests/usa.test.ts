import {test} from 'node:test';
import assert from 'node:assert/strict';
import {usaLinks,appleTvUrl} from '../lib/provider-catalogs.ts';
const g:any={league:'epl',state:'pre',date:'2026-10-31T15:00:00Z',teams:[{name:'Brentford',homeAway:'home'},{name:'Nottingham Forest',homeAway:'away'}]};
const item:any={gist:{contentType:'GAME',title:'Brentford v. Nottingham Forest',permalink:'/game/brentford-v-nottingham-forest-123'},network:'usanetwork',league:{title:'Premier League'},currentState:'default',livestreams:[{id:'stream'}],homeTeam:{title:'Brentford'},awayTeam:{title:'Nottingham Forest'},schedules:[{startDate:Date.parse(g.date)/1000-1800,endDate:Date.parse(g.date)/1000+7200}]};
const html=(items:any[])=>`<script>window.page_data = ${JSON.stringify({items})}; window.other = {};</script>`;
test('discovers published future game URL without a saved override',()=>{const links=usaLinks(html([item,item]),g,'https://www.usanetwork.com/');assert.equal(links.length,1);assert.equal(links[0].url,'https://www.usanetwork.com'+item.gist.permalink);assert.equal(appleTvUrl(links[0]),null);});
test('rejects wrong date, teams, league, network, replay, and unsafe paths',()=>{for(const patch of [{schedules:[{startDate:1,endDate:2}]},{awayTeam:{title:'Chelsea'}},{league:{title:'WNBA'}},{network:'golfchannel'},{currentState:'ended'},{gist:{...item.gist,permalink:'//evil.com/game'}}])assert.deepEqual(usaLinks(html([{...item,...patch}]),g,''),[]);});
test('rejects ambiguous event URLs and absent catalog data',()=>{assert.deepEqual(usaLinks(html([item,{...item,gist:{...item.gist,permalink:'/game/other-456'}}]),g,''),[]);assert.throws(()=>usaLinks('<html/>',g,''));});
