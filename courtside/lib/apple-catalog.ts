import type {Game,WatchLink} from './catalog.ts';
function values(v:any):any[]{return v&&typeof v==='object'?Object.values(v):[];}
export function applePageData(text:string){const m=/<script\b[^>]*id="serialized-server-data"[^>]*>([\s\S]*?)<\/script>/i.exec(text);if(!m)throw new Error('Apple catalog data missing');return JSON.parse(m[1]);}
export async function enrichAppleCatalog(active:Game[],service:string,parse:(document:any,g:Game)=>WatchLink[],fetchText:(url:string)=>Promise<string>):Promise<boolean|null>{
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
    for(const id of ids){const payload=JSON.parse(await fetchText(`https://uts-api.itunes.apple.com/uts/v3/sporting-events/${id}?${params}`));found.push(...parse(payload,g));}
    const unique=found.filter((l,i)=>found.findIndex(x=>x.appUrl===l.appUrl)===i);
    if(unique.length===1)g.links=[...unique,...g.links.filter(l=>l.service!==service||l.kind==='event'&&l.url!==unique[0].url)];
   }catch{ok=false;}
  }
 }));return ok;
}
