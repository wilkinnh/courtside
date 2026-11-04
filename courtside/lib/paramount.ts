import type {Game,WatchLink} from './catalog.ts';

const competitions:Record<string,{name:string;slug:string}>={
 ucl:{name:'UEFA Champions League',slug:'uefa-champions-league'},
 seriea:{name:'Serie A',slug:'serie-a'},
 eflcup:{name:'Carabao Cup',slug:'efl-cup'},
};
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
const aliases:Record<string,string[]>={'Arsenal':['Arsenal FC'],'Slavia Prague':['SK Slavia Praha','Slavia Praha'],'Internazionale':['Inter','Inter Milan','FC Internazionale Milano']};
function sameTeam(value:string,name:string){return [name,...(aliases[name]||[])].some(n=>clean(n)===clean(value));}
function sameMatch(title:string,g:Game){const sides=title.split(/\s+(?:vs\.?|v\.?|at)\s+/i);return sides.length===2&&g.teams.length===2&&[g.teams,[...g.teams].reverse()].some(ts=>ts.every((t,i)=>sameTeam(sides[i],t.name)));}
function values(v:any):any[]{return v&&typeof v==='object'?Object.values(v):[];}
export function paramountAppleLinks(document:any,g:Game):WatchLink[]{
 const cfg=competitions[g.league],d=document?.data,c=d?.content;
 if(!cfg||g.state==='post'||!c||c.leagueName!==cfg.name||!/^umc\.cse\.[a-z0-9]+$/.test(c.id||'')||g.teams.length!==2)return [];
 const kickoff=c.eventTime?.gameKickOffStartTime;
 if(!Number.isFinite(kickoff)||Math.abs(kickoff-Date.parse(g.date))>15*60000)return [];
 if(!Array.isArray(c.competitors)||c.competitors.length!==2||!g.teams.every(t=>c.competitors.some((x:any)=>x.isHome===(t.homeAway==='home')&&['home','away'].includes(t.homeAway)&&sameTeam(x.name||'',t.name))))return [];
 const links:WatchLink[]=[];
 for(const v of values(d.playables)){
  const channel=d.channels?.[v.channelId];
  if(channel?.name!=='Paramount+'||!channel.appBundleIds?.includes('com.cbsvideo.app')||v.canonicalId!==c.id||v.airingType!=='Live'||!sameMatch(v.title||'',g))continue;
  if(v.eventTime?.gameKickOffStartTime!==kickoff)continue;
  const appUrl=paramountAppUrl(v.punchoutUrls?.play||'');if(!appUrl)continue;
  const u=new URL(appUrl),parts=u.pathname.split('/');
  if(parts[3]!==cfg.slug||parts[4]!==v.externalId)continue;
  const language=v.primaryLocale?.locale||v.locales?.[0]?.locale;
  if(!/^en(?:[_-]|$)/.test(language||''))continue;
  if(!links.some(l=>l.appUrl===appUrl))links.push({service:'paramount',label:v.title,url:appUrl.replace('pplus:','https:'),appUrl,kind:'event',source:'Apple TV catalog · teams, competition and kickoff matched. Paramount+ may require a fresh app launch.',sourceUrl:`https://tv.apple.com/us/sporting-event/${c.id}`,verifiedAt:new Date().toISOString(),access:'subscription_required',language:'en',deviceVerified:false,playbackTarget:'provider_app_candidate'});
 }
 return links.length===1?links:[];
}
export function applePageData(text:string){const m=/<script\b[^>]*id="serialized-server-data"[^>]*>([\s\S]*?)<\/script>/i.exec(text);if(!m)throw new Error('Apple catalog data missing');return JSON.parse(m[1]);}
export async function enrichParamount(games:Game[],fetchText:(url:string)=>Promise<string>):Promise<boolean|null>{
 const active=games.filter(g=>competitions[g.league]&&g.state!=='post'&&g.broadcasts.includes('Paramount+'));
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
    const walk=(v:any,depth=0)=>{if(!v||typeof v!=='object'||depth>35)return;if(v.$kind==='SportingEventLockup'&&/^umc\.cse\.[a-z0-9]+$/.test(v.id||'')&&sameMatch(v.ariaLabel||v.title||'',g))ids.add(v.id);for(const x of values(v))walk(x,depth+1);};walk(search);
    if(ids.size>6)throw new Error('Ambiguous Apple search');
    const found:WatchLink[]=[];
    for(const id of ids){const payload=JSON.parse(await fetchText(`https://uts-api.itunes.apple.com/uts/v3/sporting-events/${id}?${params}`));found.push(...paramountAppleLinks(payload,g));}
    const unique=found.filter((l,i)=>found.findIndex(x=>x.appUrl===l.appUrl)===i);
    if(unique.length===1)g.links=[...unique,...g.links.filter(l=>l.service!=='paramount'||l.kind==='event'&&l.url!==unique[0].url)];
   }catch{ok=false;}
  }
 }));return ok;
}
