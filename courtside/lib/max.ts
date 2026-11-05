import {leagues,type Game,type WatchLink} from './catalog.ts';
import {appleEventMatches} from './event-matching.ts';
import {enrichAppleCatalog} from './apple-catalog.ts';

const uuid='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
export function maxAppUrl(value:string):string|null{
 try{const u=new URL(value);
  if(u.protocol!=='https:'||u.hostname!=='play.hbomax.com'||u.username||u.password||u.port||u.hash||!new RegExp('^/sport/'+uuid+'$','i').test(u.pathname))return null;
  if([...u.searchParams.keys()].some(k=>k!=='utm_source'))return null;
  return u.href;
 }catch{return null;}
}
function values(v:any):any[]{return v&&typeof v==='object'?Object.values(v):[];}
export function maxAppleLinks(document:any,g:Game):WatchLink[]{
 const d=document?.data,c=d?.content;
 if(g.state==='post'||!appleEventMatches(c,g))return [];
 const kickoff=c.eventTime.gameKickOffStartTime;
 const links:WatchLink[]=[];
 for(const v of values(d.playables)){
  const channel=d.channels?.[v.channelId];
  if(channel?.name!=='HBO Max'||!channel.appBundleIds?.includes('com.wbd.stream')||v.externalServiceId!=='com.wbd.availability.US.sports'||v.canonicalId!==c.id||v.airingType!=='Live'||v.eventTime?.gameKickOffStartTime!==kickoff)continue;
  const appUrl=maxAppUrl(v.punchoutUrls?.play||'');if(!appUrl||new URL(appUrl).pathname!=='/sport/'+v.externalId)continue;
  if(!links.some(l=>l.url===appUrl))links.push({service:'max',label:v.title,url:appUrl,appUrl,kind:'event',source:'Apple TV catalog · event identity and HBO Max provider matched',sourceUrl:`https://tv.apple.com/us/sporting-event/${c.id}`,verifiedAt:new Date().toISOString(),access:'subscription_required',deviceVerified:false,playbackTarget:'provider_app_candidate'});
 }
 return links.length===1?links:[];
}
export async function enrichMax(games:Game[],fetchText:(url:string)=>Promise<string>):Promise<boolean|null>{
 const active=games.filter(g=>leagues.some(l=>l.id===g.league)&&g.state!=='post'&&g.broadcasts.some(b=>/^(TNT|TBS|truTV|HBO Max|Max)$/i.test(b)));
 return enrichAppleCatalog(active,'max',maxAppleLinks,fetchText);
}
