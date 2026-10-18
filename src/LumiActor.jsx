import React,{useLayoutEffect,useRef} from 'react';
import PatchCharacter from './PatchCharacter.jsx';
import {advanceSpring,clamp} from './patchMotion.js';
import './lumi-actor.css';

export default function LumiActor({sceneRef,target=null,home='.lumi-perch',reduced=false,paused=false,className='',mode='book'}){
 const actor=useRef(null),rig=useRef(null),shadow=useRef(null),wake=useRef(null),options=useRef({target,reduced,paused,mode});
 options.current={target,reduced,paused,mode};
 const model=useRef({x:null,y:null,vx:0,vy:0,time:0,phase:0,flight:0,bank:0,contact:false,landedAt:-10});
 useLayoutEffect(()=>{
  const stage=sceneRef.current||actor.current?.parentElement,element=actor.current;if(!stage||!element)return;
  let raf=0,last=0,visible=true;
  const damp=(a,b,dt,speed=10)=>a+(b-a)*(1-Math.exp(-speed*dt));
  function point(){
   const o=options.current,s=stage.getBoundingClientRect(),w=element.offsetWidth;
   let x,y;
   if(o.target&&typeof o.target==='object'){x=s.width*o.target.x;y=s.height*o.target.y;}
   else{const destination=stage.querySelector(o.target||home);if(destination){const r=destination.getBoundingClientRect();x=r.left-s.left+r.width*(o.target?.startsWith?.('.world-book') ? .4 : .5);y=r.top-s.top+(o.target?8:r.height*.18);}else{x=s.width*.77;y=s.height*.45;}}
   return{x:clamp(x,w*.7+3,s.width-w*.7-3),y:clamp(y,w*.98+3,s.height-w*.27-3),w};
  }
  function frame(now,once=false){
   const m=model.current,o=options.current,p=point(),dt=once?0:Math.max(0,Math.min((now-(last||now-16.67))/1000,.04));last=now;
   if(m.x===null){m.x=p.x;m.y=p.y-12;}
   const safeX=clamp(m.x,p.w*.7+3,stage.clientWidth-p.w*.7-3),safeY=clamp(m.y,p.w*.98+3,stage.clientHeight-p.w*.27-3);if(safeX!==m.x)m.vx=0;if(safeY!==m.y)m.vy=0;m.x=safeX;m.y=safeY;
   const distance=Math.hypot(p.x-m.x,p.y-m.y);
   if(o.reduced){m.x=p.x;m.y=p.y;m.vx=0;m.vy=0;m.flight=0;m.bank=0;}
   else if(!o.paused){
    m.time+=dt;
    const sx=advanceSpring(m.x,m.vx,p.x,dt),sy=advanceSpring(m.y,m.vy,p.y,dt);
    m.x=clamp(sx.position,p.w*.7+3,stage.clientWidth-p.w*.7-3);m.vx=sx.velocity;m.y=clamp(sy.position,p.w*.98+3,stage.clientHeight-p.w*.27-3);m.vy=sy.velocity;
    const flightWanted=o.target&&typeof o.target==='object'?o.target.flight||0:clamp(distance/22);
    m.flight=damp(m.flight,flightWanted,dt,12);m.bank=clamp(damp(m.bank,clamp(m.vx*.055,-13,13)*m.flight,dt,8),-13,13);
   }
   const contact=distance<2&&m.flight<.12;
   if(contact&&!m.contact)m.landedAt=m.time;m.contact=contact;
   const since=m.time-m.landedAt,bounce=o.reduced?0:Math.exp(-since*9)*Math.sin(since*21)*.035;
   const lift=o.reduced?0:Math.min(15,distance*.12)*m.flight+Math.sin(m.time*3)*1.4*m.flight;
   const reach=o.reduced?0:o.target&&typeof o.target==='object'?o.target.reach||0:o.target&&contact ? .8 :!o.target?Math.max(0,Math.sin(m.time*.48-1.2))*.45:0;
   m.phase+=dt*(1.2+5.8*m.flight)*Math.PI*2;
   element.style.left='clamp(calc(var(--actor-size, 150px) * .7 + 3px), '+m.x+'px, calc(100% - var(--actor-size, 150px) * .7 - 3px))';
   element.style.top='clamp(calc(var(--actor-size, 150px) * .98 + 3px), '+(m.y-lift)+'px, calc(100% - var(--actor-size, 150px) * .27 - 3px))';
   element.style.setProperty('--actor-bank',m.bank+'deg');element.style.setProperty('--actor-squash',1-bounce);
   element.style.setProperty('--actor-reach',reach);element.style.setProperty('--actor-breath',o.reduced?0:Math.sin(m.time*1.7));
   const blink=o.reduced?0:((m.time+2.2)%6.2<.16?Math.sin(((m.time+2.2)%6.2)/.16*Math.PI):0);
   rig.current?.draw({time:o.reduced?0:m.time,phase:o.reduced?0:m.phase,flight:m.flight,tuck:m.flight,bank:m.bank,blink,look:clamp((p.x-m.x)/30,-1,1),reach});
   element.dataset.action=o.target?(m.flight>.15?'flying':contact?'reaching':'landing'):(m.flight>.15?'landing':'resting');
   const near=1-clamp((distance+lift)/65);
   if(shadow.current){shadow.current.style.left=p.x+'px';shadow.current.style.top=p.y+'px';shadow.current.style.opacity=String(.15+near*.5);shadow.current.style.scale=String(.6+near*.4);shadow.current.style.filter='blur('+(1+(1-near)*5)+'px)';}
   if(!once&&!o.reduced&&!o.paused&&visible&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  const start=()=>{const r=stage.getBoundingClientRect();visible=r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;cancelAnimationFrame(raf);last=0;frame(performance.now(),true);if(!options.current.reduced&&!options.current.paused&&visible&&!document.hidden)raf=requestAnimationFrame(frame);};
  wake.current=start;const observer=new ResizeObserver(start);observer.observe(stage);observer.observe(element);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else cancelAnimationFrame(raf);});intersection.observe(stage);
  const visibility=()=>{if(document.hidden)cancelAnimationFrame(raf);else start();};document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',start,{passive:true});start();
  return()=>{wake.current=null;cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',start);};
 },[sceneRef,home,reduced,paused]);
 useLayoutEffect(()=>{wake.current?.();},[typeof target==='string'?target:'',paused,reduced]);
 useLayoutEffect(()=>{if(!reduced)return;const stage=sceneRef.current||actor.current?.parentElement,el=actor.current;if(!stage||!el)return;const s=stage.getBoundingClientRect(),w=el.offsetWidth;let x=s.width*(target?.x??.77),y=s.height*(target?.y??.45);const d=typeof target==='string'?stage.querySelector(target):!target?stage.querySelector(home):null;if(d){const r=d.getBoundingClientRect();x=r.left-s.left+r.width*.5;y=r.top-s.top+r.height*.18;}el.style.left=clamp(x,w*.5+3,s.width-w*.5-3)+'px';el.style.top=clamp(y,w*.86+3,s.height-w*.14-3)+'px';},[target,reduced,sceneRef,home]);
 return <><span ref={shadow} className="actor-contact-shadow" aria-hidden="true"/><div ref={actor} className={'lumi-actor actor-mode--'+mode+' '+className} data-action="resting"><PatchCharacter ref={rig} reduced={reduced}/><svg className="lumi-reaching-hand" viewBox="0 0 100 100" aria-hidden="true"><path d="M54 71Q64 79 76 70" fill="none" stroke="#a87955" strokeWidth="5" strokeLinecap="round"/><ellipse cx="77" cy="69" rx="5" ry="4" fill="#f1cf9f" stroke="#a87955" strokeWidth="1"/><path className="actor-needle" d="m79 68 9-7m-1 0q12 0 8 12" fill="none" stroke="#f2be72" strokeWidth=".8"/></svg><svg className="actor-held-swatch" viewBox="0 0 60 45" aria-hidden="true"><path d="m5 4 46 3 4 31-9-2-6 4-8-3-7 4-7-4-9 3Z" fill="#c6afe7" stroke="#fff2da" strokeWidth="1" strokeDasharray="2 2"/><path d="m11 10 3 22m5-21 3 22m5-21 3 22m5-21 3 22m5-21 3 22" stroke="#34283f" opacity=".15"/></svg></div></>;
}
