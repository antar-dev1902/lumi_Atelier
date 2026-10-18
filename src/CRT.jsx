import React,{useState} from 'react';
import {MothMark,Icon,BackgroundStars} from './ui.jsx';
import './crt.css';

export default function CRT({onStart,onEnter,onAbout,onSound,sound,zooming,reduced,returning}){
 const [artReady,setArtReady]=useState(false);
 return <section className={'crt-room '+(artReady?'crt-room--art-ready ':'')+(zooming?'crt-room--zooming ':'')+(reduced?'crt-room--reduced-motion':'')} aria-label="Lumi's Atelier retro television">
  <div className="crt-room__ambience"/><BackgroundStars/>
  <header className="intro-top"><span className="intro-wordmark"><MothMark/>A PORTFOLIO IN EVERY STITCH</span><button className="intro-sound" onClick={onSound}><Icon name={sound?'sound':'mute'} size={17}/>{sound?'Sound on':'Sound off'}</button></header>
  <div className="crt-room__stage"><div className="crt-ground-shadow"/>
   <div className="crt-television"><span className="crt-plastic-highlight crt-plastic-highlight--top"/><span className="crt-plastic-highlight crt-plastic-highlight--side"/>
    <div className="crt-face"><div className="crt-screen-bezel"><div className="crt-glass">
     <div className="crt-screen-stars" aria-hidden="true">✧ <span>✦</span> ✧</div>
     <div className="crt-boot-effects" aria-hidden="true"><span className="crt-boot-effects__line"/><span className="crt-boot-effects__field"/><span className="crt-boot-effects__static"/></div>
     <div className="crt-screen-content"><div className="crt-screen-copy">
      <p className="crt-screen-content__eyebrow">MEET THE LITTLE DESIGNER</p>
      <h1 className="crt-screen-title">Lumi's<br/><em>Atelier.</em></h1>
      <p className="crt-screen-tagline">A little moth making<br/>forgotten fabrics extraordinary.</p>
      <div className="crt-entry-actions">
       <button className="crt-screen-start" onClick={onStart} disabled={zooming}>Explore world <Icon name="arrow" size={17}/></button>
       <button className="crt-collections-entry" onClick={onEnter} disabled={zooming}>Browse collections<Icon name="book" size={16}/></button>
      </div>
      <button className="crt-meet-lumi" onClick={onAbout} disabled={zooming}>Meet Lumi, moth & fashion designer<Icon name="heart" size={13}/></button>
      <span className="crt-screen-caption">{returning?'A familiar glow. Welcome back.':'Every thread deserves another story.'}</span>
     </div><img className="crt-patch" src="/assets/patch-hero.webp" alt="Lumi, a fluffy moth fashion designer with amber eyes and stitched pastel wings" fetchPriority="high" onLoad={()=>setArtReady(true)} width="1040" height="867"/></div>
     <span className="crt-glass__reflection"/><span className="crt-screen-scan" aria-hidden="true"/>
    </div></div>
    <aside className="crt-controls" aria-label="Television controls">
     <div className="crt-brand-plate">DREAM<br/>VISION<span>MODEL 01</span></div>
     <div className="crt-vent-slots" aria-hidden="true">{Array.from({length:7},(_,i)=><span key={i}/>)}</div><div className="crt-speaker" aria-hidden="true"/>
     <div className="crt-knob-bank"><button className="crt-knob crt-knob--channel" aria-label={sound?'Mute sound':'Enable sound'} aria-pressed={sound} onClick={onSound}><i/></button><span className="crt-knob crt-knob--tuning" aria-hidden="true"><i/></span></div>
     <div className="crt-power-row"><span className="crt-power-led" aria-hidden="true"/><span className="crt-power-label">A LITTLE GLOW</span></div>
     <button className="crt-physical-start" aria-label="Enter Lumi's world using the television button" onClick={onStart} disabled={zooming}>PLAY</button>
    </aside></div>
    <div className="crt-lower-ridge" aria-hidden="true"><span/><span/><span/></div><span className="crt-sticker" aria-hidden="true">✧<small>HANDLE<br/>WITH WONDER</small></span>
   </div>
  </div>
  <footer className="dream-intro-footer"><span><i/>TRANSMITTING TEXTILE STORIES</span><button className="text-button" onClick={onEnter}>{returning?'Continue exploring':'Just looking? Enter the studio'}<Icon name="arrow" size={15}/></button><span>FROM AN ATTIC TO AN ATELIER</span></footer>
  {zooming&&<button className="crt-skip-start" onClick={onEnter}>Skip to archive</button>}
 </section>;
}
