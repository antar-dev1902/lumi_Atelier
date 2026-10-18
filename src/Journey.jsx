import React,{useEffect,useRef,useState} from 'react';
import {Icon,IconButton,MothMark} from './ui.jsx';
import {BookStack} from './BookCorner.jsx';
import AtelierMemories from './AtelierMemories.jsx';
import RunwayScene from './RunwayScene.jsx';
import {setStoryAmbience,narrate,cancelNarration,pauseNarration,resumeNarration} from './audio.js';
import PatchCharacter from './PatchCharacter.jsx';
import {usePatchMotion} from './patchMotion.js';
import './journey.css';
import './patch-character.css';
import './origin.css';

export const CHAPTERS=[
 {
  "title": "It began in an attic.",
  "label": "GRANDMA’S SUNLIT WORKROOM",
  "text": "Forgotten fabrics. A pedal sewing machine. A very curious little moth.",
  "narration": "I'm Lumi. My first stitches began in Grandma's sunlit attic, beside her old sewing machine.",
  "mood": "peek"
 },
 {
  "title": "My margins became worlds.",
  "label": "A NOTEBOOK WAS NEVER ENOUGH",
  "text": "Bridges became seams. Autumn leaves became silhouettes.",
  "narration": "I sketched the world around me: bridges became seams, and falling leaves became flowing silhouettes.",
  "mood": "fly"
 },
 {
  "title": "Scraps became a beginning.",
  "label": "THE FIRST COLLECTION",
  "text": "Recycled denim. Forgotten velvet. My first little show.",
  "narration": "Old denim and forgotten velvet became my first collection, and a dream worth following.",
  "mood": "repair"
 },
 {
  "title": "One last stitch changed everything.",
  "label": "THE NIGHT BEHIND THE RUNWAY",
  "text": "A little silk. A second chance.",
  "narration": "When a runway dress tore, I shaped leftover silk into Blue Hour. One last stitch changed everything.",
  "mood": "think"
 },
 {
  "title": "Every chapter, bound in linen.",
  "label": "AN ATELIER OF MY OWN",
  "text": "Years of studio work, now gathered into three collections.",
  "narration": "Years of learning led me here: my own little atelier, and three collections full of stories.",
  "mood": "repair"
 },
 {
  "title": "Come in. I’m Lumi.",
  "label": "FASHION DESIGNER · TEXTILE STORYTELLER",
  "text": "The lookbooks are open. There’s a new story on every page.",
  "narration": "Open a lookbook, turn a page, and find something you love. Every thread deserves another story.",
  "mood": "wave"
 }
];
const clamp=n=>Math.max(0,Math.min(1,n));
export function Curtains(){return <div className="theatre-transition" aria-hidden="true"><div className="velvet velvet--left"/><div className="velvet velvet--right"/><div className="curtain-inscription"><MothMark/><span>A LITTLE WORLD IS OPENING</span></div><div className="curtain-valance"/></div>}

