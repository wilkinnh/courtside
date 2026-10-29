import {titleMatches} from './provider-catalogs.ts';
import type {Game,WatchLink} from './catalog.ts';
export const HHN_URL='https://www.primevideo.com/channel/17edab23-eb9f-95f2-999a-31e09e70f7d3';
const SPORTS_URL='https://www.primevideo.com/sports';
type Card={url:string;title:string;synopsis:string;service?:'prime'|'prime-hhn'};
const cache=new Map<string,{expires:number;text:string}>();
const inflight=new Map<string,Promise<string>>();
async function html(url:string){
 const cached=cache.get(url);if(cached&&cached.expires>Date.now())return cached.text;
 if(inflight.has(url))return inflight.get(url)!;
 const task=(async()=>{
  const r=await fetch(url,{signal:AbortSignal.timeout(10000),redirect:'error',headers:{Accept:'text/html','Accept-Language':'en-US,en;q=0.9'}});
  if(!r.ok)throw new Error('Prime catalog unavailable');
  const reader=r.body?.getReader();if(!reader)throw new Error('Empty Prime catalog');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3000000){await reader.cancel();throw new Error('Prime response too large');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const text=new TextDecoder().decode(bytes);cache.set(url,{text,expires:Date.now()+300000});if(cache.size>24)cache.delete(cache.keys().next().value!);return text;
 })();inflight.set(url,task);try{return await task;}finally{inflight.delete(url);}
}
function documents(text:string){const docs:any[]=[];for(const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){try{docs.push(JSON.parse(match[1]));}catch{}}return docs;}
export function primeCards(text:string):Card[]{
 const cards:Card[]=[];
 const visit=(v:any,depth=0)=>{if(!v||typeof v!=='object'||depth>35)return;
  if(v.entityType==='EVENT'&&v.widgetType==='TitleCard'&&['LIVE','UPCOMING'].includes(v.liveInfo?.status)&&/Hurricanes Hockey Network|^(?:Watch with a free Prime trial|Watch with Prime|Included with Prime)$/i.test(v.entitlementCues?.focusMessage?.message||'')){
   try{const u=new URL(v.link?.url,SPORTS_URL);if(u.origin==='https://www.primevideo.com'&&/^\/detail\/[A-Z0-9]{10,32}$/.test(u.pathname)&&!cards.some(c=>c.url===u.origin+u.pathname))cards.push({url:u.origin+u.pathname,title:v.title||'',synopsis:v.synopsis||'',service:/Hurricanes Hockey Network/i.test(v.entitlementCues?.focusMessage?.message||'')?'prime-hhn':'prime'});}catch{}
  }
  for(const x of Object.values(v))visit(x,depth+1);
 };for(const d of documents(text))visit(d);return cards;
}
function sameTeams(text:string,g:Game){return g.teams.length===2&&g.teams.every(t=>text.toLowerCase().includes(t.name.toLowerCase()));}
export function primeStart(value:string):number{
 const m=/^([A-Za-z]{3}) (\d{1,2}), (\d{4}) (\d{1,2})(?::(\d{2}))? (AM|PM) (EDT|EST)$/.exec(value||'');if(!m)return NaN;
 const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[1]);if(month<0)return NaN;
 return Date.UTC(+m[3],month,+m[2],(+m[4]%12)+(m[6]==='PM'?12:0)+(m[7]==='EDT'?4:5),+(m[5]||0));
}
export function matchPrimeDetail(text:string,card:Card,g:Game):WatchLink|null{
 for(const doc of documents(text)){
  const details=doc?.init?.preparations?.body?.atf?.state?.detail?.headerDetail||{};
  for(const d of Object.values(details) as any[]){
   const delta=Date.parse(g.date)-primeStart(d.pageDateTimeBadge);
   if(d.entityType!=='EVENT'||!['live','upcoming'].includes(d.liveState?.id)||!(card.service==='prime'?titleMatches(d.title||'',g):sameTeams(d.synopsis||'',g))||card.url.split('/').pop()!==d.compactGti||!Number.isFinite(delta)||delta< -15*60000||delta>90*60000)continue;
   return {service:card.service||'prime-hhn',label:d.title,url:card.url,kind:'event',source:'Prime Video catalog · both teams and scheduled time matched',sourceUrl:SPORTS_URL,playbackTarget:'provider_app_candidate',verifiedAt:new Date().toISOString(),access:'subscription_required',feed:card.service==='prime'?'Prime Video':'Hurricanes Hockey Network on Prime Video',language:'en',deviceVerified:false};
  }
 }return null;
}
export async function enrichPrime(games:Game[]):Promise<boolean|null>{
 const canes=games.filter(g=>g.state!=='post'&&((g.league==='nhl'&&g.teams.some(t=>t.abbreviation==='CAR'))||g.links.some(l=>l.service==='prime')));
 if(!canes.length)return null;
 try{
  const cards=primeCards(await html(SPORTS_URL));if(!cards.length)return false;
  let healthy=true;
  for(const game of canes){
   const candidates=cards.filter(c=>c.service==='prime'?titleMatches(c.title,game):game.league==='nhl'&&sameTeams(c.synopsis,game)).slice(0,3);
   const results=await Promise.all(candidates.map(async card=>{try{return matchPrimeDetail(await html(card.url),card,game);}catch{healthy=false;return null;}}));
   const links=results.filter((l):l is WatchLink=>l!==null);
   // Never select between ambiguous same-team/time matches automatically.
   if(links.length===1){game.links=[links[0],...game.links.filter(l=>l.service!==links[0].service)];}
  }return healthy;
 }catch{return false;}
}
