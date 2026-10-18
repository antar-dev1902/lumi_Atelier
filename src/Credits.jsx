import React from 'react';
import sources from '../ASSET_SOURCES.json';
import {COLLECTIONS} from './collections.js';

export default function Credits() {
 return <div className="credits-copy">
  <p>Lumi is an original, fictional moth fashion designer. Her collections and career are imagined for this character portfolio; the real fashion photographs below illustrate her fictional work.</p>
  <h3>Character & world</h3>
  <p>The story adapts the project creator's narrative. Lumi, her pose sheet, studio and prop artwork were made with OpenAI image generation. The articulated character, vector garment studies, interface, paper details and animations were developed for this project.</p>
  <h3>Fashion photography</h3>
  <p>Credit for each photograph belongs to its named photographer. Clothing and model credits remain with their respective creators as described on the original pages. Photographs are used under the linked Pexels or Unsplash licences.</p>
  {COLLECTIONS.map(collection=><section className="photo-credit-group" key={collection.id}>
   <h4>{collection.name}</h4>
   <ul>{collection.looks.map(look=>{
    const source=sources.find(s=>s.file===look.image.split('/').at(-1));
    return <li key={look.id}><span>{look.name}</span><a href={source.source} target="_blank" rel="noreferrer">{source.author}<span className="sr-only"> — photograph source, opens a new tab</span> ↗</a><a className="credit-license" href={source.license} target="_blank" rel="noreferrer">{source.source.includes('pexels')?'Pexels':'Unsplash'} licence<span className="sr-only"> for {look.name}, opens a new tab</span></a></li>;
   })}</ul>
  </section>)}
  <h3>Sound & type</h3>
  <p>Page sounds, sewing cues and ambience are synthesized with the Web Audio API. Optional narration uses the visitor's browser voice; there are no sampled music recordings.</p>
  <p><a href="https://fonts.google.com/specimen/Fraunces" target="_blank" rel="noreferrer">Fraunces</a> by Undercase Type; <a href="https://fonts.google.com/specimen/DM+Sans" target="_blank" rel="noreferrer">DM Sans</a> by Colophon Foundry; <a href="https://fonts.google.com/specimen/Space+Mono" target="_blank" rel="noreferrer">Space Mono</a> by Colophon Foundry. Fonts are bundled under the SIL Open Font License. <a href="/fonts/fraunces-OFL.txt" target="_blank" rel="noreferrer">Fraunces licence</a> · <a href="/fonts/dmsans-OFL.txt" target="_blank" rel="noreferrer">DM Sans licence</a> · <a href="/fonts/spacemono-OFL.txt" target="_blank" rel="noreferrer">Space Mono licence</a>.</p>
  <h3>Code & foundations</h3>
  <p>Built with <a href="https://react.dev/" target="_blank" rel="noreferrer">React / React DOM</a> (Meta and contributors, MIT), <a href="https://vite.dev/" target="_blank" rel="noreferrer">Vite</a> and its React plugin (Vite contributors, MIT). <a href="/credits/THIRD_PARTY_NOTICES.txt" target="_blank" rel="noreferrer">Included dependency notices</a>.</p>
 </div>;
}
