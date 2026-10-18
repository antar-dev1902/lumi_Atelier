import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=process.cwd(),profile=await fs.mkdtemp(path.join(root,'.qa-repair-'));
const phase='atelier-final',reports=[],errors=[];
await fs.mkdir(path.join(root,'qa'),{recursive:true});
let server,browser,ws,id=0;const pending=new Map();
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('Timeout '+method));},45000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});}
async function run(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function wait(expression){for(let n=0;n<150;n++){if(await run(expression))return;await delay(100);}throw Error('Timed out '+expression);}
async function click(selector){await run(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(150);}
async function capture(name){if(process.env.QA_SCREENSHOTS!=='1')return;const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(root,'qa',phase+'-'+name+'.png'),Buffer.from(r.data,'base64'));}
async function geometry(){return run(`(()=>{const box=selector=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,display:s.display,opacity:s.opacity,font:s.fontSize};};return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,hero:box('.hero-layout'),heading:box('.hero-copy h1'),character:box('.hero-character'),menu:box('.mobile-menu-toggle'),nav:box('.site-header nav'),copy:box('.journey-copy'),lumi:box('.journey-patch'),books:[...document.querySelectorAll('.journey .world-book')].map(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,hit:hit===el||el.contains(hit)};}),dialog:box('.lookbook-dialog'),photo:box('.look-photo'),image:box('.look-photo img'),imageSource:document.querySelector('.look-photo img')?.currentSrc,naturalWidth:document.querySelector('.look-photo img')?.naturalWidth,view:document.querySelector('.sketch-toggle')?.textContent};})()`);}
try{
 if(!process.env.QA_BASE_URL){server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:'4198',PATCH_DATA_DIR:path.join(profile,'data')},stdio:['ignore','pipe','pipe'],windowsHide:true});
 await new Promise((resolve,reject)=>{server.stdout.on('data',data=>{if(data.toString().includes('Patch archive server'))resolve();});server.on('error',reject);});}
 browser=spawn(process.env.PATCH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-networking','--disable-component-update','--disable-sync','--disable-domain-reliability','--disable-crash-reporter','--disable-breakpad','--disable-crashpad','--disable-features=Crashpad','--no-first-run','--no-default-browser-check','--mute-audio','--proxy-server=http://127.0.0.1:9','--proxy-bypass-list=localhost;127.0.0.1;[::1]','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
 let port;for(let n=0;n<100;n++){try{port=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await delay(150);}}
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 ws.addEventListener('message',event=>{const d=JSON.parse(event.data);if(d.id&&pending.has(d.id)){const p=pending.get(d.id);pending.delete(d.id);clearTimeout(p.timer);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.exception?.description||d.params.exceptionDetails.text);if(d.method==='Fetch.requestPaused'){const{requestId,request}=d.params,u=new URL(request.url);if(u.pathname==='/api/visit')send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from('{"count":0}').toString('base64')}).catch(()=>{});else send(['localhost','127.0.0.1'].includes(u.hostname)?'Fetch.continueRequest':'Fetch.failRequest',{requestId,...(['localhost','127.0.0.1'].includes(u.hostname)?{}:{errorReason:'BlockedByClient'})}).catch(()=>{});}});
 await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'http://*'},{urlPattern:'https://*'}]});
 const sizes=[[320,568],[360,640],[390,844],[430,932],[640,800],[768,1024],[1024,768],[1366,768],[844,390]].filter(([w])=>!process.env.QA_WIDTHS||process.env.QA_WIDTHS.split(',').map(Number).includes(w));
 for(const [width,height]of sizes){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
  await send('Page.navigate',{url:process.env.QA_BASE_URL||'http://127.0.0.1:4198/'});await send('Page.bringToFront');await wait('!!document.querySelector(".crt-screen-start")');
  await run(`Promise.all([document.fonts.load('500 16px "DM Sans"'),document.fonts.load('500 40px "Fraunces"'),document.fonts.load('italic 400 24px "Fraunces"')]).then(f=>{if(!f.every(x=>x.length))throw Error('Bundled fonts unavailable');return true;})`);
  await delay(1400);await capture(width+'-intro');
  const entry=await run(`(()=>[...document.querySelectorAll('.crt-entry-actions button,.crt-meet-lumi')].map(el=>{const r=el.getBoundingClientRect(),g=document.querySelector('.crt-glass').getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {text:el.textContent,height:r.height,width:r.width,inside:r.top>=g.top&&r.bottom<=g.bottom&&r.left>=g.left&&r.right<=g.right,hit:hit===el||el.contains(hit)};}))()`);
  if(entry.length!==3||entry.some(b=>b.height<44||b.width<44||!b.inside||!b.hit))throw Error('Entry controls must all fit '+width+' '+JSON.stringify(entry));
  await click('.crt-meet-lumi');await wait('!!document.querySelector(".character-sheet")');if(await run('document.querySelectorAll(".character-sheet dt").length')!==5)throw Error('Character sheet incomplete');await click('button[aria-label="Close dialog"]');
  await click('.crt-collections-entry');await wait('!!document.querySelector(".archive-hero")');await delay(400);await capture(width+'-home');
  await run('document.querySelector(".book-corner-scene").scrollIntoView({block:"center",behavior:"instant"})');await delay(800);await capture(width+'-books');
  await wait('document.querySelector(".book-corner-character").dataset.action==="resting"');
  await click('.flutter-room-toggle');await delay(1400);await capture(width+'-flutter');
  const flutterFits=await run(`(()=>{const a=document.querySelector('.book-corner-character').getBoundingClientRect(),s=document.querySelector('.book-corner-scene').getBoundingClientRect();return a.left>=s.left&&a.right<=s.right&&a.top>=s.top&&a.bottom<=s.bottom&&[...document.querySelectorAll('.book-corner .world-book')].every(el=>{const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom&&(h===el||el.contains(h));});})()`);
  if(!flutterFits)throw Error('Flutter Mode hides Lumi or books at '+width);
  await click('.flutter-room-toggle');await delay(1500);
  await wait('document.querySelector(".book-corner-character").dataset.action==="resting"');await delay(200);
  const home=await run(`(()=>{const a=document.querySelector('.book-corner-character'),r=a.getBoundingClientRect(),s=document.querySelector('.book-corner-scene').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,cssWidth:getComputedStyle(a).width,transform:getComputedStyle(a).transform,action:a.dataset.action,scene:{x:s.x,y:s.y,w:s.width,h:s.height},visible:r.width>=80&&r.height>=80&&r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom,ready:a.querySelector('.patch-mesh').dataset.ready==='true'||!!a.querySelector('.patch-rig-fallback')};})()`);
  if(!home.visible||!home.ready)throw Error('Lumi not visible '+width+' '+JSON.stringify(home));
  if(width===320){
   await run(`(()=>{const c=document.querySelector('.book-corner-character canvas'),g=c.getContext('webgl');window.__lumiContext=g?.getExtension('WEBGL_lose_context');window.__lumiContext?.loseContext();})()`);
   await wait('!!document.querySelector(".book-corner-character .patch-rig-fallback")');
   await run('window.__lumiContext.restoreContext()');await wait('document.querySelector(".book-corner-character .patch-mesh").dataset.ready==="true"');
  }
  if(width===1366){
   await send('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});
   await run('document.querySelector(".book-corner-scene").scrollIntoView({block:"center",behavior:"instant"})');await delay(650);
   const resized=await run(`(()=>{const el=document.querySelector('.book-corner-character'),r=el.getBoundingClientRect(),s=document.querySelector('.book-corner-scene').getBoundingClientRect();return {fits:r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom,actor:r.toJSON(),scene:s.toJSON(),action:el.dataset.action,transform:getComputedStyle(el).transform};})()`);
   await capture(width+'-resized-phone');
   if(!resized.fits)throw Error('Lumi disappears after resizing from laptop to phone '+JSON.stringify(resized));
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await run('document.querySelector(".book-corner-scene").scrollIntoView({block:"center",behavior:"instant"})');await delay(650);
   const position=await run(`(()=>{const r=document.querySelector('.book-corner-character').getBoundingClientRect();return {x:r.x,y:r.y};})()`);home.x=position.x;home.y=position.y;
  }
  const book=await run(`(()=>{const r=document.querySelector('.book-corner .world-book').getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);window.__lastBookClick=null;window.addEventListener('click',e=>{window.__lastBookClick={detail:e.detail,label:e.target.closest('button')?.getAttribute('aria-label')};},{once:true,capture:true});return {x,y,hit:hit?.outerHTML.slice(0,200)};})()`);
  await send('Page.bringToFront');await send('Input.dispatchMouseEvent',{type:'mousePressed',x:book.x,y:book.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:book.x,y:book.y,button:'left',clickCount:1});
  let gesture;for(let sample=0;sample<10;sample++){await delay(60);gesture=await run(`(()=>{const a=document.querySelector('.book-corner-character'),r=a.getBoundingClientRect();return {action:a.dataset.action,distance:Math.hypot(r.x-${home.x},r.y-${home.y}),event:window.__lastBookClick,opening:document.querySelector('.book-corner .is-opening')?.dataset.book,modal:!!document.querySelector('.lookbook-dialog[open]'),hidden:document.hidden};})()`);if(gesture.distance>=3)break;}
  if(gesture.distance<3)throw Error('Book click did not move Lumi '+width+' '+JSON.stringify({gesture,book,home}));
  await wait('!!document.querySelector(".lookbook-dialog[open]")');await wait('document.querySelector(".look-photo img")?.complete&&document.querySelector(".look-photo img").naturalWidth>0');await delay(380);await capture(width+'-catalogue');
  const catalogue=await run(`(()=>{const p=document.querySelector('.look-photo img').getBoundingClientRect(),n=document.querySelector('.lookbook-navigation').getBoundingClientRect();return {photoHeight:p.height,photoFits:p.bottom<=n.top&&p.top>=0,navFits:n.bottom<=innerHeight,paper:getComputedStyle(document.querySelector('.lookbook-page')).backgroundColor};})()`);
  if(!catalogue.photoFits||!catalogue.navFits||catalogue.photoHeight<160)throw Error('Catalogue framing '+width+' '+JSON.stringify(catalogue));
  await click('button[aria-label="Close catalogue"]');
  await click('.our-story .section-heading .button');await wait('!!document.querySelector(".journey")');
  for(const local of [.08,.48,.96]){
   const progress=(3+local)/6;
   await run(`(()=>{const e=document.querySelector('.journey');window.scrollTo({top:(e.offsetHeight-innerHeight)*${progress},behavior:'instant'});})()`);
   await wait('!!document.querySelector(".runway-scene")');await delay(700);await capture(width+'-runway-'+Math.round(local*100));
   const r=await run(`(()=>{const stage=document.querySelector('.runway-scene'),r=stage.getBoundingClientRect(),l=document.querySelector('.runway-lumi').getBoundingClientRect(),c=document.querySelector('.journey-copy').getBoundingClientRect(),b=document.querySelector('.runway-caption-beat').getBoundingClientRect(),footer=document.querySelector('.journey-footer').getBoundingClientRect();return {beat:stage.dataset.beat,overflow:document.documentElement.scrollWidth>innerWidth,lumiFits:l.left>=0&&l.right<=innerWidth&&l.top>=0&&l.bottom<=innerHeight,captionFits:b.bottom<=footer.top&&b.right<=innerWidth,stage:{x:r.x,y:r.y,w:r.width,h:r.height},actor:{x:l.x,y:l.y,w:l.width,h:l.height},copy:{x:c.x,y:c.y,w:c.width,h:c.height},paperOpacity:Number(getComputedStyle(document.querySelector('.runway-look-page')).opacity)};})()`);
   if(r.overflow||!r.lumiFits||!r.captionFits)throw Error('Runway composition '+width+' '+local+' '+JSON.stringify(r));
   if(local===.96&&r.paperOpacity<.95)throw Error('Finished gown must become its lookbook page');
   if(local===.96){
    await wait('document.querySelector(".runway-look-page img")?.complete&&document.querySelector(".runway-look-page img").naturalWidth>0');
    const photo=await run(`(()=>{const img=document.querySelector('.runway-look-page img'),r=img.getBoundingClientRect(),p=img.closest('.runway-look-page').getBoundingClientRect();return {width:r.width,height:r.height,naturalWidth:img.naturalWidth,fits:r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom};})()`);
    if(photo.width<60||photo.height<60||!photo.fits)throw Error('Runway photograph collapses or leaves its page '+width+' '+JSON.stringify(photo));
    r.finishedPhoto=photo;
   }
   reports.push({width,height,local,...r});
  }
  await click('.runway-open-look');await wait('!!document.querySelector(".lookbook-dialog[open]")');await wait('document.querySelector(".look-photo img")?.complete&&document.querySelector(".look-photo img").naturalWidth>0');
  if(!await run('document.querySelector(".look-photo img").currentSrc.includes("reverie-cobalt.webp")'))throw Error('Story does not link to Blue Hour');
  await click('button[aria-label="Close catalogue"]');
  await run(`(()=>{const e=document.querySelector('.journey');window.scrollTo({top:(e.offsetHeight-innerHeight)*${(3.48)/6},behavior:'instant'});})()`);await wait('document.querySelector(".runway-scene")?.dataset.beat==="stitching"');
  await click('.journey-skip');await wait('!!document.querySelector(".archive-hero")');
  console.log('PASS: bundled fonts, visible Lumi, real book-click flight, cream catalogue, three reversible runway beats and Blue Hour link at',width,height);
 }
 if(errors.length)throw Error('Runtime errors: '+JSON.stringify(errors));
 await fs.writeFile(path.join(root,'qa','atelier-polish-report.json'),JSON.stringify({reports,errors},null,2));

 console.log('PASS: '+sizes.length+' viewport layouts; '+reports.length+' runway states; no runtime errors.');
}finally{
 try{if(ws?.readyState===1)ws.send(JSON.stringify({id:++id,method:'Browser.close'}));}catch{}
 await delay(200);ws?.close();for(const p of pending.values()){clearTimeout(p.timer);p.resolve({});}
 if(browser&&browser.exitCode===null)browser.kill();if(server&&server.exitCode===null){const closed=new Promise(resolve=>server.once('exit',resolve));server.kill();await Promise.race([closed,delay(2000)]);}
 if(path.dirname(profile)===root&&path.basename(profile).startsWith('.qa-repair-'))try{await fs.rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});}catch{}
}
