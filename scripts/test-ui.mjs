import assert from 'node:assert/strict';
import {COLLECTIONS} from '../src/collections.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=process.cwd(),browserDir=await fs.mkdtemp(path.join(root,'.qa-browser-')),dataDir=await fs.mkdtemp(path.join(root,'.qa-db-'));
await fs.mkdir(path.join(root,'qa'),{recursive:true});
const port=4195;let server,browser,ws,id=0;const pending=new Map(),errors=[],requests=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function send(method,params={}){return new Promise((resolve,reject)=>{const call=++id;pending.set(call,{resolve,reject});ws.send(JSON.stringify({id:call,method,params}));setTimeout(()=>{if(pending.has(call)){pending.delete(call);reject(new Error('CDP timed out: '+method));}},30000).unref();});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text+' '+(r.exceptionDetails.exception?.description||''));return r.result.value;}
async function waitFor(expression,timeout=8000){const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(expression))return;await delay(120);}throw new Error('Timed out waiting for '+expression);}
async function click(selector,contains){const expression='(()=>{const nodes=[...document.querySelectorAll('+JSON.stringify(selector)+')];const el=nodes.find(e=>'+(contains?'e.textContent.includes('+JSON.stringify(contains)+')':'true')+');if(!el)throw Error("Missing element");el.click();return true;})()';await evaluate(expression);await delay(80);}
async function screenshot(name){if(process.env.QA_SCREENSHOTS!=='1')return;const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(root,'qa',name+'.png'),Buffer.from(r.data,'base64'));}
async function viewport(width,height){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await delay(350);}
async function fill(selector,value){await evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');const proto=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,"value").set.call(el,'+JSON.stringify(value)+');el.dispatchEvent(new Event("input",{bubbles:true}));})()');}

async function assertRenderedOutfit(expected){
 await delay(350);
 const result=await evaluate(`(()=>{const img=document.querySelector('.look-photo img'),r=img.getBoundingClientRect(),nav=document.querySelector('.lookbook-navigation').getBoundingClientRect(),top=document.querySelector('.lookbook-topbar').getBoundingClientRect(),d=document.querySelector('.lookbook-dialog').getBoundingClientRect();return {source:new URL(img.currentSrc).pathname,decoded:img.complete&&img.naturalWidth>0&&img.naturalHeight>0,imageFits:r.top>=top.bottom-1&&r.bottom<=nav.top+1&&r.left>=d.left&&r.right<=d.right,height:r.height,navFits:nav.top>=0&&nav.bottom<=innerHeight,photoView:document.querySelector('.sketch-toggle').getAttribute('aria-pressed')==='false'};})()`);
 assert.equal(result.source,expected.image,'The requested outfit photo is displayed');
 assert.ok(result.decoded&&result.height>=160&&result.imageFits,'The whole outfit frame is visible: '+JSON.stringify(result));
 assert.ok(result.navFits,'Page controls stay on screen');
 assert.ok(result.photoView,'A new design opens in photograph view');
}

async function assertBookTargets(scope){
 const targets=await evaluate('(()=>{return [...document.querySelectorAll('+JSON.stringify(scope+' .world-book')+')].map(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:el.dataset.book,x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height,visible:r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight,unblocked:!!hit&&(hit===el||el.contains(hit))};});})()');
 assert.equal(targets.length,3);assert.ok(targets.every(t=>t.visible&&t.unblocked&&t.height>=44),'Books must be visible, unobstructed touch targets: '+JSON.stringify(targets));
 if(scope==='.book-corner'){const character=await evaluate('(()=>{const el=document.querySelector(".book-corner-character"),r=el.getBoundingClientRect(),p=document.querySelector(".book-corner-scene").getBoundingClientRect();return {visible:getComputedStyle(el).display!=="none"&&r.width>0&&r.height>0,fits:r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom};})()');assert.ok(character.visible&&character.fits,'The same studio scene keeps Lumi visible beside the books on every screen');}
 if(scope==='.journey'){const lumi=await evaluate('(()=>{const el=document.querySelector(".journey-patch"),r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,opacity:getComputedStyle(el).opacity};})()');assert.ok(Number(lumi.opacity)>0&&lumi.x>=0&&lumi.right<=await evaluate('innerWidth')&&lumi.y>=0&&lumi.bottom<=await evaluate('innerHeight'),'Lumi stays visible beside her books: '+JSON.stringify(lumi));}
}

