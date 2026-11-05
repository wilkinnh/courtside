'use client';
import {useEffect,useRef,useState,type SetStateAction} from 'react';
import {migrateHiddenSports} from '../lib/catalog';
import {initialPreferences,validPreferences,type Prefs} from '../lib/preferences';

export function usePreferences(apiFetch:(url:string,options?:RequestInit)=>Promise<Response>){
 const [prefs,render]=useState<Prefs>(initialPreferences);
 const [syncStatus,setSyncStatus]=useState('Connecting preferences…');
 const current=useRef(prefs),pending=useRef<Partial<Prefs>>({});
 const synchronize=useRef<()=>void>(()=>{});
 const setPrefs=(action:SetStateAction<Prefs>)=>{
  const next=typeof action==='function'?action(current.current):action;
  for(const key of Object.keys(next) as (keyof Prefs)[]){
   if(JSON.stringify(next[key])!==JSON.stringify(current.current[key]))Object.assign(pending.current,{[key]:next[key]});
  }
  current.current=next;render(next);setSyncStatus('Saving preferences…');synchronize.current();
 };
 useEffect(()=>{
  let stopped=false,busy=false,initialized=false;
  let candidate=initialPreferences;
  try{
   const saved=JSON.parse(localStorage.getItem('courtside-v1')||'null');
   if(saved&&Array.isArray(saved.services)){
    const migrated={...initialPreferences,...saved,hhnSetup:true,services:saved.hhnSetup?saved.services:[...new Set([...saved.services,'prime','prime-hhn'])],hiddenSports:migrateHiddenSports(saved.hiddenSports)};
    if(validPreferences(migrated))candidate=migrated;
   }
  }catch{}
  current.current={...candidate,...pending.current};render(current.current);
  const publish=(value:Prefs)=>{
   if(stopped)return;
   current.current={...value,...pending.current};render(current.current);
   try{localStorage.setItem('courtside-v1',JSON.stringify(current.current));}catch{}
   setSyncStatus(Object.keys(pending.current).length?'Saving preferences…':'Saved across devices');
  };
  const request=async(method='GET',body?:unknown)=>{
   const response=await apiFetch('/api/v1/preferences',{method,cache:'no-store',signal:AbortSignal.timeout(15000),...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
   if(!response.ok)throw new Error('Preferences request failed');
   const result=await response.json();
   if(!result||typeof result!=='object'||!('preferences' in result))throw new Error('Invalid server response');
   if(result.preferences!==null&&!validPreferences(result.preferences))throw new Error('Invalid server preferences');
   return result.preferences as Prefs|null;
  };
  const sync=async()=>{
   if(stopped||busy)return;
   busy=true;
   try{
    if(!initialized){
     const shared=await request()||await request('POST',candidate);
     if(!shared)throw new Error('Preferences unavailable');
     initialized=true;publish(shared);
    }
    // Drain edits made while a request was in flight, merging only changed fields.
    if(Object.keys(pending.current).length){
     while(!stopped&&Object.keys(pending.current).length){
      const patch=pending.current;pending.current={};
      try{const saved=await request('PATCH',patch);if(!saved)throw new Error('Preferences unavailable');publish(saved);}
      catch(error){pending.current={...patch,...pending.current};throw error;}
     }
    }else{
     const shared=await request();if(!shared)throw new Error('Preferences unavailable');publish(shared);
    }
   }catch{
    if(!stopped)setSyncStatus('Preferences not synced — retrying. Check server access.');
   }finally{busy=false;}
  };
  synchronize.current=()=>{void sync();};
  void sync();
  const timer=setInterval(()=>void sync(),5000);
  const focus=()=>void sync();
  window.addEventListener('focus',focus);window.addEventListener('online',focus);
  return()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);};
 },[apiFetch]);
 return {prefs,setPrefs,syncStatus,syncPreferences:()=>synchronize.current()};
}
