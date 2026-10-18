import{useLayoutEffect,useRef}from'react';
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
function bezier(a,b,c,d,t){const q=1-t;return a.map((v,i)=>q*q*q*v+3*q*q*t*b[i]+3*q*t*t*c[i]+t*t*t*d[i]);}
// Coordinates are contact points in the room, not centers of a floating image.
export function samplePath(progress){
 const p=clamp(progress);
 if(p<.245){const t=smooth(p/.245);const point=bezier([72,37,.72],[70,26,.76],[83,37,.9],[83,58.6,.9],t);return{point,flight:1-smooth((p-.193)/.052),tuck:1-smooth((p-.17)/.055),surface:[83,58.6],state:p>.193?'landing':'flying'};}
 if(p<.415)return{point:[83,58.6,.9],flight:smooth((p-.399)/.016)*.3,tuck:0,surface:[83,58.6],state:'sitting'};
 if(p<.745){const t=smooth((p-.415)/.33),point=bezier([83,58.6,.9],[81,26,.9],[44,30,1.02],[26.5,74.8,1.02],t);return{point,flight:(.3+.7*smooth((p-.415)/.025))*(1-smooth((p-.688)/.057)),tuck:smooth((p-.42)/.035)*(1-smooth((p-.663)/.055)),surface:p<.55?[83,58.6]:[26.5,74.8],state:p<.446?'taking-off':p>.688?'landing':'flying'};}
 return{point:[26.5,74.8,1.02],flight:0,tuck:0,surface:[26.5,74.8],state:'sitting'};
}
export function advanceSpring(position,velocity,target,dt){const omega=12,decay=Math.exp(-omega*dt),offset=position-target,c=velocity+omega*offset;return{position:target+(offset+c*dt)*decay,velocity:(velocity-omega*c*dt)*decay};}
const damp=(a,b,dt,speed=10)=>lerp(a,b,1-Math.exp(-speed*dt));
function blinkAt(t){const cycle=(t+2.6)%6.7;if(cycle<.16)return Math.sin(cycle/.16*Math.PI);if(t>12&&cycle>.29&&cycle<.42)return Math.sin((cycle-.29)/.13*Math.PI)*.8;return 0;}

