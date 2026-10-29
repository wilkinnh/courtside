import {createCourtsideServer} from './lib/http-server.ts';
const port=Number(process.env.PORT||8788);
const host=process.env.HOST||'127.0.0.1';
const key=process.env.COURTSIDE_API_KEY||undefined;
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535.');
if(key&&key.length<24)throw new Error('COURTSIDE_API_KEY must be at least 24 characters when set.');
const server=createCourtsideServer({assetDirectory:process.env.ASSET_DIRECTORY||'dist-local',key});
server.listen(port,host,()=>console.log(`Courtside website and API listening at http://${host}:${port}`));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{
 server.close(()=>process.exit(0));
 setTimeout(()=>process.exit(1),10000).unref();
});