export default function Journey({onDone,onOpen,sound,onSound,reduced,covered=false,paused=false,onMotion,completed=[]}){
 const root=useRef(null),character=useRef(null),raf=useRef(0),[progress,setProgress]=useState(0),[voice,setVoice]=useState(true),[voiceReady,setVoiceReady]=useState(false),[runwayPhase,setRunwayPhase]=useState('waiting');
 const chapter=Math.min(5,Math.floor(progress*6)),current=CHAPTERS[chapter],narrating=voice&&sound,runwayProgress=clamp(progress*6-3),beat=runwayPhase;
 useEffect(()=>{
  setVoiceReady('speechSynthesis' in window);
  let width=innerWidth,height=innerHeight,position=0;
  const update=()=>{
   raf.current=0;
   const el=root.current;
   if(!el)return;
   const range=Math.max(1,el.offsetHeight-innerHeight);
   if(width!==innerWidth||height!==innerHeight){
    width=innerWidth;height=innerHeight;
    const top=window.scrollY+el.getBoundingClientRect().top;
    window.scrollTo({top:top+range*position,behavior:'instant'});
    setProgress(position);
   }else{
    position=clamp(-el.getBoundingClientRect().top/range);
    setProgress(position);
   }
  };
  const scroll=()=>{if(!raf.current)raf.current=requestAnimationFrame(update);};
  update();
  window.addEventListener('scroll',scroll,{passive:true});
  window.addEventListener('resize',scroll);
  return()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);cancelAnimationFrame(raf.current);};
 },[]);
 useEffect(()=>{setStoryAmbience(sound&&!covered&&!paused);return()=>setStoryAmbience(false);},[sound,covered,paused]);
 useEffect(()=>{if(sound&&!covered&&!paused){if(voice){if(!resumeNarration(current.narration))narrate(current.narration);}else pauseNarration();}else cancelNarration();},[chapter,voice,sound,covered,paused]);
 useEffect(()=>{const hide=()=>{if(document.hidden)setVoice(false);};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);cancelNarration();};},[]);
 function jump(i){const el=root.current;if(!el)return;const top=window.scrollY+el.getBoundingClientRect().top+(el.offsetHeight-innerHeight)*((i+.22)/6);window.scrollTo({top,behavior:reduced?'instant':'smooth'});}
 usePatchMotion(root,character,{progress,reduced,covered,paused});
 return <section ref={root} className={'journey journey--frame-'+chapter+' '+(chapter>=3?'journey--west ':'')+(reduced?'journey--gentle':'')} aria-label="Lumi’s motion story: From an Attic to an Atelier" style={{'--journey-progress':progress}}>
  <div className="journey-viewport">
   <div className="journey-room"><img className="journey-art" src="/assets/archive.webp" alt="" width="1942" height="809"/><div className="quiet-corner"/><div className="following-glow"/><div className="window-spark"/><AtelierMemories/><div className="journey-contact-shadow" aria-hidden="true"/><div className="journey-patch"><PatchCharacter ref={character} reduced={reduced}/></div><button className="moon-secret" aria-label="Look under the green moon cushion" onClick={()=>onOpen('egg')} tabIndex={chapter===2?0:-1} style={{pointerEvents:chapter===2?'auto':'none',opacity:chapter===2?1:0}}><Icon name="thread" size={22}/></button><BookStack onOpen={onOpen} completed={completed} active={chapter===4} reduced={reduced}/></div>
   <div className="journey-vignette" aria-hidden="true"/>
   {chapter===3&&<RunwayScene progress={runwayProgress} reduced={reduced} paused={paused||covered} sound={sound} onOpen={onOpen} onBeatChange={setRunwayPhase}/>}
   <header className="journey-header">
    <button className="journey-brand" onClick={onDone} aria-label="Lumi’s Atelier — browse collections"><MothMark/><span>LUMI'S<br/><small>ATELIER</small></span></button>
    <span className="journey-edition">FROM AN ATTIC TO AN ATELIER · SIX FRAMES</span>
    <div className="journey-controls">{voiceReady&&<button className={'voice-button '+(narrating?'is-on':'')} aria-pressed={narrating} aria-label={narrating?'Pause narration':'Resume narration'} title={narrating?'Pause narration':'Resume narration'} onClick={()=>{if(narrating)setVoice(false);else{setVoice(true);if(!sound)onSound(true);}}}><Icon name={narrating?'pause':'play'} size={16}/><span>{narrating?'Pause narration':'Resume narration'}</span><span className="voice-short">{narrating?'Pause':'Resume'}</span></button>}<IconButton name={sound?'sound':'mute'} label={sound?'Mute story sound':'Enable gentle story sound'} onClick={()=>onSound()}/><IconButton name={reduced?'play':'leaf'} label={reduced?'Animate Lumi':'Reduce character movement'} onClick={onMotion} active={!reduced}/></div>
    <button className="text-button journey-skip" onClick={onDone}>Skip story<Icon name="arrow" size={16}/></button>
   </header>
   <div className={'journey-copy journey-copy--'+chapter} key={chapter}><p className="eyebrow">{String(chapter+1).padStart(2,'0')} / 06 <span/> {current.label}</p><h1>{current.title}</h1><p className="journey-caption">{current.text}</p>{chapter===3&&<span className="runway-caption-beat">{beat==='waiting'?'The runway was waiting.':beat==='stitching'?'She found another way.':'Blue Hour was born.'}</span>}{chapter===0&&<span className="journey-invitation">Scroll to turn the page.<Icon name="leaf" size={14}/></span>}{chapter===2&&<button className="cushion-hint" onClick={()=>onOpen('egg')}>Grandma left a little secret.<Icon name="thread" size={14}/></button>}{chapter===4&&<p className="books-story-hint"><Icon name="book" size={16}/>Choose a collection. Turn a page.</p>}{chapter===5&&<div className="journey-final-actions"><button className="button button--gold" onClick={onDone}>Explore my collections<Icon name="arrow"/></button><button className="text-button" onClick={()=>onOpen('about')}>Meet the designer<Icon name="heart" size={16}/></button></div>}</div>
   <footer className="journey-footer"><div className="journey-mobile-nav"><button className="journey-back" disabled={chapter===0} aria-label="Previous story chapter" onClick={()=>jump(chapter-1)}><Icon name="arrow" size={18}/></button><select aria-label="Choose story chapter" value={chapter} onChange={e=>jump(Number(e.target.value))}>{CHAPTERS.map((c,i)=><option value={i} key={i}>{i+1} / 6 · {c.title}</option>)}</select></div><div className="journey-chapters" aria-label="Jump to a story frame">{CHAPTERS.map((c,i)=><button key={i} aria-label={'Go to chapter '+(i+1)+': '+c.title} aria-current={chapter===i?'step':undefined} onClick={()=>jump(i)}><span/>{String(i+1).padStart(2,'0')}</button>)}</div><span className="journey-scroll">{chapter===5?'EVERY THREAD, ANOTHER STORY':'SCROLL THROUGH HER STORY'}<Icon name={chapter===5?'heart':'arrow'} size={18}/></span><button className="journey-next" onClick={()=>chapter===5?onDone():jump(chapter+1)} aria-label={chapter===5?'Enter the archive':'Next story chapter'}><Icon name="arrow" size={18}/></button></footer>
   <div className="journey-progress" aria-hidden="true"><span/></div>
  </div>
 </section>
}

