import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validPreferences,type Prefs} from './preferences.ts';

export function createPreferenceStore(directory:string){
 const file=join(directory,'preferences.json');
 let queue:Promise<unknown>=Promise.resolve();
 async function read():Promise<Prefs|null>{
  let text:string;
  try{text=await readFile(file,'utf8');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
  const prefs:unknown=JSON.parse(text);
  if(!validPreferences(prefs))throw new Error('Invalid saved preferences');
  return prefs;
 }
 function serialized<T>(operation:()=>Promise<T>):Promise<T>{
  const result=queue.then(operation);queue=result.catch(()=>{});return result;
 }
 return {
  read:()=>serialized(read),
  update:(patch:Partial<Prefs>,initialize=false)=>serialized(async()=>{
   const current=await read();
   if(initialize&&current)return current;
   if(!current&&!initialize)throw new Error('Preferences have not been initialized');
   const next={...current,...patch};
   if(!validPreferences(next))throw new Error('Invalid preferences');
   await mkdir(directory,{recursive:true});
   const temporary=join(directory,`.preferences-${randomUUID()}.tmp`);
   try{await writeFile(temporary,JSON.stringify(next,null,2)+'\n',{mode:0o600});await rename(temporary,file);}
   finally{await rm(temporary,{force:true});}
   return next;
  }),
 };
}
