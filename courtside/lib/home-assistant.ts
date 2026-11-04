import {isFoxWebUrl} from './fox.ts';
import {services} from './catalog.ts';
import {peacockAppUrl} from './provider-catalogs.ts';
import {safeUrl} from './sports.ts';
export type HomeAssistantConfig={url:string;token:string;script?:string};
export async function homeAssistantApi(request:Request,config?:HomeAssistantConfig):Promise<Response>{
 const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 const path=new URL(request.url).pathname;
 if(!['/api/v1/home-assistant/players','/api/v1/home-assistant/play'].includes(path))return json(404,{error:'Not found'});
 if(request.method!==(path.endsWith('/players')?'GET':'POST'))return json(405,{error:'Method not allowed'});
 if(!config?.url||!config.token)return json(503,{error:'Configure HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN on the Courtside server. See the Home Assistant setup guide.'});
 const script=config.script||'script.courtside_play';
 let base:URL;
 try{base=new URL(config.url);if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||!/^script\.[a-z0-9_]+$/.test(script))throw new Error();}catch{return json(503,{error:'Invalid Home Assistant server URL or script configuration.'});}
 let stage='connecting to Home Assistant';
 const call=async(path:string,body?:unknown)=>{
  const response=await fetch(base.href.replace(/\/$/,'')+'/api/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});
  if(response.status===404&&path==='states/'+script)throw new Error(`Home Assistant script ${script} was not found. Set HOME_ASSISTANT_SCRIPT to the actual script entity ID, then restart Courtside.`);
  if(!response.ok)throw new Error(response.status===401||response.status===403?'Home Assistant rejected authentication. Check the server token.':`Home Assistant returned HTTP ${response.status}. Check the script and Home Assistant logs.`);
  return response.json();
 };
 try{
  if(path.endsWith('/players')){
   const states=await call('states');
   return json(200,{players:states.filter((s:any)=>/^media_player\.[a-z0-9_]+$/.test(s.entity_id)).map((s:any)=>({entity_id:s.entity_id,name:s.attributes?.friendly_name||s.entity_id,state:s.state})).sort((a:any,b:any)=>a.name.localeCompare(b.name))});
  }
  let data:any;try{data=await request.json();}catch{return json(400,{error:'Invalid JSON'});}
  if(!data||typeof data.media_player!=='string'||!/^media_player\.[a-z0-9_]+$/.test(data.media_player)||!services.some(s=>s.id===data.provider)||!['live','beginning'].includes(data.start_mode)||typeof data.media_url!=='string'||data.media_url.length>4096||!(safeUrl(data.media_url)||(['espn','espn-plus'].includes(data.provider)&&/^sportscenter:\/\/x-callback-url\/showWatchStream\?playID=[a-zA-Z0-9-]+$/.test(data.media_url))))return json(400,{error:'Provide a media player, supported provider URL, provider and live/beginning start mode.'});
  if(isFoxWebUrl(data.media_url))return json(422,{error:'FOX Sports and FOX One web URLs are unavailable for Apple TV handoff. Open FOX One on the TV and select the channel manually; a supported FOX One app link is needed for direct playback.'});
  const mediaUrl=data.provider==='peacock'?peacockAppUrl(data.media_url):data.media_url;
  stage='checking the selected player';
  const player=await call('states/'+data.media_player);
  if(['unavailable','unknown'].includes(player.state))return json(409,{error:'This media player is unavailable. Refresh players and try again.'});
  stage='checking the configured script';
  const scriptState=await call('states/'+script);
  if(['unavailable','unknown'].includes(scriptState.state))return json(409,{error:`Home Assistant script ${script} is unavailable. Check its configuration and reload scripts.`});
  stage='submitting playback to the script';
  // turn_on returns once scheduled, so provider delays do not hold the HTTP request open.
  await call('services/script/turn_on',{entity_id:script,variables:{media_player:data.media_player,media_url:mediaUrl,provider:data.provider,start_mode:data.start_mode}});
  console.info(`[Home Assistant] Playback submitted to ${script} for ${data.media_player} (${data.provider}, ${data.start_mode}).`);
  return json(202,{message:`Playback submitted to ${script}. Check this script’s trace in Home Assistant; acceptance does not confirm video playback.`});
 }catch(error){console.warn(`[Home Assistant] Failed while ${stage}; script: ${script}.`);return json(502,{stage,error:error instanceof Error&&error.message.startsWith('Home Assistant')?error.message:`Failed while ${stage}. Check the Home Assistant connection. If playback was submitted, check the script trace before retrying.`});}
}
