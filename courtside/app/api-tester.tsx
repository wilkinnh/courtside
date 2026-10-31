'use client';
import {useState} from 'react';
import type {Game} from '@/lib/catalog';

type Props={games:Game[];services:string[];request:(url:string,options?:RequestInit)=>Promise<Response>};
export default function ApiTester({games,services,request}:Props){
 const [body,setBody]=useState(()=>JSON.stringify({league:'nhl',event_id:'',services,overrides:[]},null,2));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState('');
 const [result,setResult]=useState<{status:number;ms:number;content:any;request:any}|null>(null);
 const load=(g:Game)=>{setBody(JSON.stringify({league:g.league,event_id:g.id,services,overrides:[]},null,2));setResult(null);setError('');};
 async function run(){
  setError('');setResult(null);let payload:any;
  try{payload=JSON.parse(body);if(!payload||Array.isArray(payload)||typeof payload!=='object')throw new Error();}catch{setError('Enter a valid JSON request object.');return;}
  setBusy(true);const start=performance.now();
  try{const r=await request('/api/v1/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});const text=await r.text();let content:any;try{content=JSON.parse(text);}catch{content=text;}setResult({status:r.status,ms:Math.round(performance.now()-start),content,request:payload});}
  catch(e){setError(e instanceof Error?e.message:'The request failed. Check the server connection.');}finally{setBusy(false);}
 }
 async function copy(value:unknown,label:string){try{await navigator.clipboard.writeText(JSON.stringify(value,null,2));setCopied(label+' copied');}catch{setCopied('Copy failed. Select the text to copy it manually.');}}
 return <article className="panel api-tester"><div className="eyebrow">TRY YOUR AUTOMATION</div><h2>API tester</h2><p>Call this server’s resolver and inspect exactly what Home Assistant receives. Testing does not launch playback. Uses your session API key from Preferences.</p>
 <label className="field-label">Start with a game from the selected schedule<select disabled={busy} defaultValue="" onChange={e=>{const g=games.find(g=>g.id===e.target.value);if(g)load(g);}}><option value="" disabled>Choose a game…</option>{games.map(g=><option key={g.id} value={g.id}>{g.name} · {g.league.toUpperCase()}</option>)}</select></label>
 <div className="tester-actions"><button className="secondary" disabled={busy} onClick={()=>{setBody(JSON.stringify({attributes:{sport_path:'hockey',league_path:'nhl',team_id:'7',date:new Date().toISOString().slice(0,10)},services,overrides:[]},null,2));setResult(null);}}>Use Team Tracker example</button><button className="secondary" disabled={busy} onClick={()=>{try{const p=JSON.parse(body);setBody(JSON.stringify({...p,services},null,2));setError('');}catch{setError('Fix the request JSON before updating services.');}}}>Use my current services</button></div>
 <label className="field-label" htmlFor="api-request">Request JSON · POST /api/v1/resolve</label><textarea id="api-request" spellCheck={false} value={body} disabled={busy} onChange={e=>{setBody(e.target.value);setResult(null);}}/>
 <p>Choose a game, enter a league and event ID, or paste a request containing Team Tracker <code>attributes</code>. Services are editable here without changing your preferences. Saved game URLs are excluded by default.</p>
 <div className="tester-actions"><button className="primary" disabled={busy} onClick={run}>{busy?'Resolving game…':'Send test request'}</button><button className="secondary" onClick={()=>{try{void copy(JSON.parse(body),'Request');}catch{setError('Enter valid JSON before copying.');}}}>Copy request</button></div>
 {error&&<p className="notice" role="alert">{error}</p>}<div aria-live="polite">{copied&&<p>{copied}</p>}{result&&<><h3>HTTP {result.status} · {result.ms} ms</h3><p>{result.content?.event?.name||result.content?.error||'Response received'}</p>{result.content?.reason&&<p>{result.content.reason}</p>}<dl className="tester-summary">{['watch_url','apple_tv_url','link_kind','launchable','device_verified','autoplay_safe'].map(key=><div key={key}><dt>{key}</dt><dd>{String(result.content?.[key]??'null')}</dd></div>)}</dl><details><summary>Request sent</summary><pre>{JSON.stringify(result.request,null,2)}</pre></details><h3>Full response</h3><button className="secondary" onClick={()=>copy({status:result.status,content:result.content},'Response')}>Copy response</button><pre className="tester-response">{JSON.stringify({status:result.status,content:result.content},null,2)}</pre></>}</div>
 </article>;
}
