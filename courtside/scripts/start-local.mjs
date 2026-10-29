import {spawnSync, spawn} from 'node:child_process';
import {existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<13)){
  console.error('Courtside requires Node.js 22.13 or newer.');process.exit(1);
}
if(!existsSync('.env'))copyFileSync('.env.example','.env');
// Native dotenv parsing: the file is configuration, never executed as shell code.
process.loadEnvFile('.env');
process.env.HOST ||= process.env.BIND_ADDRESS || '127.0.0.1';
process.env.PORT ||= '8788';
const port=Number(process.env.PORT);
if(!Number.isInteger(port)||port<1||port>65535){console.error('PORT must be between 1 and 65535.');process.exit(1);}
if(process.env.COURTSIDE_API_KEY&&process.env.COURTSIDE_API_KEY.length<24){console.error('COURTSIDE_API_KEY must be at least 24 characters, or empty.');process.exit(1);}

function run(args){
  const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{stdio:'inherit',env:process.env});
  if(result.error){console.error(result.error.message);process.exit(1);}
  if(result.status!==0)process.exit(result.status||1);
}
const fingerprint=createHash('sha256').update(readFileSync('package-lock.json')).update(readFileSync('package.json')).update(process.versions.node).digest('hex');
const stamp='.local/dependencies.sha256';
if(!existsSync('node_modules/.bin/vite')||!existsSync(stamp)||readFileSync(stamp,'utf8')!==fingerprint){
  console.log('Installing dependencies…');run(['ci']);mkdirSync('.local',{recursive:true});writeFileSync(stamp,fingerprint);
}
console.log('Building the local website…');run(['run','build:local']);
console.log(`Starting Courtside at http://localhost:${port}`);
if(process.env.HOST==='0.0.0.0')console.log(`LAN access enabled: use http://YOUR_SERVER_LAN_IP:${port} from other devices.`);
console.log('Keep this terminal open. Press Ctrl+C to stop.');
const child=spawn(process.execPath,['--experimental-strip-types','server.ts'],{stdio:'inherit',env:process.env});
child.on('error',e=>{console.error(e.message);process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',(code,signal)=>{process.exitCode=code??(signal==='SIGINT'?130:1);});
