import {leagues,type Game,type WatchLink} from './catalog.ts';

const uuid='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
// Restrict custom schemes to the provider's event route; never accept arbitrary app URLs.
export function paramountAppUrl(value:string):string|null{
 try{
  const u=new URL(value);
  if(!['https:','pplus:'].includes(u.protocol)||u.hostname!=='www.paramountplus.com'||u.username||u.password||u.port)return null;
  if(!new RegExp('^/live-tv/stream/[a-z0-9-]+/'+uuid+'/?$','i').test(u.pathname))return null;
  if(u.hash&&u.hash!=='#open')return null;
  if([...u.searchParams.keys()].some(k=>!['searchReferral','source'].includes(k)))return null;
  return 'pplus://www.paramountplus.com'+u.pathname.replace(/\/?$/,'/');
 }catch{return null;}
}
const clean=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
// Compare names supplied by the two catalogs, never a maintained list of teams.
function names(team:any):string[]{
 return [team.name,team.shortName].filter((s):s is string=>typeof s==='string'&&!!s.trim()).flatMap(s=>[clean(s),clean(s.replace(/\b(?:FC|FK|SK|SSC|RC|KV|CF|SC|AFC)\b/gi,''))]).filter(Boolean);
}
function sameTeam(a:any,b:any){const right=names(b);return names(a).some(n=>right.includes(n));}
function leagueMatches(value:string,g:Game){
 const league=leagues.find(l=>l.id===g.league);if(!league)return false;
 const normalize=(s:string)=>clean(s.replace(/^UEFA\s+/i,''));
 return [league.name,league.id].some(n=>normalize(n)===normalize(value));
}
function eventMatches(c:any,g:Game):boolean{
 const kickoff=c?.eventTime?.gameKickOffStartTime,date=Date.parse(g.date);
 if(!c||!leagueMatches(c.leagueName||'',g)||!Number.isFinite(kickoff)||!Number.isFinite(date)||Math.abs(kickoff-date)>15*60000)return false;
 if(!Array.isArray(c.competitors)||c.competitors.length!==2||g.teams.length!==2)return false;
 const sides=g.teams.map(t=>c.competitors.filter((x:any)=>x.isHome===(t.homeAway==='home')));
 if(g.teams.some(t=>!['home','away'].includes(t.homeAway))||sides.some(xs=>xs.length!==1))return false;
 const matches=g.teams.map((t,i)=>sameTeam(sides[i][0],t));
 if(matches.every(Boolean))return true;
 // A translated opponent name can be corroborated by the exact venue and kickoff.
 // Still require one exact team on its correct side; never match on time alone.
 return matches.filter(Boolean).length===1&&kickoff===date&&!!g.venue&&!!c.venueName&&clean(g.venue)===clean(c.venueName);
}
function values(v:any):any[]{return v&&typeof v==='object'?Object.values(v):[];}
export function paramountAppleLinks(document:any,g:Game):WatchLink[]{
 const d=document?.data,c=d?.content;
 if(g.state==='post'||!/^umc\.cse\.[a-z0-9]+$/.test(c?.id||'')||!eventMatches(c,g))return [];
 const kickoff=c.eventTime.gameKickOffStartTime;
 const links:WatchLink[]=[];
 for(const v of values(d.playables)){
  const channel=d.channels?.[v.channelId];
  if(channel?.name!=='Paramount+'||!channel.appBundleIds?.includes('com.cbsvideo.app')||v.canonicalId!==c.id||v.airingType!=='Live')continue;
  if(v.eventTime?.gameKickOffStartTime!==kickoff)continue;
  const appUrl=paramountAppUrl(v.punchoutUrls?.play||'');if(!appUrl)continue;
  const u=new URL(appUrl),parts=u.pathname.split('/');
  if(parts[4]!==v.externalId)continue;
  const language=v.primaryLocale?.locale||v.locales?.[0]?.locale;
  if(!/^en(?:[_-]|$)/.test(language||''))continue;
  if(!links.some(l=>l.appUrl===appUrl))links.push({service:'paramount',label:v.title,url:appUrl.replace('pplus:','https:'),appUrl,kind:'event',source:'Apple TV catalog · event identity and Paramount+ provider matched. Paramount+ may require a fresh app launch.',sourceUrl:`https://tv.apple.com/us/sporting-event/${c.id}`,verifiedAt:new Date().toISOString(),access:'subscription_required',language:'en',deviceVerified:false,playbackTarget:'provider_app_candidate'});
 }
 return links.length===1?links:[];
}
export function applePageData(text:string){const m=/<script\b[^>]*id="serialized-server-data"[^>]*>([\s\S]*?)<\/script>/i.exec(text);if(!m)throw new Error('Apple catalog data missing');return JSON.parse(m[1]);}
export async function enrichParamount(games:Game[],fetchText:(url:string)=>Promise<string>):Promise<boolean|null>{
 const active=games.filter(g=>leagues.some(l=>l.id===g.league)&&g.state!=='post'&&g.broadcasts.includes('Paramount+'));
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
    const walk=(v:any,depth=0)=>{if(!v||typeof v!=='object'||depth>35)return;if(v.$kind==='SportingEventLockup'&&/^umc\.cse\.[a-z0-9]+$/.test(v.id||''))ids.add(v.id);for(const x of values(v))walk(x,depth+1);};walk(search);
    if(ids.size>30)throw new Error('Apple search exceeds event lookup limit');
    const found:WatchLink[]=[];
    for(const id of ids){const payload=JSON.parse(await fetchText(`https://uts-api.itunes.apple.com/uts/v3/sporting-events/${id}?${params}`));found.push(...paramountAppleLinks(payload,g));}
    const unique=found.filter((l,i)=>found.findIndex(x=>x.appUrl===l.appUrl)===i);
    if(unique.length===1)g.links=[...unique,...g.links.filter(l=>l.service!=='paramount'||l.kind==='event'&&l.url!==unique[0].url)];
   }catch{ok=false;}
  }
 }));return ok;
}
