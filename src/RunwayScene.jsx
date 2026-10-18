import React,{useEffect,useId,useRef,useState} from 'react';
import LumiActor from './LumiActor.jsx';
import {Icon} from './ui.jsx';
import {stitchSound} from './audio.js';
import './runway.css';

const clamp=n=>Math.max(0,Math.min(1,n));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
export function runwayBeat(progress){return progress<.22?'waiting':progress<.76?'stitching':'revealed';}
export default function RunwayScene({progress,reduced,paused,sound,onOpen,onBeatChange}){
 const stage=useRef(null),lastStitch=useRef(-1),id=useId().replace(/:/g,''),[p,setP]=useState(clamp(progress)),[playing,setPlaying]=useState(!reduced),scrollPhase=useRef(progress);
 const fill=ease((p-.14)/.42),fold=ease((p-.08)/.3),stitch=ease((p-.42)/.3),reveal=ease((p-.72)/.12),paper=ease((p-.86)/.1),approach=ease(p/.22),leave=ease((p-.73)/.18);
 useEffect(()=>{if(Math.abs(progress-scrollPhase.current)>.018){scrollPhase.current=progress;setP(clamp(progress));}},[progress]);
 useEffect(()=>{
  if(!playing||paused||reduced)return;
  let raf=0,last=0;
  const frame=now=>{const dt=last?Math.max(0,now-last):0;last=now;if(!document.hidden)setP(old=>Math.min(1,old+dt/11000));raf=requestAnimationFrame(frame);};
  const visibility=()=>{last=0;};
  document.addEventListener('visibilitychange',visibility);
  raf=requestAnimationFrame(frame);return()=>{cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);};
 },[playing,paused,reduced]);
 useEffect(()=>{if(p>=1)setPlaying(false);},[p]);
 const beat=runwayBeat(p);
 useEffect(()=>{onBeatChange?.(beat);},[beat,onBeatChange]);
 function seek(value){setPlaying(false);setP(value);}
 function replay(){setP(0);setPlaying(!reduced);}
 const destination={x:.18+approach*.22-leave*.24,y:.77-approach*.31+leave*.02,flight:(1-ease((p-.20)/.1))*.75+leave*(1-leave)*2+leave*.6,reach:ease((p-.20)/.08)*(1-ease((p-.70)/.08))};
 useEffect(()=>{const beat=Math.floor(fill*5);if(sound&&!paused&&!reduced&&beat>0&&beat!==lastStitch.current&&p<.75)stitchSound();lastStitch.current=beat;},[fill,sound,paused,reduced,p]);
 return <div className="runway-scene" ref={stage} data-beat={beat} data-progress={p.toFixed(3)} aria-label="Blue Hour takes shape from an unfinished bodice into a cobalt gown" style={{'--silk-fill':fill,'--runway-reveal':reveal,'--paper-reveal':paper}}>
  <div className="runway-backstage" aria-hidden="true"><span className="backstage-curtain backstage-curtain--left"/><span className="backstage-curtain backstage-curtain--right"/><span className="backstage-floor"/></div>
  <div className="runway-scene-heading"><span>BACKSTAGE / THE BLUE HOUR</span><div><button onClick={()=>setPlaying(!playing)} aria-label={p>=1?'Runway repair complete':playing?'Pause the runway repair':'Play the runway repair'} aria-pressed={playing&&!paused&&!reduced} disabled={reduced||p>=1}><Icon name={p>=1?'check':playing?'pause':'play'} size={17}/></button><button onClick={replay} aria-label="Start the runway repair again"><Icon name="reset" size={17}/></button></div></div>
  <svg className="runway-dress-stage" viewBox="70 45 480 440" role="img" aria-label="Lumi folds, pins and stitches blue silk around a mannequin">
   <defs>
    <linearGradient id={id+'silk'} x1="0" x2="1"><stop stopColor="#183b91"/><stop offset=".32" stopColor="#5588f1"/><stop offset=".53" stopColor="#295bcd"/><stop offset=".76" stopColor="#7ca4ed"/><stop offset="1" stopColor="#173780"/></linearGradient>
    <radialGradient id={id+'light'}><stop stopColor="#f2be72" stopOpacity=".24"/><stop offset="1" stopColor="#f2be72" stopOpacity="0"/></radialGradient>
    <linearGradient id={id+'beam'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff2da" stopOpacity=".24"/><stop offset="1" stopColor="#f2be72" stopOpacity="0"/></linearGradient>
    <clipPath id={id+'drape'}><rect x="160" y="120" width="330" height={fill*345}/></clipPath>
   </defs>
   <ellipse cx="330" cy="302" rx="240" ry="220" fill={'url(#'+id+'light)'} opacity={.3+reveal*.7}/>
   <path d="M315 0 132 460h377L346 0Z" fill={'url(#'+id+'beam)'} opacity={reveal}/>
   <ellipse cx="323" cy="462" rx="194" ry="23" fill="#130c20" opacity=".7"/>
   <ellipse cx="323" cy="458" rx="161" ry="12" fill="#b9906666"/>
   <path d="M322 69v52m-9-52h18m-9 232v153m-39 5h78" fill="none" stroke="#c6a777" strokeWidth="5" strokeLinecap="round"/>
   <path d="M294 122q28 16 56 0l24 30-19 60 18 42q-51 15-100 0l18-42-19-60Z" fill="#b7a694" stroke="#e4d0aa" strokeWidth="2"/>
   <path d="m298 139 26 11 24-11-13 63 26 48-40-14-38 14 24-48Z" fill="#8796ae" opacity={1-fill}/>
   <path d="m302 171 20 17 19-18m-23 29 14 10-14 12" fill="none" stroke="#ffd8cd" strokeWidth="3" strokeDasharray="4 5" opacity={1-fill}/>
   <path d="m315 150-4 13 13 5-10 18 16 8-13 15 18 12" fill="none" stroke="#241b2f" strokeWidth="7" opacity={1-fill}/>
   <g opacity={1-paper}>
    <path d="M190 330q-68 28-84 98 63 19 128-5 8-51-44-93Z" fill="#3a65c2" stroke="#9bb7e9" strokeWidth="1.5" transform={'translate('+fold*81+' '+(-fold*110)+') rotate('+fold*-21+' 190 330)'} opacity={1-fill}/>
    <g clipPath={'url(#'+id+'drape)'}>
     <path d="m289 141 33 12 35-12-13 90 40 93 47 115q-107 40-218 0l45-115 42-93Z" fill={'url(#'+id+'silk)'} stroke="#9fc0f7" strokeWidth="1.3"/>
     <path d="m274 145 21-15 31 22 35-18 21 18-22 9-34-9-33-3-14 12Z" fill="#a7c9fa"/>
     <path d="m301 230 42 1m-33 8-30 182m50-183 12 190m10-165 55 158m-104-156-52 157" fill="none" stroke="#b8d2ff" strokeWidth="2" opacity=".48"/>
     {[[310,183],[331,201],[281,315],[340,303],[308,357],[370,380],[267,401],[323,421],[397,419]].map(([x,y],i)=><g key={i} transform={'translate('+x+' '+y+')'} stroke="#d8e7ff" strokeWidth="1" fill="#c0d9ff44"><path d="M0 0q-12-16 0-9 12-7 0 9 16-10 9 3 7 13-9-3 10 16-3 9-13 7 3-9-16 10-9-3-7-13 9 3Z"/><circle r="2" fill="#fff2da"/></g>)}
    </g>
    <path className="runway-living-stitch" d="M293 148q57 30 39 77-30 47-9 105l-7 87" fill="none" stroke="#f2be72" strokeWidth="3" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-stitch} opacity={1-reveal*.75}/>
    <g transform={'translate('+(293+Math.sin(stitch*Math.PI*2)*25)+' '+(148+stitch*260)+')'} opacity={p>.42&&p<.76?1:0}><path d="M-8 0H8M0-8V8m-5-5 10 10m-10 0L5-5" stroke="#fff2da" strokeWidth="1.3"/><circle r="3" fill="#f2be72"/></g>
   </g>
   <g className="runway-pins" stroke="#e9dcc1" strokeWidth="1.5" opacity={fold*(1-reveal)}><path d="m297 173-9-12m57 24 13-10m-61 39-12 4"/><circle cx="288" cy="161" r="3" fill="#d99bac"/><circle cx="358" cy="175" r="3" fill="#f2be72"/><circle cx="285" cy="218" r="3" fill="#c6afe7"/></g>
  </svg>
  <div className="runway-look-page" aria-hidden={paper<.8} style={{opacity:paper,transform:'translateY('+(1-paper)*18+'px) rotate('+(1-paper)*-5+'deg)'}}><span>ATTIC REVERIE / LOOK 01</span><div><img src="/assets/lookbook/reverie-cobalt.webp" alt="Blue Hour, the finished cobalt gown" width="900" height="1200"/></div><p>Blue Hour<small>One last stitch. A new beginning.</small></p></div>
  <LumiActor sceneRef={stage} target={destination} reduced={reduced} paused={paused} mode="runway" className="runway-lumi"/>
  <div className="runway-stepper" role="group" aria-label="Shape the runway dress, one stage at a time">
   {[{p:0,label:'The tear'},{p:.36,label:'Drape silk'},{p:.64,label:'Last stitch'},{p:.96,label:'Spotlight'}].map((step,i)=><button key={step.label} onClick={()=>seek(step.p)} aria-pressed={i===(p<.18?0:p<.48?1:p<.76?2:3)}><span>{String(i+1).padStart(2,'0')}</span>{step.label}</button>)}
  </div>
  <button type="button" className="runway-open-look" onClick={()=>onOpen('reverie')} disabled={p<.84} style={{opacity:p>=.84?1:0,visibility:p>=.84?'visible':'hidden'}}>Open Blue Hour <Icon name="book" size={16}/></button>
 </div>;
}
