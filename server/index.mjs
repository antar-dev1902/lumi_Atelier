import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
const compress=promisify(gzip);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=process.env.PATCH_DATA_DIR||path.join(root,'.data');
const port=Number(process.env.PORT||4174);
const host=process.env.HOST||'127.0.0.1';
await fs.mkdir(dataDir,{recursive:true});
const dbFile=path.join(dataDir,'archive.json');
let db={messages:[],visitors:[],count:0};
try{const saved=JSON.parse(await fs.readFile(dbFile,'utf8'));if(Array.isArray(saved.messages)&&Array.isArray(saved.visitors)&&Number.isFinite(saved.count))db=saved;}catch(e){if(e.code!=='ENOENT')console.warn('Could not read existing archive data; check .data/archive.json.');}
let writes=Promise.resolve();
function save(){writes=writes.catch(()=>{}).then(async()=>{const tmp=dbFile+'.tmp';await fs.writeFile(tmp,JSON.stringify(db,null,2));await fs.rename(tmp,dbFile);});return writes;}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw new Error('too-large');}return JSON.parse(text||'{}');}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.json':'application/json'};
const rate=new Map();
const server=http.createServer(async(req,res)=>{
try{
const url=new URL(req.url,'http://localhost');
if(url.pathname.startsWith('/api/')){
if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{ok:true});
if(req.method==='GET'&&url.pathname==='/api/guestbook')return json(res,200,{messages:db.messages.slice(-60).reverse()});
if(req.method==='GET'&&url.pathname==='/api/visits')return json(res,200,{count:db.count});
if(req.method==='POST'){
if(!String(req.headers['content-type']||'').includes('application/json'))return json(res,415,{error:'Please send JSON.'});
const origin=req.headers.origin;
if(origin&&new URL(origin).hostname!==new URL('http://'+req.headers.host).hostname)return json(res,403,{error:'This archive accepts wishes from its own website.'});
const input=await body(req);
if(url.pathname==='/api/visit'){
const id=String(input.visitorId||'');if(!/^[a-zA-Z0-9-]{16,80}$/.test(id))return json(res,400,{error:'A visitor identifier is required.'});
const hash=crypto.createHash('sha256').update(id).digest('hex');
if(!db.visitors.includes(hash)){db.visitors.push(hash);db.count++;await save();}return json(res,200,{count:db.count});
}
if(url.pathname==='/api/guestbook'){
const name=String(input.name||'A kind visitor').trim().replace(/[\u0000-\u001f]/g,'').slice(0,24)||'A kind visitor';
const message=String(input.message||'').trim().replace(/[\u0000-\u001f]/g,'');
if(message.length<3||message.length>140)return json(res,400,{error:'Please write a wish between 3 and 140 characters.'});
const key=req.socket.remoteAddress||'local';const now=Date.now();if(now-(rate.get(key)||0)<1500)return json(res,429,{error:'Give your last wish a moment to settle, then try again.'});
rate.set(key,now);
const entry={id:crypto.randomUUID(),name,message,color:['amber','lavender','sage','peach'].includes(input.color)?input.color:'amber',createdAt:new Date().toISOString()};
db.messages.push(entry);if(db.messages.length>500)db.messages=db.messages.slice(-500);await save();return json(res,201,{message:entry});
}}
return json(res,404,{error:'This little corner is missing.'});}
if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
const dist=path.join(root,'dist');const decoded=decodeURIComponent(url.pathname);
let requested=path.resolve(dist,'.'+decoded);
if(!requested.startsWith(dist+path.sep)&&requested!==dist)return json(res,403,{error:'Not allowed.'});
let stat;try{stat=await fs.stat(requested);}catch{}
if(!stat||!stat.isFile()){if(path.extname(decoded))return json(res,404,{error:'Asset not found.'});requested=path.join(dist,'index.html');}
let file;try{file=await fs.readFile(requested);}catch{return json(res,503,{error:'Run npm run build to prepare the website, or npm run dev for development.'});}
const extension=path.extname(requested),compressible=['.html','.js','.css','.svg','.json','.txt','.ttf'].includes(extension);
const acceptsGzip=String(req.headers['accept-encoding']||'').split(',').some(part=>{const [encoding,...params]=part.trim().split(';');return encoding==='gzip'&&!params.some(p=>/^\s*q\s*=\s*0(?:\.0*)?\s*$/.test(p));});
const headers={'Content-Type':types[extension]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':extension==='.html'?'no-cache':'public, max-age=86400'};
if(compressible){headers.Vary='Accept-Encoding';if(acceptsGzip){file=await compress(file);headers['Content-Encoding']='gzip';}}
headers['Content-Length']=file.length;
res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:file);
}catch(e){json(res,e.message==='too-large'?413:400,{error:e instanceof SyntaxError?'That request could not be read.':'Could not save this time. Please try again.'});}
});
server.listen(port,host,()=>console.log('Patch archive server: http://'+host+':'+port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit()));

