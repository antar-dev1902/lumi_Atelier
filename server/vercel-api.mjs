import {createHash,randomUUID} from 'node:crypto';

const writeWish=`
if not redis.call('SET', KEYS[2], '1', 'NX', 'PX', 1500) then return 0 end
redis.call('LPUSH', KEYS[1], ARGV[1])
redis.call('LTRIM', KEYS[1], 0, 499)
return 1`;

class HttpError extends Error {
 constructor(status,message){super(message);this.status=status;}
}

async function readInput(req){
 let value=req.body;
 if(value===undefined){
  const chunks=[];let size=0;
  for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>4096)throw new HttpError(413,'That request is too large.');chunks.push(Buffer.from(chunk));}
  value=Buffer.concat(chunks).toString('utf8');
 }
 if(Buffer.isBuffer(value))value=value.toString('utf8');
 if(typeof value==='string'){
  if(Buffer.byteLength(value)>4096)throw new HttpError(413,'That request is too large.');
  try{value=JSON.parse(value||'{}');}catch{throw new HttpError(400,'That request could not be read.');}
 }
 if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(400,'Please send a JSON object.');
 if(Buffer.byteLength(JSON.stringify(value))>4096)throw new HttpError(413,'That request is too large.');
 return value;
}

export function createVercelHandler({env=process.env,fetchImpl=globalThis.fetch}={}){
 return async function handler(req,res){
  const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  try{
   const url=new URL(req.url,'https://'+(req.headers.host||'localhost'));
   const route=String(req.query?.route??url.searchParams.get('route')??url.pathname.replace(/^\/api\/?/,''));
   const methods={health:['GET'],guestbook:['GET','POST'],visits:['GET'],visit:['POST']};
   if(!Object.hasOwn(methods,route))throw new HttpError(404,'This little corner is missing.');
   if(!methods[route].includes(req.method)){res.setHeader('Allow',methods[route].join(', '));throw new HttpError(405,'Method not allowed.');}
   let input;
   if(req.method==='POST'){
    if(!/^application\/json(?:;|$)/i.test(String(req.headers['content-type']||'')))throw new HttpError(415,'Please send JSON.');
    if(req.headers.origin){
     let sameOrigin=false;
     try{sameOrigin=new URL(req.headers.origin).host===req.headers.host;}catch{}
     if(!sameOrigin)throw new HttpError(403,'This atelier accepts notes from its own website.');
    }
    input=await readInput(req);
   }
   let visitorHash,entry;
   if(route==='visit'){
    const id=String(input.visitorId||'');
    if(!/^[a-zA-Z0-9-]{16,80}$/.test(id))throw new HttpError(400,'A visitor identifier is required.');
    visitorHash=createHash('sha256').update(id).digest('hex');
   }
   if(route==='guestbook'&&req.method==='POST'){
    const name=String(input.name||'A kind visitor').trim().replace(/[\u0000-\u001f]/g,'').slice(0,24)||'A kind visitor';
    const message=String(input.message||'').trim().replace(/[\u0000-\u001f]/g,'');
    if(message.length<3||message.length>140)throw new HttpError(400,'Please write a wish between 3 and 140 characters.');
    entry={id:randomUUID(),name,message,color:['amber','lavender','sage','peach'].includes(input.color)?input.color:'amber',createdAt:new Date().toISOString()};
   }
   const restUrl=env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL;
   const token=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;
   if(!restUrl||!token)throw new HttpError(503,'Shared atelier storage is not configured yet.');
   let endpoint;try{endpoint=new URL(restUrl);if(endpoint.protocol!=='https:')throw Error();}catch{throw new HttpError(503,'Shared atelier storage is unavailable.');}
   const prefix=(env.PATCH_REDIS_PREFIX||'lumi-atelier')+':'+(env.VERCEL_ENV||'development');
   async function redis(command){
    const response=await fetchImpl(endpoint.href,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(6000)});
    if(!response.ok)throw new HttpError(503,'Shared atelier storage is temporarily unavailable.');
    const data=await response.json();
    if(data.error||!Object.hasOwn(data,'result'))throw new HttpError(503,'Shared atelier storage is temporarily unavailable.');
    return data.result;
   }
   if(route==='health'){await redis(['PING']);return json(200,{ok:true,storage:'redis'});}
   if(route==='visit'){
    await redis(['SADD',prefix+':visitors',visitorHash]);
    return json(200,{count:Number(await redis(['SCARD',prefix+':visitors']))});
   }
   if(route==='visits')return json(200,{count:Number(await redis(['SCARD',prefix+':visitors']))});
   if(req.method==='GET'){
    const rows=await redis(['LRANGE',prefix+':messages',0,59]);
    const messages=rows.flatMap(row=>{try{return [typeof row==='string'?JSON.parse(row):row];}catch{return [];}});
    return json(200,{messages});
   }
   const address=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'anonymous').split(',')[0].trim();
   const rateKey=prefix+':rate:'+createHash('sha256').update(address).digest('hex');
   const written=await redis(['EVAL',writeWish,2,prefix+':messages',rateKey,JSON.stringify(entry)]);
   if(Number(written)!==1){res.setHeader('Retry-After','2');throw new HttpError(429,'Give your last wish a moment to settle, then try again.');}
   return json(201,{message:entry});
  }catch(error){
   return json(error instanceof HttpError?error.status:503,{error:error instanceof HttpError?error.message:'The atelier could not connect to shared storage. Please try again.'});
  }
 };
}
