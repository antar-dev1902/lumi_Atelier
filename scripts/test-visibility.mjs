import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';

const root=process.cwd(),profile=await fs.mkdtemp(path.join(root,'.qa-visibility-'));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const pending=new Map(),errors=[];let browser,ws,id=0;
function send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));setTimeout(()=>{if(pending.has(key)){pending.delete(key);reject(Error('CDP timeout: '+method));}},12000).unref();});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function waitFor(expression){for(let i=0;i<80;i++){if(await evaluate(expression))return;await delay(120);}throw Error('Visibility wait timed out: '+expression);}
async function click(selector){await evaluate('document.querySelector('+JSON.stringify(selector)+').click()');await delay(100);}
async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(root,'qa',name+'.png'),Buffer.from(r.data,'base64'));}
async function visible(){const r=await evaluate('(()=>{const el=document.querySelector(".journey-patch"),r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,opacity:getComputedStyle(el).opacity,width:innerWidth,height:innerHeight};})()');assert.ok(Number(r.opacity)>0&&r.x>=0&&r.right<=r.width&&r.y>=0&&r.bottom<=r.height,'Lumi is visible: '+JSON.stringify(r));}
async function enter(){await waitFor('!!document.querySelector(".crt-screen-start")');await click('.crt-screen-start');await waitFor('!!document.querySelector(".journey")&&!document.querySelector(".theatre-transition")');await delay(600);}
try{
 await fs.mkdir(path.join(root,'qa'),{recursive:true});
 browser=spawn(process.env.PATCH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-crash-reporter','--disable-breakpad','--disable-crashpad','--disable-features=Crashpad','--no-first-run','--no-default-browser-check','--mute-audio','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
 let port;for(let i=0;i<80;i++){try{port=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await delay(150);}}
 assert.ok(port);const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id&&pending.has(data.id)){const call=pending.get(data.id);pending.delete(data.id);data.error?call.reject(Error(JSON.stringify(data.error))):call.resolve(data.result);}if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);if(data.method==='Fetch.requestPaused')send('Fetch.fulfillRequest',{requestId:data.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({count:0})).toString('base64')}).catch(e=>errors.push(e.message));});
 await send('Page.enable');await send('Runtime.enable');
 // This check never changes the real visitor counter or wish wall.
 await send('Fetch.enable',{patterns:[{urlPattern:'*/api/visit',requestStage:'Request'}]});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:process.env.LUMI_VISIBILITY_URL||'http://127.0.0.1:5173/'});await enter();await visible();
 await waitFor('document.querySelector(".patch-mesh").dataset.ready==="true"&&!document.querySelector(".patch-rig-fallback")');
 const pixels=await evaluate('new Promise(resolve=>requestAnimationFrame(()=>{const c=document.querySelector(".patch-mesh"),gl=c.getContext("webgl"),data=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,data);let count=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)count++;resolve(count);}))');assert.ok(pixels>1000,'The live development rig renders actual pixels');await screenshot('lumi-live-desktop');
 for(const [width,height] of [[1440,1000],[390,844],[360,640]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await evaluate('(()=>{const el=document.querySelector(".journey");window.scrollTo({top:(el.offsetHeight-innerHeight)*.72,behavior:"instant"});})()');await waitFor('Math.abs(Number(document.querySelector(".journey").dataset.motionProgress)-.72)<.004');await delay(500);await visible();await click('.journey-controls .icon-button[aria-label="Reduce character movement"]');await delay(200);await visible();await screenshot('lumi-books-gentle-'+width);await click('.journey-controls .icon-button[aria-label="Animate Lumi"]');await delay(500);}
 await evaluate('window.lumiContext=document.querySelector(".patch-mesh").getContext("webgl").getExtension("WEBGL_lose_context");window.lumiContext.loseContext()');await waitFor('!!document.querySelector(".patch-rig-fallback")');await visible();await screenshot('lumi-context-fallback');await evaluate('window.lumiContext.restoreContext()');await waitFor('document.querySelector(".patch-mesh").dataset.ready==="true"&&!document.querySelector(".patch-rig-fallback")');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:'const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==="webgl"||kind==="webgl2"?null:original.call(this,kind,...args);};'});
 await send('Page.reload');await enter();await waitFor('document.querySelector(".patch-mesh").dataset.rig==="fallback"&&!!document.querySelector(".patch-rig-fallback")');await visible();await screenshot('lumi-without-webgl');
 assert.deepEqual(errors,[]);console.log('PASS: Lumi renders in the live Vite/React development preview, remains visible beside books on desktop and phones in gentle mode, and has a visible fallback during lost or unsupported WebGL.');
}catch(error){
 console.error('Browser exceptions:',errors);try{console.error('Page state:',await evaluate('({title:document.title,body:document.body.innerText.slice(0,900),curtain:!!document.querySelector(".theatre-transition"),journey:!!document.querySelector(".journey")})'));await screenshot('visibility-failure');}catch{}throw error;
}finally{
 try{if(ws?.readyState===1)await send('Browser.close');}catch{}ws?.close();if(browser&&browser.exitCode===null)browser.kill();await delay(300);if(path.dirname(profile)===root&&path.basename(profile).startsWith('.qa-visibility-'))try{await fs.rm(profile,{recursive:true,force:true});}catch{}
}
