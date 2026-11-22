import {leagues,type Game} from './catalog.ts';
export type FavoriteTeam={id:string;league:string;name:string};
export const teamKey=(team:Pick<FavoriteTeam,'id'|'league'>)=>`${team.league}:${team.id}`;
export function followsGame(game:Game,teams:FavoriteTeam[]){return teams.some(t=>t.league===game.league&&game.teams.some(g=>g.id===t.id));}
export type Prefs={hhnSetup:boolean;hiddenSports:string[];services:string[];channels:string[];favorites:string[];favoriteTeams:FavoriteTeam[];hideScores:boolean;onlyMine:boolean};
export const initialPreferences:Prefs={hhnSetup:true,hiddenSports:["Men's pro basketball","Men's college basketball"],services:['prime','prime-hhn','xfinity','disney','paramount','peacock','max','espn','ota'],channels:[],favorites:[],favoriteTeams:[],hideScores:false,onlyMine:false};

// Bound persisted input and accept only the fields used by the UI. Credentials never belong here.
export function validPreferences(value:unknown,partial=false,allowLegacyOverrides=false):value is Prefs{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const record=value as Record<string,unknown>;
 if(Object.keys(record).some(key=>!Object.hasOwn(initialPreferences,key)&&!(allowLegacyOverrides&&key==='overrides')))return false;
 return Object.entries(initialPreferences).every(([key])=>{
  if(!Object.hasOwn(record,key))return partial;
  const item=record[key];
  if(['hhnSetup','hideScores','onlyMine'].includes(key))return typeof item==='boolean';
  if(!Array.isArray(item)||item.length>1000)return false;
  if(key==='favoriteTeams')return item.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['id','league','name'].includes(k))&&typeof v.id==='string'&&/^\d{1,15}$/.test(v.id)&&leagues.some(l=>l.id===v.league)&&typeof v.name==='string'&&v.name.trim().length>0&&v.name.length<=200)&&new Set(item.map(v=>teamKey(v))).size===item.length;
  return item.every(v=>typeof v==='string'&&v.length<=200);
 });
}
