import {leagues,type Game,type WatchLink} from './catalog.ts';
import {appleEventMatches} from './event-matching.ts';
import {enrichAppleCatalog} from './apple-catalog.ts';
export {applePageData} from './apple-catalog.ts';

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
function values(v:any):any[]{return v&&typeof v==='object'?Object.values(v):[];}
export function paramountAppleLinks(document:any,g:Game):WatchLink[]{
 const d=document?.data,c=d?.content;
 if(g.state==='post'||!/^umc\.cse\.[a-z0-9]+$/.test(c?.id||'')||!appleEventMatches(c,g))return [];
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
export async function enrichParamount(games:Game[],fetchText:(url:string)=>Promise<string>):Promise<boolean|null>{
 const active=games.filter(g=>leagues.some(l=>l.id===g.league)&&g.state!=='post'&&g.broadcasts.includes('Paramount+'));
 return enrichAppleCatalog(active,'paramount',paramountAppleLinks,fetchText);
}
