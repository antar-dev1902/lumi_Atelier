import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHash,randomUUID} from 'node:crypto';
import {createVercelHandler} from '../server/vercel-api.mjs';

async function call(handler,route,{method='GET',body,headers={},parsed=true}={}){
 const req=Readable.from(body===undefined?[]:[typeof body==='string'?body:JSON.stringify(body)]);
 Object.assign(req,{method,url:'/api/archive?route='+encodeURIComponent(route),query:{route},headers:{host:'lumi.example',...headers},socket:{remoteAddress:'127.0.0.1'}});
 if(body!==undefined&&parsed)req.body=body;
 const result={headers:{}};
 const res={setHeader(k,v){result.headers[k.toLowerCase()]=v;},writeHead(status,values){result.status=status;for(const[k,v]of Object.entries(values))this.setHeader(k,v);},end(text){result.body=JSON.parse(text);}};
 await handler(req,res);return result;
}
const json={'content-type':'application/json'};
const unconfigured=createVercelHandler({env:{}});
assert.equal((await call(unconfigured,'health')).status,503);
assert.equal((await call(unconfigured,'missing')).status,404);
const disallowed=await call(unconfigured,'guestbook',{method:'DELETE'});
assert.equal(disallowed.status,405);assert.equal(disallowed.headers.allow,'GET, POST');
assert.equal((await call(unconfigured,'guestbook',{method:'POST',body:{message:'hello'}})).status,415);
assert.equal((await call(unconfigured,'guestbook',{method:'POST',body:{message:'hello'},headers:{...json,origin:'https://elsewhere.example'}})).status,403);
assert.equal((await call(unconfigured,'guestbook',{method:'POST',body:'{',parsed:false,headers:json})).status,400);
assert.equal((await call(unconfigured,'guestbook',{method:'POST',body:{message:'a'},headers:json})).status,400);
assert.equal((await call(unconfigured,'guestbook',{method:'POST',body:{message:'x'.repeat(141)},headers:json})).status,400);
assert.equal((await call(unconfigured,'guestbook',{method:'POST',body:{message:'hello',extra:'x'.repeat(4096)},headers:json})).status,413);
assert.equal((await call(unconfigured,'visit',{method:'POST',body:{visitorId:'short'},headers:json})).status,400);
const broken=createVercelHandler({env:{UPSTASH_REDIS_REST_URL:'https://redis.example',UPSTASH_REDIS_REST_TOKEN:'private-test-token'},fetchImpl:async()=>{throw Error('private-test-token');}});
const unavailable=await call(broken,'health');
assert.equal(unavailable.status,503);assert.ok(!JSON.stringify(unavailable).includes('private-test-token'));
assert.equal(unavailable.headers['cache-control'],'no-store');
console.log('PASS: Vercel API validation, origin checks, method handling, body limits, explicit missing storage and safe errors.');

const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
if(!url||!token){console.log('SKIP: live Redis integration; provide server-side Redis environment variables to run it.');process.exit(0);}
const prefix='lumi-qa-'+randomUUID(),env={UPSTASH_REDIS_REST_URL:url,UPSTASH_REDIS_REST_TOKEN:token,PATCH_REDIS_PREFIX:prefix,VERCEL_ENV:'preview'};
const fresh=()=>createVercelHandler({env});
const addresses=['192.0.2.10','192.0.2.11'];
try{
 const health=await call(fresh(),'health');assert.equal(health.status,200);assert.equal(health.body.storage,'redis');
 const a=randomUUID(),b=randomUUID();
 const visits=await Promise.all(Array.from({length:5},()=>call(fresh(),'visit',{method:'POST',body:{visitorId:a},headers:json})));
 assert.ok(visits.every(r=>r.status===200&&r.body.count===1));
 assert.equal((await call(fresh(),'visit',{method:'POST',body:{visitorId:b},headers:json})).body.count,2);
 assert.equal((await call(fresh(),'visits')).body.count,2);
 const post=(message,address=addresses[0])=>call(fresh(),'guestbook',{method:'POST',body:{name:'  QA visitor  ',message,color:'invalid'},headers:{...json,origin:'https://lumi.example','x-forwarded-for':address}});
 const first=await post('QA: a little kindness, from profile A.');
 assert.equal(first.status,201);assert.equal(first.body.message.name,'QA visitor');assert.equal(first.body.message.color,'amber');
 const tooFast=await post('QA: this rapid repeat should be limited.');assert.equal(tooFast.status,429);assert.equal(tooFast.headers['retry-after'],'2');
 const second=await post('QA: another visitor can leave a note.',addresses[1]);assert.equal(second.status,201);
 const notes=await call(fresh(),'guestbook');
 assert.equal(notes.status,200);assert.equal(notes.body.messages.length,2);
 assert.deepEqual(notes.body.messages.map(n=>n.id),[second.body.message.id,first.body.message.id]);
 console.log('PASS: real Redis health, concurrent duplicate visits, distinct visits, shared notes across fresh handlers, newest-first ordering and distributed rate limiting.');
}finally{
 const base=prefix+':preview';
 const keys=[base+':visitors',base+':messages',...addresses.map(a=>base+':rate:'+createHash('sha256').update(a).digest('hex'))];
 const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(['DEL',...keys]),signal:AbortSignal.timeout(6000)});
 if(!response.ok)console.warn('QA namespace cleanup needs retry; no production keys were used.');
}
