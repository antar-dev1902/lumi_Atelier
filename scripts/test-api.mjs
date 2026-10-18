import assert from 'node:assert/strict';
import{spawn}from'node:child_process';
import fs from'node:fs/promises';
import path from'node:path';
const directory=await fs.mkdtemp(path.join(process.cwd(),'.qa-data-'));
const port=4194,base='http://127.0.0.1:'+port;
let child;
async function start(){child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:String(port),PATCH_DATA_DIR:directory},stdio:['ignore','pipe','pipe'],windowsHide:true});await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Server did not start')),7000);child.stdout.on('data',d=>{if(d.toString().includes('Patch archive server')){clearTimeout(timeout);resolve();}});child.on('error',reject);child.on('exit',code=>{if(code)reject(new Error('Server exited '+code));});});}
async function stop(){if(!child||child.exitCode!==null)return;await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}
const post=(route,data)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
try{
await start();
assert.equal((await fetch(base+'/api/health')).status,200);
const compressedPage=await fetch(base+'/',{headers:{'Accept-Encoding':'gzip'}});
assert.equal(compressedPage.headers.get('content-encoding'),'gzip');
assert.ok((await compressedPage.text()).includes('id="root"'));
const plainPage=await fetch(base+'/',{headers:{'Accept-Encoding':'gzip;q=0'}});
assert.equal(plainPage.headers.get('content-encoding'),null);
assert.deepEqual((await(await fetch(base+'/api/guestbook')).json()).messages,[]);
assert.equal((await post('/api/guestbook',{message:''})).status,400);
assert.equal((await post('/api/guestbook',{message:'x'.repeat(141)})).status,400);
const visitorId='qa-visitor-00000001';
assert.equal((await(await post('/api/visit',{visitorId})).json()).count,1);
assert.equal((await(await post('/api/visit',{visitorId})).json()).count,1);
assert.equal((await(await post('/api/visit',{visitorId:'qa-visitor-00000002'})).json()).count,2);
const wish='<b>A kind little wish</b>';
const created=await post('/api/guestbook',{name:'Visitor',message:wish,color:'sage'});
assert.equal(created.status,201);
assert.equal((await created.json()).message.message,wish);
assert.equal((await post('/api/guestbook',{message:'Another wish'})).status,429);
assert.equal((await fetch(base+'/api/guestbook',{method:'POST',headers:{'Content-Type':'text/plain'},body:'hello'})).status,415);
assert.equal((await fetch(base+'/assets/patch-hero.webp')).status,200);
assert.equal((await fetch(base+'/assets/missing.webp')).status,404);
await stop();await start();
assert.equal((await(await fetch(base+'/api/guestbook')).json()).messages[0].message,wish);
assert.equal((await(await fetch(base+'/api/visits')).json()).count,2);
console.log('PASS: API validation, real unique visit counting, wish persistence, rate limiting, static assets, and restart persistence.');
}finally{await stop();if(path.dirname(directory)===process.cwd()&&path.basename(directory).startsWith('.qa-data-'))await fs.rm(directory,{recursive:true,force:true});}