async function stop(child){if(child&&child.exitCode===null){child.kill();await Promise.race([new Promise(r=>child.once('exit',r)),delay(3000)]);}}
try{
server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:String(port),PATCH_DATA_DIR:dataDir},stdio:['ignore','pipe','pipe'],windowsHide:true});
await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('API startup timed out')),7000);server.stdout.on('data',data=>{if(data.toString().includes('Patch archive server')){clearTimeout(t);resolve();}});server.on('error',reject);});
const chrome=process.env.PATCH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
// Keep this owned QA browser local-only, including its startup/background traffic.
browser=spawn(chrome,['--headless=new','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-crash-reporter','--disable-breakpad','--disable-crashpad','--disable-features=Crashpad','--disable-background-networking','--disable-component-update','--disable-sync','--disable-domain-reliability','--metrics-recording-only','--disable-quic','--proxy-server=http://127.0.0.1:9','--proxy-bypass-list=localhost;127.0.0.1;[::1]','--no-first-run','--no-default-browser-check','--mute-audio','--remote-debugging-port=0','--user-data-dir='+browserDir,'about:blank'],{stdio:'ignore',windowsHide:true});
let debugPort;for(let n=0;n<80;n++){try{debugPort=Number((await fs.readFile(path.join(browserDir,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await delay(150);}}
assert.ok(debugPort,'Chrome must expose its own debug port');
const tabs=await(await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json();const tab=tabs.find(t=>t.type==='page');
ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id&&pending.has(data.id)){const p=pending.get(data.id);pending.delete(data.id);data.error?p.reject(new Error(JSON.stringify(data.error))):p.resolve(data.result);}if(data.method==='Network.requestWillBeSent')requests.push(data.params.request);if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);if(data.method==='Fetch.requestPaused'){const {requestId,request}=data.params,url=new URL(request.url);send(['localhost','127.0.0.1','[::1]'].includes(url.hostname)?'Fetch.continueRequest':'Fetch.failRequest',{requestId,...(['localhost','127.0.0.1','[::1]'].includes(url.hostname)?{}:{errorReason:'BlockedByClient'})}).catch(()=>{});}});
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:'http://*'},{urlPattern:'https://*'}]});await viewport(1440,1000);await send('Page.navigate',{url:'http://127.0.0.1:'+port});
await waitFor('!!document.querySelector(".crt-screen-start")');await delay(900);await screenshot('fashion-intro-desktop');
assert.match(await evaluate('document.title'),/Atelier/);
await click('.crt-screen-start');await waitFor('!!document.querySelector(".theatre-transition")');await delay(750);await screenshot('fashion-curtains');await waitFor('!!document.querySelector(".journey")&&!document.querySelector(".theatre-transition")');await delay(600);await screenshot('fashion-story-attic');
await waitFor('document.querySelector(".patch-mesh").dataset.ready==="true"');
async function chapter(i){await evaluate('(()=>{const el=document.querySelector(".journey");window.scrollTo({top:el.offsetTop+(el.offsetHeight-innerHeight)*'+((i+.3)/6)+',behavior:"instant"});})()');await waitFor('document.querySelector(".journey-chapters button[aria-current]").textContent.includes("'+String(i+1).padStart(2,'0')+'")');await waitFor('Math.abs(Number(document.querySelector(".journey").dataset.motionProgress)-'+((i+.3)/6)+')<.004');await delay(250);}
assert.ok(await evaluate('document.querySelector(".journey-copy").textContent.split(/\s+/).length')<45,'Story frames use short captions');
await chapter(2);await screenshot('fashion-story-scraps');await click('.moon-secret');await waitFor('!!document.querySelector(".studio-secret")');await click('.studio-secret .button');await waitFor('!!document.querySelector(".first-design")');await click('button[aria-label="Close dialog"]');
await chapter(3);
const before=await evaluate('Number(document.querySelector(".runway-scene").dataset.progress)');
await waitFor('Number(document.querySelector(".runway-scene").dataset.progress)>'+String(before+.02));
await click('.runway-stepper button','The tear');await delay(300);assert.equal(await evaluate('Number(document.querySelector(".runway-scene").dataset.progress)'),0,'Stage controls pause on a visible still');
for(const stage of ['Drape silk','Last stitch','Spotlight'])await click('.runway-stepper button',stage);
await waitFor('Number(getComputedStyle(document.querySelector(".runway-look-page")).opacity)>.95');
const ax=await send('Accessibility.getFullAXTree');assert.equal(ax.nodes.filter(n=>!n.ignored&&n.role?.value==='button'&&!n.name?.value).length,0,'Every exposed story button has an accessible name');
await click('button[aria-label="Start the runway repair again"]');await delay(500);await click('button[aria-label="Pause the runway repair"]');const held=await evaluate('document.querySelector(".runway-scene").dataset.progress');await delay(350);assert.equal(await evaluate('document.querySelector(".runway-scene").dataset.progress'),held,'Pause holds the repair');
await screenshot('fashion-story-runway');await chapter(4);await assertBookTargets('.journey');await screenshot('fashion-story-books');
await click('.journey .world-book[data-book="reverie"]');await waitFor('!!document.querySelector(".lookbook-dialog[open]")');await click('button[aria-label="Close catalogue"]');await waitFor('document.querySelector(".journey-chapters button[aria-current]").textContent.includes("05")');
await chapter(5);await click('.journey-final-actions .button');await waitFor('!!document.querySelector(".archive-hero")');await evaluate('window.scrollTo({top:0,behavior:"instant"})');await delay(300);await screenshot('fashion-home-desktop');
assert.equal(await evaluate('/Breathing Lantern|Comfort Melodies|body scan|mental health|check-in/i.test(document.querySelector("main").textContent)'),false,'The portfolio uses the fashion direction throughout');
await evaluate('document.querySelector(".book-corner-scene").scrollIntoView({block:"center",behavior:"instant"})');await delay(250);await assertBookTargets('.book-corner');await screenshot('fashion-book-corner');
for(const collection of COLLECTIONS){
 const id=collection.id;assert.equal(collection.looks.length,4);
 await click('.book-corner .world-book[data-book="'+id+'"]');await waitFor('!!document.querySelector(".lookbook-dialog[open]")');
 const first=await evaluate('document.querySelector(".lookbook-page h2").textContent');
 await waitFor('document.querySelector(".look-photo img").complete&&document.querySelector(".look-photo img").naturalWidth>0');
 await click('.pin-look');assert.equal(await evaluate('document.querySelector(".pin-look").getAttribute("aria-pressed")'),'true');
 await click('button[aria-label="Sketch color 2"]');await click('.sketch-toggle');await waitFor('!!document.querySelector(".look-photo--sketch svg")');await screenshot('fashion-'+id+'-sketch');await click('.sketch-toggle');
 await assertRenderedOutfit(collection.looks[0]);await screenshot('fashion-'+id+'-look-1');
 assert.equal(await evaluate('document.querySelector(".sketch-and-swatches svg").dataset.design'),collection.looks[0].sketch);
 await click('button[aria-label="Next design"]');await waitFor('document.querySelector(".lookbook-page h2").textContent!=='+JSON.stringify(first));await waitFor('!document.querySelector(".paper-turn")');await waitFor('document.querySelector(".look-photo img").complete&&document.querySelector(".look-photo img").naturalWidth>0');
 const second=await evaluate('document.querySelector(".lookbook-page h2").textContent');await assertRenderedOutfit(collection.looks[1]);assert.notEqual(first,second);assert.equal(await evaluate('document.querySelector(".sketch-and-swatches svg").dataset.design'),collection.looks[1].sketch);
 await click('.sketch-toggle');await waitFor('!!document.querySelector(".look-photo--sketch svg")');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});await waitFor('document.querySelector(".lookbook-page h2").textContent!=='+JSON.stringify(second));await waitFor('!document.querySelector(".paper-turn")');await waitFor('document.querySelector(".look-photo img").complete&&document.querySelector(".look-photo img").naturalWidth>0');await screenshot('fashion-'+id+'-look-3');
 const third=await evaluate('document.querySelector(".lookbook-page h2").textContent');
 assert.equal(third,collection.looks[2].name);await assertRenderedOutfit(collection.looks[2]);
 assert.equal(await evaluate('document.querySelector(".sketch-and-swatches svg").dataset.design'),collection.looks[2].sketch);
 await click('button[aria-label="Next design"]');await waitFor('document.querySelector(".lookbook-page h2").textContent==='+JSON.stringify(collection.looks[3].name));await waitFor('!document.querySelector(".paper-turn")');await waitFor('document.querySelector(".look-photo img").complete&&document.querySelector(".look-photo img").naturalWidth>0');
 assert.equal(await evaluate('document.querySelector(".sketch-and-swatches svg").dataset.design'),collection.looks[3].sketch);
 await assertRenderedOutfit(collection.looks[3]);await screenshot('fashion-'+id+'-look-4');
 assert.equal(await evaluate('document.querySelector(".page-arrow:last-child").disabled'),true);
 await click('button[aria-label="Previous design"]');await waitFor('document.querySelector(".lookbook-page h2").textContent==='+JSON.stringify(third));await waitFor('!document.querySelector(".paper-turn")');
 await click('button[aria-label="Previous design"]');await waitFor('document.querySelector(".lookbook-page h2").textContent==='+JSON.stringify(second));await waitFor('!document.querySelector(".paper-turn")');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});await waitFor('!document.querySelector(".lookbook-dialog")');
}
assert.equal(await evaluate('document.querySelectorAll(".pinned-looks article").length'),3,'Pinned designs are shown on the portfolio board');
await click('.hero-actions .button','Meet Lumi');await waitFor('!!document.querySelector(".character-sheet")');assert.equal(await evaluate('document.querySelectorAll(".character-sheet dt").length'),5);assert.match(await evaluate('document.querySelector(".character-sheet").textContent'),/fashion designer/);await click('button[aria-label="Close dialog"]');
await click('button[aria-label="Have a little conversation with Lumi"]');await click('.chat-options button','What do you design');assert.match(await evaluate('document.querySelector(".chat-bubble").textContent'),/tailoring/);await click('button[aria-label="Close dialog"]');
await click('.studio-stamp');await waitFor('!!document.querySelector(".studio-secret")');await click('button[aria-label="Close dialog"]');
await click('.footer-links button','Behind the studio');await waitFor('!!document.querySelector(".credits-copy")');assert.equal(await evaluate('document.querySelectorAll(".photo-credit-group li").length'),12,'Every real fashion photograph has a visible credit');assert.ok(await evaluate('[...document.querySelectorAll(".photo-credit-group li")].every(li=>li.querySelectorAll("a[href^=https]").length===2)'),'Photograph sources and licences are linked');assert.equal((await fetch('http://127.0.0.1:'+port+'/credits/THIRD_PARTY_NOTICES.txt')).status,200);await click('button[aria-label="Close dialog"]');
await click('.site-header nav button','Say hello');await waitFor('!!document.querySelector(".wish-form button:not(:disabled)")');await fill('.wish-form input','Fashion QA');await fill('.wish-form textarea','A catalogue test note in the isolated database only.');await click('.wish-form button[type="submit"]');await waitFor('document.querySelectorAll(".wish-card").length===1');assert.equal((await(await fetch('http://127.0.0.1:'+port+'/api/guestbook')).json()).messages.length,1,'An independent client reads the shared note');await click('button[aria-label="Close dialog"]');
await viewport(390,844);await evaluate('window.scrollTo({top:0,behavior:"instant"})');await screenshot('fashion-home-mobile');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
await evaluate('document.querySelector(".book-corner-scene").scrollIntoView({block:"center",behavior:"instant"})');await delay(200);await assertBookTargets('.book-corner');await click('.book-corner .world-book[data-book="reverie"]');await waitFor('!!document.querySelector(".lookbook-dialog")');await screenshot('fashion-lookbook-mobile-top');assert.equal(await evaluate('document.querySelector(".lookbook-dialog").scrollWidth>document.querySelector(".lookbook-dialog").clientWidth'),false);
await evaluate('document.querySelector(".lookbook-dialog").scrollTop=300');await screenshot('fashion-lookbook-mobile-photo');await click('button[aria-label="Next design"]');await waitFor('document.querySelector(".lookbook-pages button[aria-current]").textContent.includes("02")');await waitFor('!document.querySelector(".paper-turn")');
await evaluate('(()=>{const el=document.querySelector(".lookbook-spread");el.dispatchEvent(new PointerEvent("pointerdown",{clientX:260,clientY:300,bubbles:true}));el.dispatchEvent(new PointerEvent("pointerup",{clientX:80,clientY:304,bubbles:true}));})()');await waitFor('document.querySelector(".lookbook-pages button[aria-current]").textContent.includes("03")');await waitFor('!document.querySelector(".paper-turn")');await click('button[aria-label="Close catalogue"]');
await click('.worktable-strip button','Moonlight');await waitFor('!!document.querySelector(".theme-dawn")');
await click('.section-heading .button','Watch her story');await waitFor('!!document.querySelector(".journey")');
for(const step of [0,3,4,5]){await chapter(step);assert.equal(await evaluate('getComputedStyle(document.querySelector(".journey-copy h1")).color'),'rgb(255, 242, 218)','Story headings keep their contrast in Daydream mode');}
await chapter(4);await assertBookTargets('.journey');await screenshot('fashion-story-books-mobile');await click('.journey-controls .icon-button[aria-label="Reduce character movement"]');await delay(200);await assertBookTargets('.journey');await click('.journey-controls .icon-button[aria-label="Animate Lumi"]');await delay(600);
await viewport(360,640);await chapter(4);await assertBookTargets('.journey');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);await screenshot('fashion-story-books-small');
await chapter(3);
for(const [w,h] of [[844,390],[375,667],[768,1024]]){await viewport(w,h);assert.ok(await evaluate('document.querySelector(".journey-chapters button[aria-current]").textContent.includes("04")'),'Rotating/resizing preserves the current story chapter');assert.equal(await evaluate('getComputedStyle(document.querySelector(".journey-copy h1")).color'),'rgb(255, 242, 218)','Daydream story text remains readable at '+w);}
await viewport(360,640);
const bounds=await evaluate('(()=>{const c=document.querySelector(".journey-copy").getBoundingClientRect(),f=document.querySelector(".journey-footer").getBoundingClientRect();return {top:c.top,bottom:c.bottom,footer:f.top};})()');assert.ok(bounds.top>70&&bounds.bottom<=bounds.footer,'Fashion captions fit small phones');
await click('.journey-skip');await waitFor('!!document.querySelector(".archive-hero")');await viewport(768,1024);await evaluate('window.scrollTo({top:0,behavior:"instant"})');await screenshot('fashion-home-tablet');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
await click('.book-catalogue button','City Lines');await waitFor('!!document.querySelector(".lookbook-dialog")');await screenshot('fashion-lookbook-tablet');assert.equal(await evaluate('document.querySelector(".lookbook-dialog").scrollWidth>document.querySelector(".lookbook-dialog").clientWidth'),false);await click('button[aria-label="Close catalogue"]');
await viewport(360,640);await click('.book-catalogue button','Petal Parade');await waitFor('!!document.querySelector(".lookbook-dialog")');await click('button[aria-label^="View design 4:"]');await waitFor('document.querySelector(".lookbook-pages button[aria-current]").textContent.includes("04")');await waitFor('!document.querySelector(".paper-turn")');await waitFor('document.querySelector(".look-photo img").complete&&document.querySelector(".look-photo img").naturalWidth>0');
assert.equal(await evaluate('document.querySelector(".lookbook-dialog").scrollWidth>document.querySelector(".lookbook-dialog").clientWidth'),false);
const navFits=await evaluate('[...document.querySelectorAll(".lookbook-navigation button")].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height>=44;})');assert.ok(navFits,'All four page buttons and arrows fit small phones');await screenshot('fashion-petal-parade-small');await click('button[aria-label="Close catalogue"]');
await send('Page.reload');await waitFor('!!document.querySelector(".crt-screen-start")');await click('.dream-intro-footer button');await waitFor('!!document.querySelector(".archive-hero")');assert.equal(await evaluate('document.querySelectorAll(".pinned-looks article").length'),3,'Pins survive refresh');
assert.equal(errors.length,0,'No runtime exceptions: '+errors.join('\n'));
console.log('PASS: fashion origin and CRT reveal; 3 collections and all 12 photographs; paper pages; previous/next/keyboard/swipe; original sketches and palette changes; pinboard persistence; five About fields; studio dialogue and secret; isolated guestbook; desktop, mobile, small-phone and tablet layouts; Lumi and book visibility in full and gentle motion.');

}finally{
try{if(ws?.readyState===1)ws.send(JSON.stringify({id:++id,method:'Browser.close'}));}catch{}
await delay(200);
if(ws)ws.close();await stop(browser);await stop(server);
for(const dir of[dataDir,browserDir])if(path.dirname(dir)===root&&path.basename(dir).startsWith('.qa-'))try{await fs.rm(dir,{recursive:true,force:true});}catch{}
}

