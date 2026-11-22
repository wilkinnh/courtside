'use client';
import {useEffect,useState} from 'react';
import {leagues} from '../lib/catalog';
import {teamKey,validPreferences,type FavoriteTeam} from '../lib/preferences';

type Props={teams:FavoriteTeam[];toggle:(team:FavoriteTeam)=>void;request:(url:string,options?:RequestInit)=>Promise<Response>};
export default function FavoriteTeams({teams,toggle,request}:Props){
 const [league,setLeague]=useState('nhl'),[query,setQuery]=useState(''),[directory,setDirectory]=useState<FavoriteTeam[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');setDirectory([]);
  request(`/api/v1/teams?league=${encodeURIComponent(league)}`,{signal:controller.signal}).then(async response=>{
   const result=await response.json() as {teams:FavoriteTeam[]};if(!response.ok||!result||!validPreferences({favoriteTeams:result.teams},true))throw new Error('Team directory unavailable');
   if(!controller.signal.aborted)setDirectory(result.teams);
  }).catch(()=>{if(!controller.signal.aborted)setError('Could not load teams. Please try again.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[league,request,retry]);
 return <section aria-label="Favorite teams"><h3>Favorite teams</h3><p>Their live and upcoming games appear in Starred for the selected schedule date, even without a matching service. Hidden sports stay hidden. Changes save across devices.</p>
 {teams.length>0?<div className="favorite-team-list">{teams.map(team=><div className="saved-link" key={teamKey(team)}><span>{team.name} · {leagues.find(l=>l.id===team.league)?.name}</span><button aria-label={`Remove ${team.name} from favorite teams`} onClick={()=>toggle(team)}>Remove</button></div>)}</div>:<p>No favorite teams yet. Choose a league and add a team below.</p>}
 <label className="field-label">League<select value={league} onChange={event=>{setLeague(event.target.value);setQuery('');}}>{leagues.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
 <label className="field-label">Find a team<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search this league"/></label>
 {loading?<p role="status">Loading teams…</p>:error?<p role="alert">{error} <button className="secondary" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:<div className="favorite-team-results">{directory.filter(t=>t.name.toLowerCase().includes(query.toLowerCase())).map(team=><label className="setting-row" key={teamKey(team)}><b>{team.name}</b><input type="checkbox" checked={teams.some(t=>teamKey(t)===teamKey(team))} onChange={()=>toggle(team)} aria-label={`Follow ${team.name}`}/></label>)}{!directory.some(t=>t.name.toLowerCase().includes(query.toLowerCase()))&&<p>No teams found in this league.</p>}</div>}
 </section>;
}
