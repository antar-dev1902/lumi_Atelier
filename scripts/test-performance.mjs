import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const root=process.cwd(),profile=await fs.mkdtemp(path.join(root,'.qa-performance-'));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),pending=new Map();
let server,browser,ws,id=0;
function send(method,params={}){return new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>{pending.delete(key);reject(Error('Timed out: '+method));},20000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}));});}
async function run(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
try{
 server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:'4191',PATCH_DATA_DIR:path.join(profile,'data')},stdio:['ignore','pipe','pipe'],windowsHide:true});
 await new Promise((resolve,reject)=>{server.stdout.on('data',chunk=>{if(chunk.toString().includes('Patch archive server'))resolve();});server.on('error',reject);});
 browser=spawn(process.env.PATCH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-networking','--disable-component-update','--disable-sync','--disable-crash-reporter','--disable-breakpad','--disable-crashpad','--disable-features=Crashpad','--no-first-run','--no-default-browser-check','--mute-audio','--proxy-server=http://127.0.0.1:9','--proxy-bypass-list=localhost;127.0.0.1;[::1]','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
 let port;for(let i=0;i<100;i++){try{port=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await delay(100);}}
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const call=pending.get(message.id);pending.delete(message.id);clearTimeout(call.timer);message.error?call.reject(Error(JSON.stringify(message.error))):call.resolve(message.result);}});
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:90000});
 await send('Emulation.setCPUThrottlingRate',{rate:4});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__vitals={lcp:0,cls:0};new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__vitals.lcp=e.startTime;window.__vitals.lcpElement=e.element?.className;window.__vitals.lcpUrl=e.url;window.__vitals.lcpSize=e.size;}}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__vitals.cls+=e.value;}).observe({type:'layout-shift',buffered:true});`});
 await send('Page.navigate',{url:'http://127.0.0.1:4191/'});
 for(let i=0;i<160;i++){if(await run('document.readyState==="complete"&&document.fonts.status==="loaded"&&document.querySelector(".crt-patch")?.complete'))break;await delay(120);}
 await delay(800);
 const metrics=await run(`(()=>{const nav=performance.getEntriesByType('navigation')[0],resources=performance.getEntriesByType('resource');return {...window.__vitals,domReady:nav.domContentLoadedEventEnd,load:nav.loadEventEnd,transferredBytes:resources.reduce((n,r)=>n+r.transferSize,nav.transferSize),externalRequests:resources.filter(r=>new URL(r.name).hostname!=='127.0.0.1').length,decodedHero:document.querySelector('.crt-patch').naturalWidth>0,overflow:document.documentElement.scrollWidth>innerWidth,resources:resources.map(r=>({name:new URL(r.name).pathname,encodedBytes:r.encodedBodySize,transferBytes:r.transferSize,duration:r.duration}))};})()`);
 assert.ok(metrics.decodedHero&&!metrics.overflow);assert.equal(metrics.externalRequests,0);
 const report={environment:'Local Chrome, cold cache, 390x844, 4x CPU slowdown, 150ms latency, 200000 bytes/sec download; not a Lighthouse score',...metrics};
 await fs.mkdir(path.join(root,'qa'),{recursive:true});await fs.writeFile(path.join(root,'qa','performance-local.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({environment:report.environment,lcpMs:Math.round(report.lcp),cls:report.cls,loadMs:Math.round(report.load),transferredBytes:report.transferredBytes,externalRequests:report.externalRequests}));
}finally{
 try{if(ws?.readyState===1)ws.send(JSON.stringify({id:++id,method:'Browser.close'}));}catch{}
 await delay(200);ws?.close();for(const p of pending.values()){clearTimeout(p.timer);p.resolve({});}
 if(browser?.exitCode===null)browser.kill();if(server?.exitCode===null){const done=new Promise(resolve=>server.once('exit',resolve));server.kill();await Promise.race([done,delay(1500)]);}
 if(path.dirname(profile)===root&&path.basename(profile).startsWith('.qa-performance-'))try{await fs.rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});}catch{}
}