export function usePatchMotion(root,character,{progress,reduced,covered,paused=false}){
 const options=useRef({progress,reduced,covered,paused}),renderFrame=useRef(null);options.current={progress,reduced,covered,paused};
 const model=useRef({p:progress,v:0,time:0,phase:0,flight:1,bank:0,camera:null,lastX:72,lastY:37,contact:0,landedAt:-20,entrance:0});
 useLayoutEffect(()=>{
  const el=root.current;if(!el)return;const room=el.querySelector('.journey-room'),frame=el.querySelector('.journey-viewport');let raf=0,last=0,geometry;
  const resize=()=>{const stack=room.querySelector('.world-bookstack');geometry={width:frame.clientWidth,roomWidth:room.offsetWidth,height:room.offsetHeight,viewportHeight:frame.clientHeight,booksLeft:stack.offsetLeft-stack.offsetWidth*.04-5,booksRight:stack.offsetLeft+stack.offsetWidth*1.06+5};if(options.current.reduced)render(performance.now(),true);};resize();
  const observer=new ResizeObserver(resize);observer.observe(frame);observer.observe(room);
  function render(now,oneShot=false){
   const m=model.current,o=options.current,dt=oneShot?0:Math.max(0,Math.min((now-(last||now-16.67))/1000,.04));last=now;
   if(!o.covered&&!o.paused&&!document.hidden){m.time+=dt;m.entrance=Math.min(1,m.entrance+dt/1.7);}
   if(o.reduced){m.p=o.progress;m.v=0;m.flight=0;m.bank=0;}else{const next=advanceSpring(m.p,m.v,o.progress,dt);m.p=clamp(next.position);m.v=next.velocity;}
   let path=samplePath(m.p),[x,y,scale]=path.point;
   if(o.reduced){const atBooks=o.progress>=4/6&&o.progress<5/6;x=atBooks?26.5:83;y=atBooks?74.8:58.6;scale=atBooks?1.02:.9;path={...path,flight:0,tuck:0,state:'sitting',surface:[x,y]};}
   const arrival=o.reduced?1:smooth(m.entrance);
   if(m.p<.045&&!o.reduced){const fade=1-smooth(m.p/.045);y+=lerp(2,0,arrival)*fade;scale*=lerp(.6,1,arrival);}
   const vx=dt?(x-m.lastX)/dt:0,vy=dt?(y-m.lastY)/dt:0;m.lastX=x;m.lastY=y;
   const skipping=Math.abs(m.v)>.2&&((o.progress>.46&&m.p<.42)||(o.progress<.2&&m.p>.245));
   const wantedFlight=o.reduced?0:Math.max(path.flight,skipping?.85:0);
   m.flight=o.reduced?0:damp(m.flight,wantedFlight,dt,12);
   const bankTarget=o.reduced?0:clamp(vx*.24+Math.sin(m.time*1.6)*m.flight*1.6,-15,15)*m.flight;
   m.bank=o.reduced?0:damp(m.bank,bankTarget,dt,6);
   const contact=path.state==='sitting'&&m.flight<.2?1:0;
   if(contact&&!m.contact&&m.time>1)m.landedAt=m.time;m.contact=contact;
   const since=m.time-m.landedAt,bounce=o.reduced?0:Math.exp(-since*9)*Math.sin(since*22)*.055;
   const hover=o.reduced?0:Math.sin(m.time*2.4)*.22*m.flight;
   const anticipation=path.state==='sitting'&&m.p>.398&&m.p<.415?smooth((m.p-.398)/.017)*.035:0;
   const g=geometry,mobile=g.width<=1023&&g.width<=g.viewportHeight,landscape=g.width<=1023&&g.viewportHeight<500&&g.width>g.viewportHeight,travel=smooth((m.p-.425)/.2),bookFrame=o.progress>=4/6&&o.progress<5/6,target=landscape?.26:bookFrame&&o.reduced?.5:mobile?.56:o.reduced?.76:lerp(.76,.28,travel),focusX=bookFrame&&(mobile||o.reduced)?38.5:x;
   let cameraTarget=g.width*target-(g.width-g.roomWidth)/2-g.roomWidth*focusX/100;
   if(bookFrame&&(mobile||landscape)){const half=el.querySelector('.journey-patch').offsetWidth*scale*.54,cx=g.roomWidth*x/100,left=Math.min(g.booksLeft,cx-half),right=Math.max(g.booksRight,cx+half);cameraTarget=g.width*(landscape?.26:.5)-(g.width-g.roomWidth)/2-(left+right)/2;}
   m.camera=m.camera===null||o.reduced?cameraTarget:damp(m.camera,cameraTarget,dt,8);
   const set=(name,value)=>el.style.setProperty(name,String(value));
   set('--patch-x',x+'%');set('--patch-y',(y+hover)+'%');set('--patch-scale',scale);set('--patch-bank',m.bank+'deg');set('--patch-anchor',(88-(1-m.flight)*2.2)+'%');set('--patch-squash',1-bounce-anticipation);set('--camera-offset',m.camera+'px');
   set('--hatch-open',smooth(m.entrance*1.6+m.p*3));set('--cocoon-opacity',1-smooth((m.p-.06)/.13));set('--rain-opacity',1-smooth(m.p/.22));set('--song-opacity',1-smooth((m.p-.23)/.16));set('--moon-rest',smooth((m.p-.20)/.06)*(1-smooth((m.p-.42)/.08)));
   set('--corridor-light',smooth((m.p-.46)/.29));set('--carried-light',smooth((m.p-.40)/.055));set('--lantern-swing',clamp(-m.bank*1.6+Math.sin(m.time*2.1)*m.flight*7,-25,25)+'deg');
   const distance=Math.hypot((x-path.surface[0])*.8,y-path.surface[1]),near=1-smooth(distance/13);
   set('--shadow-x',path.surface[0]+'%');set('--shadow-y',path.surface[1]+'%');set('--shadow-opacity',near*.56);set('--shadow-scale',lerp(.45,.9,near)*scale);set('--shadow-blur',lerp(7,1.5,near)+'px');
   m.phase+=dt*lerp(1.2,6.8,m.flight)*Math.PI*2;
   if(Math.floor(o.progress*6)!==3)character.current?.draw({time:o.reduced?0:m.time,phase:o.reduced?0:m.phase,flight:o.reduced?0:m.flight,tuck:o.reduced?0:path.tuck,bank:m.bank,blink:o.reduced?0:blinkAt(m.time),look:o.reduced?0:clamp(vx/20,-1,1)});
   el.dataset.characterState=o.reduced?'resting':path.state;el.dataset.flight=m.flight.toFixed(3);el.dataset.motionProgress=m.p.toFixed(4);el.dataset.characterBank=m.bank.toFixed(2);
   if(!oneShot&&!o.reduced&&!o.covered&&!o.paused&&!document.hidden)raf=requestAnimationFrame(render);
  }
  const start=()=>{cancelAnimationFrame(raf);raf=0;last=0;render(performance.now(),true);if(!options.current.reduced&&!options.current.covered&&!options.current.paused&&!document.hidden)raf=requestAnimationFrame(render);};
  // The one-shot render seeds the rig before a texture finishes loading.
  renderFrame.current=()=>render(performance.now(),true);start();const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else start();};document.addEventListener('visibilitychange',visibility);
  return()=>{cancelAnimationFrame(raf);renderFrame.current=null;observer.disconnect();document.removeEventListener('visibilitychange',visibility);};
 },[reduced,covered,paused]);
 useLayoutEffect(()=>{if(reduced)renderFrame.current?.();},[progress,reduced]);
}
