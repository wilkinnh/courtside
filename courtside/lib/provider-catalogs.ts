import type {Game,WatchLink} from './catalog.ts';

const cache=new Map<string,{at:number,text:string}>();
const pending=new Map<string,Promise<string>>();
export async function catalogHtml(url:string):Promise<string>{
 const old=cache.get(url);if(old&&Date.now()-old.at<300000)return old.text;
 if(pending.has(url))return pending.get(url)!;
 const job=(async()=>{
  const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html','Accept-Language':'en-US'}});
  if(!r.ok)throw new Error(`Catalog returned ${r.status}`);
  const reader=r.body?.getReader();if(!reader)throw new Error('Empty catalog');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000000){await reader.cancel();throw new Error('Catalog too large');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const b of chunks){bytes.set(b,offset);offset+=b.length;}
  const text=new TextDecoder().decode(bytes);cache.set(url,{at:Date.now(),text});if(cache.size>32)cache.delete(cache.keys().next().value!);return text;
 })();pending.set(url,job);try{return await job;}finally{pending.delete(url);}
}
export function nextData(text:string){const m=/<script\b[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(text);if(!m)throw new Error('Catalog data missing');return JSON.parse(m[1]);}
function walk(v:any,visit:(v:any)=>void,depth=0){if(!v||typeof v!=='object'||depth>40)return;visit(v);for(const x of Object.values(v))walk(x,visit,depth+1);}
const clean=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases:Record<string,string[]>={
 'Manchester City':['Man City','Man. City'],'Manchester United':['Man United','Man. United'],
 'Tottenham Hotspur':['Spurs','Tottenham'],'Brighton & Hove Albion':['Brighton'],
 'AFC Bournemouth':['Bournemouth'],'Bournemouth':['AFC Bournemouth'],
 'Nottingham Forest':['Nottm Forest'],
 'Internazionale':['Inter','Inter Milan','FC Internazionale Milano'],'Lyon':['OL Lyonnes'],
 'Arsenal':['Arsenal WFC'],'Benfica':['SL Benfica'],
};
export function teamMatches(value:string,name:string,league:string){
 const names=[name,...(aliases[name]||[])];
 // NBA nicknames are unambiguous within that league; never use them across sports.
 if(league==='nba')names.push(name.replace(/^(?:Los Angeles|New York|Golden State|Oklahoma City|New Orleans|San Antonio|[A-Za-z]+) /,''));
 if(league==='nfl')names.push(name.split(' ').slice(-1).join(' '));
 return names.some(n=>n&&clean(n)===clean(value));
}
export function titleMatches(title:string,g:Game){
 const sides=title.replace(/\s*\((?:Español|Spanish)\)\s*$/i,'').split(/\s+(?:v\.?|vs\.?|at|@)\s+/i);
 const matches=(side:string,t:Game['teams'][number])=>teamMatches(side,t.name,g.league)||(g.league==='ncaaf'&&!!t.shortName&&clean(side)===clean(t.shortName));
 return sides.length===2&&g.teams.length===2&&((matches(sides[0],g.teams[0])&&matches(sides[1],g.teams[1]))||(matches(sides[1],g.teams[0])&&matches(sides[0],g.teams[1])));
}
const peacockPages:Record<string,string[]>={epl:['premier-league'],nfl:['nfl'],nba:['nba'],ncaaf:['big-ten-football'],mlb:['mlb']};
export function peacockLinks(text:string,g:Game,sourceUrl:string):WatchLink[]{
 const d=nextData(text);let base='';walk(d,v=>{if(v.watchEndpoint?.base==='/watch/asset')base=v.watchEndpoint.base;});if(!base)throw new Error('Peacock watch configuration missing');
 const links:WatchLink[]=[];
 walk(d,v=>{
  if(v.type!=='ASSET/SLE'||!['LIVE','UPCOMING'].includes(v.eventDetails?.eventStage)||!titleMatches(v.title||'',g))return;
  const delta=Date.parse(g.date)-v.eventDetails.eventDisplayStartDate;
  if(!Number.isFinite(delta)||delta< -15*60000||delta>90*60000||!/^\/sports\/[^/?#]+\/[a-f0-9-]{36}$/.test(v.url||''))return;
  const url='https://www.peacocktv.com'+base+v.url;
  if(!links.some(l=>l.url===url))links.push({service:'peacock',label:v.title,url,kind:'event',source:'Peacock catalog · both teams and scheduled time matched',sourceUrl,verifiedAt:new Date().toISOString(),access:'subscription_required',language:/Español|Spanish/i.test(v.title)?'es':'en',deviceVerified:false,playbackTarget:'provider_app_candidate'});
 });return unambiguous(links);
}
function unambiguous(links:WatchLink[]){return links.filter(l=>links.filter(x=>x.language===l.language).length===1);}
const cbsPages:Record<string,{slug:string;league:string}>={eflcup:{slug:'carabao-cup',league:'ENG_LG_CUP'},seriea:{slug:'serie-a',league:'SERI'}};
export function paramountLinks(text:string,g:Game,sourceUrl:string):WatchLink[]{
 const cfg=cbsPages[g.league];if(!cfg)return [];
 const props=nextData(text)?.props?.pageProps;if(!Array.isArray(props?.pageRowsData))throw new Error('CBS catalog data missing');
 const links:WatchLink[]=[];
 for(const row of props.pageRowsData)for(const v of row.videos||[]){
  const game=v.game;
  if(v.type!=='live'||v.network!=='PARAMOUNTPLUS'||!v.authentication?.includes('paramountplus')||game?.leagueAbbr!==cfg.league||!['SCHEDULED','PREGAME','INPROGRESS','HALFTIME'].includes(game.gameStatusDesc))continue;
  const delta=Math.abs(Date.parse(g.date)-game.scheduledTimeEpoch*1000);
  if(!Number.isFinite(delta)||delta>15*60000||g.teams.length!==2||!g.teams.every(t=>teamMatches(t.homeAway==='home'?game.homeTeam?.mediumName||'':game.awayTeam?.mediumName||'',t.name,g.league)))continue;
  // Use an actual event anchor in the catalog, not a guessed player ID/path.
  if(!/^LET-\d+$/.test(v.id))continue;
  const path=`/watch/${cfg.slug}/${v.id}`;if(!text.includes(`href="${path}"`))continue;
  const url='https://www.cbssports.com'+path;
  if(!links.some(l=>l.url===url))links.push({service:'paramount',label:`${v.title} · CBS Sports (Paramount+ login)`,url,kind:'event',source:'CBS Sports catalog · teams, competition and kickoff matched; browser link',sourceUrl,verifiedAt:new Date().toISOString(),access:'subscription_required',language:'en',deviceVerified:false,playbackTarget:'browser_only'});
 }return unambiguous(links);
}
export async function enrichProviderCatalogs(games:Game[]){
 const active=games.filter(g=>g.state!=='post');const statuses:Record<string,boolean|null>={peacock:null,paramount:null};
 const jobs:{service:string;url:string;games:Game[];parse:typeof peacockLinks}[]=[];
 for(const [league,pages] of Object.entries(peacockPages))if(active.some(g=>g.league===league))for(const page of pages)jobs.push({service:'peacock',url:`https://www.peacocktv.com/sports/${page}`,games:active.filter(g=>g.league===league),parse:peacockLinks});
 for(const [league,cfg] of Object.entries(cbsPages))if(active.some(g=>g.league===league))jobs.push({service:'paramount',url:`https://www.cbssports.com/watch/${cfg.slug}`,games:active.filter(g=>g.league===league),parse:paramountLinks});
 await Promise.all(jobs.map(async job=>{
  try{const text=await catalogHtml(job.url);for(const g of job.games){const links=job.parse(text,g,job.url);if(links.length)g.links=[...links,...g.links.filter(l=>l.service!==job.service||l.kind==='event')];}if(statuses[job.service]!==false)statuses[job.service]=true;}
  catch{statuses[job.service]=false;}
 }));return statuses;
}
export function appleTvCandidate(link:WatchLink){return link.kind==='event'&&link.playbackTarget!=='browser_only'&&!new URL(link.url).hostname.endsWith('cbssports.com');}
