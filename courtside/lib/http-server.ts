import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {api} from './sports.ts';

const types:Record<string,string>={
 '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp',
 '.ico':'image/x-icon','.woff2':'font/woff2','.md':'text/plain; charset=utf-8',
 '.yaml':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8',
};
export function createCourtsideServer({assetDirectory,key}:{assetDirectory:string;key?:string}){
 const root=resolve(assetDirectory);
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  const send=(status:number,message:string)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:message}));};
  try{
   // Reject absolute request targets; never derive upstream hosts from a request.
   if(!req.url?.startsWith('/')||req.url.startsWith('//')){send(400,'Invalid request target');return;}
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api/')){
    // Liveness contains no user data and remains available to Docker health checks.
    if(key&&url.pathname!=='/api/v1/health'){
     const expected=Buffer.from('Bearer '+key),received=Buffer.from(req.headers.authorization||'');
     if(received.length!==expected.length||!timingSafeEqual(received,expected)){send(401,'Unauthorized');return;}
    }
    let size=0;const chunks:Buffer[]=[];
    for await(const chunk of req){size+=chunk.length;if(size>32768){send(413,'Payload too large');return;}chunks.push(chunk);}
    const request=new Request(url,{method:req.method,headers:{'Content-Type':'application/json'},...(['GET','HEAD'].includes(req.method||'GET')?{}:{body:Buffer.concat(chunks).toString()})});
    const result=await api(request);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
   }
   if(!['GET','HEAD'].includes(req.method||'')){send(405,'Method not allowed');return;}
   let pathname:string;try{pathname=decodeURIComponent(url.pathname);}catch{send(400,'Invalid path');return;}
   if(pathname.includes('\0')||pathname.split('/').some(p=>p.startsWith('.'))){send(404,'Not found');return;}
   const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(root+sep)){send(404,'Not found');return;}
   let info;try{info=await stat(file);}catch{send(404,'Not found');return;}
   if(!info.isFile()){send(404,'Not found');return;}
   const content=await readFile(file);
   res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':content.length,'Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'});
   res.end(req.method==='HEAD'?undefined:content);
  }catch{if(!res.headersSent)send(500,'Request failed');else res.end();}
 });
 server.requestTimeout=30000;server.headersTimeout=15000;
 return server;
}
