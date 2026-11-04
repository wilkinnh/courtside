import type {Game,WatchLink} from './catalog.ts';
import {applePageData} from './paramount.ts';

const uuid='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
export function maxAppUrl(value:string):string|null{
 try{const u=new URL(value);
  if(u.protocol!=='https:'||u.hostname!=='play.hbomax.com'||u.username||u.password||u.port||u.hash||!new RegExp('^/sport/'+uuid+'$','i').test(u.pathname))return null;
  if([...u.searchParams.keys()].some(k=>k!=='utm_source'))return null;
  return u.href;
 }catch{return null;}
}
const clean=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function titleMatches(title:string,g:Game){const sides=title.split(/\s+(?:vs\.?|v\.?|at)\s+/i);return sides.length===2&&g.teams.length===2&&[g.teams,[...g.teams].reverse()].some(ts=>ts.every((t,i)=>clean(sides[i])===clean(t.name)||clean(sides[i])===clean(t.name.split(' ').slice(-1).join(' '))));}
function values(v:any):any[]{return v&&typeof v==='object'?Object.values(v):[];}
export function maxAppleLinks(document:any,g:Game):WatchLink[]{
 const d=document?.data,c=d?.content;
 if(g.league!=='nhl'||g.state==='post'||c?.leagueName!=='NHL'||!/^umc\.cse\.[a-z0-9]+$/.test(c.id||'')||g.teams.length!==2)return [];
 const kickoff=c.eventTime?.gameKickOffStartTime;
 if(!Number.isFinite(kickoff)||!Number.isFinite(Date.parse(g.date))||Math.abs(kickoff-Date.parse(g.date))>15*60000)return [];
 if(!Array.isArray(c.competitors)||c.competitors.length!==2||!g.teams.every(t=>['home','away'].includes(t.homeAway)&&c.competitors.some((x:any)=>x.isHome===(t.homeAway==='home')&&clean(x.name||'')===clean(t.name))))return [];
 const links:WatchLink[]=[];
 for(const v of values(d.playables)){
  const channel=d.channels?.[v.channelId];
  if(channel?.name!=='HBO Max'||!channel.appBundleIds?.includes('com.wbd.stream')||v.externalServiceId!=='com.wbd.availability.US.sports'||v.canonicalId!==c.id||v.airingType!=='Live'||!titleMatches(v.title||'',g)||v.eventTime?.gameKickOffStartTime!==kickoff)continue;
  const appUrl=maxAppUrl(v.punchoutUrls?.play||'');if(!appUrl||new URL(appUrl).pathname!=='/sport/'+v.externalId)continue;
  if(!links.some(l=>l.url===appUrl))links.push({service:'max',label:v.title,url:appUrl,appUrl,kind:'event',source:'Apple TV catalog · HBO Max NHL teams and kickoff matched',sourceUrl:`https://tv.apple.com/us/sporting-event/${c.id}`,verifiedAt:new Date().toISOString(),access:'subscription_required',deviceVerified:false,playbackTarget:'provider_app_candidate'});
 }
 return links.length===1?links:[];
}
export async function enrichMax(games:Game[],fetchText:(url:string)=>Promise<string>):Promise<boolean|null>{
 const active=games.filter(g=>g.league==='nhl'&&g.state!=='post'&&g.broadcasts.some(b=>/^(TNT|TBS|truTV|HBO Max|Max)$/i.test(b)));
 if(!active.length)return null;
 let ok=true;
 // Bound concurrency and reuse the existing catalog cache for schedule and resolver calls.
 const queue=[...active];
 await Promise.all(Array.from({length:Math.min(3,queue.length)},async()=>{
  while(queue.length){const g=queue.shift()!;
   try{
    const search=applePageData(await fetchText('https://tv.apple.com/us/collection/sports/uts.col.search.SE?searchTerm='+encodeURIComponent(g.teams[0].name)));
    const config=search.data?.find((x:any)=>x.data?.configuration)?.data.configuration.applicationProps;
    const defaults=config?.requiredParamsMap?.Default;
    if(!defaults?.utsk||!defaults?.utscf)throw new Error('Apple catalog configuration missing');
    const params=new URLSearchParams();for(const key of ['utsk','utscf','caller','sf','v','pfm','locale'])if(typeof defaults[key]==='string')params.set(key,defaults[key]);
    params.set('sf','143441');params.set('locale','en-US');params.set('pfm','web');params.set('caller','web');
    const ids=new Set<string>();
    const walk=(v:any,depth=0)=>{if(!v||typeof v!=='object'||depth>35)return;if(v.$kind==='SportingEventLockup'&&/^umc\.cse\.[a-z0-9]+$/.test(v.id||'')&&titleMatches(v.ariaLabel||v.title||'',g))ids.add(v.id);for(const x of values(v))walk(x,depth+1);};walk(search);
    if(ids.size>6)throw new Error('Ambiguous Apple search');
    const found:WatchLink[]=[];
    for(const id of ids){const payload=JSON.parse(await fetchText(`https://uts-api.itunes.apple.com/uts/v3/sporting-events/${id}?${params}`));found.push(...maxAppleLinks(payload,g));}
    const unique=found.filter((l,i)=>found.findIndex(x=>x.appUrl===l.appUrl)===i);
    if(unique.length===1)g.links=[...unique,...g.links.filter(l=>l.service!=='max'||l.kind==='event'&&l.url!==unique[0].url)];
   }catch{ok=false;}
  }
 }));return ok;
}
