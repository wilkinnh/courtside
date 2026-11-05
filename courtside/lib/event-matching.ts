import {leagues,type Game} from './catalog.ts';
export const normalizedName=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
type TeamNames={name?:string;shortName?:string};
// Only catalog-provided names are compared. No team allowlist or nickname guesses.
function names(team:TeamNames,league:string):string[]{
 const soccer=leagues.find(l=>l.id===league)?.sport==='Soccer';
 return [team.name,team.shortName].filter((s):s is string=>typeof s==='string'&&!!s.trim()).flatMap(s=>[normalizedName(s),...(soccer?[normalizedName(s.replace(/\b(?:FC|FK|SK|SSC|RC|KV|CF|SC|AFC)\b/gi,''))]:[])]).filter(Boolean);
}
export function teamsMatch(a:TeamNames,b:TeamNames,league:string){const right=names(b,league);return names(a,league).some(n=>right.includes(n));}
export function titleMatches(title:string,g:Game){
 const sides=title.replace(/\s*\((?:Español|Spanish)\)\s*$/i,'').split(/\s+(?:v\.?|vs\.?|at|@)\s+/i);
 return sides.length===2&&g.teams.length===2&&[g.teams,[...g.teams].reverse()].some(ts=>ts.every((t,i)=>teamsMatch({name:sides[i]},t,g.league)));
}
function leagueMatches(value:string,g:Game){
 const league=leagues.find(l=>l.id===g.league);if(!league)return false;
 const normalize=(s:string)=>normalizedName(s.replace(/^UEFA\s+/i,''));
 return [league.name,league.id].some(n=>normalize(n)===normalize(value));
}
export function appleEventMatches(c:any,g:Game):boolean{
 const kickoff=c?.eventTime?.gameKickOffStartTime,date=Date.parse(g.date);
 if(!c||!/^umc\.cse\.[a-z0-9]+$/.test(c.id||'')||!leagueMatches(c.leagueName||'',g)||!Number.isFinite(kickoff)||!Number.isFinite(date)||Math.abs(kickoff-date)>15*60000)return false;
 if(!Array.isArray(c.competitors)||c.competitors.length!==2||g.teams.length!==2)return false;
 const sides=g.teams.map(t=>c.competitors.filter((x:any)=>x.isHome===(t.homeAway==='home')));
 if(g.teams.some(t=>!['home','away'].includes(t.homeAway))||sides.some(xs=>xs.length!==1))return false;
 const matches=g.teams.map((t,i)=>teamsMatch(sides[i][0],t,g.league));
 if(matches.every(Boolean))return true;
 // A translated opponent can be corroborated by exact venue, kickoff and one team.
 return matches.filter(Boolean).length===1&&kickoff===date&&!!g.venue&&!!c.venueName&&normalizedName(g.venue)===normalizedName(c.venueName);
}
