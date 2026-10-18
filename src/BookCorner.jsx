import React,{useEffect,useRef,useState} from 'react';
import {Icon,Pose} from './ui.jsx';
import './books.css';
import LumiActor from './LumiActor.jsx';
import {COLLECTIONS} from './collections.js';

export const BOOKS=COLLECTIONS;

// Anchored to the illustrated stack in archive.webp, in room coordinates.
// These are real buttons, so touch and keyboard work without hover.
export function BookStack({onOpen,completed=[],active=true,reduced=false,onPrepare,openDelay=260}){
 const[opening,setOpening]=useState(null),timer=useRef(null);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 function choose(id,event){if(opening)return;setOpening(id);onPrepare?.(id);timer.current=setTimeout(()=>{setOpening(null);onOpen(id);},reduced||event?.detail===0?0:openDelay);}
 return <div className={'world-bookstack '+(active?'is-awake':'')} aria-label="Lumi’s fashion collection lookbooks" inert={!active}>
  <span className="bookstack-invitation"><Icon name="book" size={14}/>OPEN A LOOKBOOK</span>
  {BOOKS.map(b=><button type="button" key={b.id} className={'world-book world-book--'+b.color+(opening===b.id?' is-opening':'')} data-book={b.id} aria-label={'Open '+b.name+' — '+b.kind} onClick={event=>choose(b.id,event)} aria-busy={opening===b.id}>
   <span className="book-binding" aria-hidden="true"/><Icon name={b.icon} size={18}/><span className="book-spine-title">{b.spine}<small>{b.kind}</small></span><span className="book-seal" aria-hidden="true"><Icon name={completed.includes(b.id)?'check':'spark'} size={14}/></span><span className="book-pages" aria-hidden="true"/>
  </button>)}
  <span className="bookstack-footnote">A new silhouette with every page.</span>
 </div>;
}

export default function BookCorner({onOpen,completed,reduced,covered=false,day=false,onDay,flutter=false,onFlutter}){
 const room=useRef(null),[target,setTarget]=useState(null);
 useEffect(()=>{if(!covered)setTarget(null);},[covered]);
 return <div className={'book-corner '+(flutter?'room-flutter':'')}>
  <div className="worktable-strip"><span><Icon name="thread" size={16}/> Lumi’s worktable <small>OPEN FOR LITTLE WONDERS</small></span><div><button aria-pressed={day} onClick={onDay}><Icon name={day?'sun':'moon'} size={16}/><span>{day?'Daydream':'Moonlight'}</span></button><button className="flutter-room-toggle" aria-pressed={flutter} onClick={onFlutter}><Icon name="spark" size={16}/><span>{flutter?'Settle the room':'Flutter the room'}</span></button></div></div>
  <div className="book-corner-scene" role="group" aria-label="Lumi’s studio worktable. Choose one of three fashion collections.">
   <div className="book-corner-room" ref={room}><img src="/assets/archive.webp" alt="A moonlit wooden studio, with Lumi’s three linen-bound lookbooks beside a curtain" width="1942" height="809" loading="lazy"/><div className="book-corner-light"/><div className="room-found-note" aria-hidden="true"><span>A tiny studio.<br/>A very full imagination.</span><i>— Lumi</i></div><svg className="worktable-thread" viewBox="0 0 1000 160" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 120C160 20 210 165 380 103S580 38 612 86s-70 67-87 13 170-56 217-7 132 15 278-42"/><circle cx="744" cy="92" r="11"/><path d="m737 85 14 14m0-14-14 14"/></svg><BookStack onOpen={onOpen} completed={completed} reduced={reduced} onPrepare={id=>setTarget('.world-book[data-book="'+id+'"]')} openDelay={720}/><div className="flutter-perch" aria-hidden="true"><span/><i/><i/><i/></div><div className="lumi-perch" aria-hidden="true"><svg viewBox="0 0 180 40"><path d="M4 25Q18 2 63 6q35 13 68-1 36-3 45 20-68 28-172 0Z" fill="#99af85" stroke="#d8dfb8" strokeWidth="2"/><path d="M13 25q75 19 152-1" fill="none" stroke="#d8dfb8" strokeDasharray="3 5"/><path d="M103 8q-28 10-44 1 14 21 44-1Z" fill="#e1e5ba"/></svg></div><LumiActor sceneRef={room} target={target||(flutter?'.flutter-perch':null)} reduced={reduced} paused={covered} className="book-corner-character"/></div>
   <span className="book-corner-label"><Icon name="thread" size={14}/>ON MY WORKTABLE</span>
  </div>
  <div className="book-catalogue" aria-label="Book catalogue">{BOOKS.map(b=><button key={b.id} onClick={()=>onOpen(b.id)}><span>{b.number}</span><span>{b.name}<small>{b.kind}</small></span><Icon name={completed.includes(b.id)?'check':'arrow'} size={17}/></button>)}</div>
 </div>;
}
