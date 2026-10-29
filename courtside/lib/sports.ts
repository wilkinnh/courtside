import {enrichProviderCatalogs,appleTvCandidate} from './provider-catalogs.ts';
import {enrichPrime} from './prime.ts';
import {leagues, services, type Game, type WatchLink} from './catalog.ts';
const cache = new Map<string,{at:number;data:any}>();
const pending = new Map<string,Promise<any>>();
export async function jsonFetch(url:string){
 const hit=cache.get(url);if(hit && Date.now()-hit.at<45000)return hit.data;
 if(pending.has(url))return pending.get(url);
 const job=(async()=>{const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(`Provider returned ${r.status}`);const data=await r.json();cache.set(url,{at:Date.now(),data});if(cache.size>100)cache.delete(cache.keys().next().value!);return data;})();
 pending.set(url,job);try{return await job;}finally{pending.delete(url);}
}
const allowedHosts=['espn.com','disneyplus.com','hbomax.com','max.com','xfinity.com','cbssports.com','nba.com','peacocktv.com','amazon.com','primevideo.com','paramountplus.com','tv.apple.com','foxsports.com','fox.com','mlb.com','nhl.com','nfl.com','youtube.com','tv.youtube.com','hulu.com','dazn.com'];
export function safeUrl(value:unknown){try{const u=new URL(String(value));return u.protocol==='https:' && !u.username && !u.password && allowedHosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:null;}catch{return null;}}
function serviceFor(url:string){const h=new URL(url).hostname;return h.includes('espn')?'espn':h.includes('nba')?'nba':h.includes('peacock')?'peacock':h.includes('amazon')||h.includes('primevideo')?'prime':h.includes('paramount')?'paramount':h.includes('apple')?'apple':h.includes('fox')?'fox':'provider';}
export function extractLinks(raw:any):WatchLink[]{
 const found:WatchLink[]=[];const walk=(v:any,depth:number)=>{if(!v||depth>9)return;if(Array.isArray(v)){v.forEach(x=>walk(x,depth+1));return;}if(typeof v!=='object')return;
 const url=safeUrl(v.href||v.url);const rel=Array.isArray(v.rel)?v.rel:[];
 if(url && (rel.includes('watch')|| /espn\.com\/watch\/player(?:\/|\?)/.test(url)) && !/highlight|replay/i.test(v.text||v.title||'')){
 const event=/\/watch\/player(?:\/|\?)|\/video\/detail\/|\/detail\/|\/watch\/playback\/|\/game\/|\/sports\/event\//.test(url);
 found.push({service:serviceFor(url),label:v.text||'Provider stream',url,kind:event?'event':'service',source:'ESPN event metadata',verifiedAt:new Date().toISOString(),access:'subscription_required'});}
 Object.values(v).forEach(x=>walk(x,depth+1));};walk(raw,0);return found.filter((x,i,a)=>a.findIndex(y=>y.url===x.url)===i);
}
export function normalize(e:any,league:string):Game{
 const c=e.competitions?.[0]||{};const broadcasts=[...new Set<string>([...(c.broadcasts||[]).flatMap((b:any)=>b.names||b.media?.map?.((m:any)=>m.shortName)||[b.media?.shortName].filter(Boolean)),...(c.geoBroadcasts||[]).filter((b:any)=>!b.region||b.region==='us').map((b:any)=>b.media?.shortName).filter(Boolean)])];
 const links=extractLinks({links:e.links,broadcasts:c.geoBroadcasts});
 for(const s of services)if(broadcasts.some(b=>s.channels.some(n=>n.toLowerCase()===b.toLowerCase()))&&!links.some(l=>l.service===s.id))links.push({service:s.id,label:s.name,url:s.url,kind:'service',source:'Broadcast name match',verifiedAt:new Date().toISOString(),access:'subscription_required'});
 return {id:String(e.id),league,name:e.name||(c.competitors||[]).slice().sort((a:any,b:any)=>a.homeAway==='away'?-1:1).map((t:any)=>t.team?.displayName||'TBD').join(' at '),date:e.date||c.date,state:e.status?.type?.state||c.status?.type?.state||'pre',detail:e.status?.type?.shortDetail||c.status?.type?.shortDetail||'Scheduled',venue:c.venue?.fullName||'',teams:(c.competitors||[]).map((t:any)=>({id:String(t.team?.id||t.id),name:t.team?.displayName||t.athlete?.displayName||'TBD',shortName:t.team?.shortDisplayName,abbreviation:t.team?.abbreviation||'TBD',logo:t.team?.logo||t.team?.logos?.[0]?.href||'',score:t.score||'0',homeAway:t.homeAway,record:t.records?.find((r:any)=>r.type==='total')?.summary||''})).sort((a:any,b:any)=>a.homeAway==='away'?-1:1),broadcasts,links,eventUrl:safeUrl(e.links?.find((l:any)=>l.rel?.includes('summary'))?.href)||''};
}
export function watchEntries(document:any):Map<string,WatchLink[]>{
 const result=new Map<string,WatchLink[]>();
 for(const bucket of document?.page?.buckets||[])for(const item of bucket.contents||[]){
 const id=String(item.eventId||item.event?.gameId||'');
 if(!/^\d+$/.test(id)||/reair|replay/i.test(item.pillMetadata?.displayType||'')||!['live','upcoming'].includes(item.status))continue;
 for(const stream of item.streams||[]){
 if(!['live','upcoming'].includes(stream.status)||/reair|replay/i.test(stream.name||''))continue;
 const url=safeUrl(stream.links?.web);if(!url||new URL(url).hostname!=='www.espn.com'||!url.includes('/watch/player'))continue;
 const list=result.get(id)||[];
 const plus=stream.packages?.includes('ESPN_PLUS')||stream.source?.name==='ESPN+';
 const entry:WatchLink={service:plus?'espn-plus':'espn',label:stream.name||item.name,url,kind:'event',source:'ESPN Watch catalog · exact event ID match',verifiedAt:new Date().toISOString(),access:'subscription_required',language:stream.source?.lang,feed:stream.source?.name,authTypes:stream.authTypes||[],packages:stream.packages||[],outOfMarketOnly:!!stream.isOnlyOOM,deviceVerified:false};
 if(/^sportscenter:\/\/x-callback-url\/showWatchStream\?playID=[a-zA-Z0-9-]+$/.test(stream.links?.appPlay||''))entry.appUrl=stream.links.appPlay;
 if(!list.some(x=>x.url===url))list.push(entry);result.set(id,list);
 }}return result;
}
export async function watchCatalog(){
 const home=await jsonFetch('https://watch.product.api.espn.com/api/product/v3/watchespn/web/home');
 if(!Array.isArray(home?.page?.buckets))throw new Error('Invalid Watch catalog');
 const links=home.page.buckets.filter((b:any)=>/upcoming|live/i.test(b.name||b.title||'')).map((b:any)=>b.links?.self).filter((v:any)=>{try{const u=new URL(v);return u.protocol==='https:'&&u.hostname==='watch.product.api.espn.com'&&u.pathname==='/api/product/v3/watchespn/web/bucket';}catch{return false;}}).slice(0,2);
 const extras=await Promise.allSettled(links.map((u:string)=>jsonFetch(u)));
 const map=watchEntries(home);for(const extra of extras){if(extra.status==='fulfilled')for(const [id,list] of watchEntries(extra.value)){const old=map.get(id)||[];map.set(id,[...old,...list.filter(x=>!old.some(y=>y.url===x.url))]);}}
 return map;
}
export async function scoreboard(date:string,ids:string[]){
 const catalogPromise=watchCatalog().catch(()=>null);
 const errors:string[]=[];const results=await Promise.all(ids.map(async id=>{const league=leagues.find(l=>l.id===id)!;try{const d=await jsonFetch(`https://site.api.espn.com/apis/site/v2/sports/${league.path}/scoreboard?dates=${date.replaceAll('-','')}&limit=200`);if(!Array.isArray(d.events))throw new Error('Invalid provider response');return d.events.map((e:any)=>normalize(e,id));}catch{errors.push(id);return [];}}));
 const catalog=await catalogPromise;const events:Game[]=results.flat();for(const g of events){const exact=catalog?.get(g.id)||[];g.links=[...exact,...g.links.filter(l=>!exact.some(x=>x.service===l.service))];}
 const [prime_catalog_available,provider_catalogs]=await Promise.all([enrichPrime(events),enrichProviderCatalogs(events)]);
 return {provider_catalogs,prime_catalog_available,link_catalog_available:!!catalog,events:events.sort((a,b)=>a.date.localeCompare(b.date)),errors,fetched_at:new Date().toISOString(),source:'ESPN',region:'US',partial:errors.length>0};
}
export function selectedLinks(g:Game,selected:string[],channels:string[]=[]){return g.links.filter(l=>selected.includes(l.service)||(l.service==='espn'&&g.broadcasts.some(b=>channels.includes(b))));}
export async function resolveGame(league:string,id:string,selected:string[],overrides:any[]=[]){
 const l=leagues.find(l=>l.id===league);if(!l||!/^\d{5,15}$/.test(id))throw new Error('Invalid league or ESPN event ID');
 const d=await jsonFetch(`https://site.api.espn.com/apis/site/v2/sports/${l.path}/summary?event=${id}`);
 if(!d.header?.id)throw new Error('Event not found');
 const competition=d.header.competitions?.[0]||{};
 const event=normalize({...d.header,competitions:[{...competition,venue:d.gameInfo?.venue,geoBroadcasts:d.broadcasts||[]}]},league);
 const catalog=await watchCatalog().catch(()=>null);
 const actual=[...(catalog?.get(id)||[]),...extractLinks({links:d.header?.links,broadcasts:d.broadcasts,competition:d.header?.competitions?.[0]?.broadcasts})];
 event.broadcasts=[...new Set([...event.broadcasts,...actual.map(x=>x.feed).filter((v):v is string=>!!v)])];
 event.links=[...actual,...event.links].filter((x,i,a)=>a.findIndex(y=>y.url===x.url)===i);
 const [prime_catalog_available,provider_catalogs]=await Promise.all([enrichPrime([event]),enrichProviderCatalogs([event])]);
 for(const o of overrides){const url=safeUrl(o.url);if(url&&o.event_id===id&&o.league===league&&services.some(s=>s.id===o.service))event.links.unshift({service:o.service,label:'Your saved event link',url,kind:'event',source:'User-supplied; playback not verified',verifiedAt:new Date().toISOString(),access:'subscription_required'});}
 const options=selectedLinks(event,selected).sort((a,b)=>Number(b.kind==='event')-Number(a.kind==='event'));
 const best=options.find(o=>o.kind==='event'&&o.language==='en')||options.find(o=>o.kind==='event')||null;
 const appleBest=options.find(o=>appleTvCandidate(o)&&o.language==='en')||options.find(appleTvCandidate)||null;
 return {event,options,provider_catalogs,apple_tv_url:appleBest?.url||null,prime_catalog_available,link_catalog_available:!!catalog,device_verified:false,watch_url:best?.url||null,link_kind:best?.kind||null,autoplay_safe:false,launchable:!!appleBest,reason:best?'Event page found. Device app support, sign-in, entitlement and blackouts still apply.':'No event-specific watch URL found for your selected services. Service pages are excluded from watch_url.',resolved_at:new Date().toISOString()};
}
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export async function api(request:Request):Promise<Response>{
 const url=new URL(request.url),p=url.pathname.replace(/^\/api\/v1\/?/,'');
 const send=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 try{
 if(request.method==='GET'&&p==='health')return send({status:'ok',version:1});
 if(request.method==='GET'&&p==='services')return send({services,leagues});
 if(request.method==='GET'&&p==='events'){
 const date=url.searchParams.get('date')||today();if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)return send({error:'date must be YYYY-MM-DD'},400);
 const ids=url.searchParams.has('leagues')?url.searchParams.get('leagues')!.split(','):leagues.map(l=>l.id);if(!ids.length||ids.some(id=>!leagues.some(l=>l.id===id)))return send({error:'Unknown league'},400);
 const selected=(url.searchParams.get('services')||'').split(',').filter(Boolean);const team=url.searchParams.get('team');const state=url.searchParams.get('state');
 if(state&&!['pre','in','post'].includes(state))return send({error:'state must be pre, in or post'},400);
 const result=await scoreboard(date,[...new Set(ids)]);
 result.events=result.events.filter(g=>(!team||g.teams.some(t=>t.abbreviation.toLowerCase()===team.toLowerCase()||t.id===team))&&(!state||g.state===state)&&(!selected.length||selectedLinks(g,selected).length>0));return send(result,result.errors.length===ids.length?502:200);
 }
 if(request.method==='POST'&&p==='resolve'){
 const body=await request.text();if(body.length>32000)return send({error:'Payload too large'},413);let b;try{b=JSON.parse(body);}catch{return send({error:'Invalid JSON'},400);}
 if(!b||typeof b!=='object'||Array.isArray(b))return send({error:'Expected a JSON object'},400);
 const a=b.attributes||b.team_tracker?.attributes||{};const league=b.league||leagues.find(l=>l.path===`${a.sport_path}/${a.league_path}`)?.id;
 let id=String(b.event_id||'');if(!id&&a.event_url){const eventUrl=safeUrl(a.event_url);if(eventUrl && new URL(eventUrl).hostname.endsWith('espn.com'))id=eventUrl.match(/(?:gameId\/|gameId=)(\d+)/)?.[1]||'';}
 if(!league||!leagues.some(l=>l.id===league))return send({error:'Provide league or Team Tracker sport_path and league_path'},400);
 if(!id && a.date && a.team_id){const date=String(a.date).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return send({error:'Invalid Team Tracker date'},400);const board=await scoreboard(date,[league]);if(board.errors.length)return send({error:'ESPN unavailable'},502);const matches=board.events.filter(g=>g.teams.some(t=>t.id===String(a.team_id))&&(!a.opponent_id||g.teams.some(t=>t.id===String(a.opponent_id))));if(matches.length===1)id=matches[0].id;else return send({error:'No unique event match',matches:matches.map(g=>g.id)},409);}
 if(!/^\d{5,15}$/.test(id)||!Array.isArray(b.services)||b.services.some((s:any)=>typeof s!=='string'||!services.some(x=>x.id===s)))return send({error:'Provide an ESPN event_id and services array'},400);
 if(b.overrides!==undefined&&(!Array.isArray(b.overrides)||b.overrides.some((o:any)=>!o||typeof o!=='object')))return send({error:'overrides must be an array of link objects'},400);
 return send(await resolveGame(league,id,b.services,b.overrides||[]));
 }
 return send({error:'Not found'},404);
 }catch(e){return send({error:e instanceof Error?e.message:'Upstream unavailable'},502);}
}
