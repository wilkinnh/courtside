export type Prefs={hhnSetup:boolean;hiddenSports:string[];services:string[];channels:string[];favorites:string[];hideScores:boolean;onlyMine:boolean;overrides:{event_id:string;league:string;service:string;url:string}[]};
export const initialPreferences:Prefs={hhnSetup:true,hiddenSports:["Men's pro basketball","Men's college basketball"],services:['prime','prime-hhn','xfinity','disney','paramount','peacock','max','espn','ota'],channels:[],favorites:[],hideScores:false,onlyMine:false,overrides:[]};

// Bound persisted input and accept only the fields used by the UI. Credentials never belong here.
export function validPreferences(value:unknown,partial=false):value is Prefs{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const record=value as Record<string,unknown>;
 if(Object.keys(record).some(key=>!Object.hasOwn(initialPreferences,key)))return false;
 return Object.entries(initialPreferences).every(([key])=>{
  if(!Object.hasOwn(record,key))return partial;
  const item=record[key];
  if(['hhnSetup','hideScores','onlyMine'].includes(key))return typeof item==='boolean';
  if(!Array.isArray(item)||item.length>1000)return false;
  if(key!=='overrides')return item.every(v=>typeof v==='string'&&v.length<=200);
  return item.every(v=>v&&typeof v==='object'&&Object.keys(v).every(k=>['event_id','league','service','url'].includes(k))&&['event_id','league','service','url'].every(k=>typeof v[k]==='string'&&v[k].length<=(k==='url'?4096:200))&&(()=>{try{return new URL(v.url).protocol==='https:';}catch{return false;}})());
 });
}
