import React from 'react';
import FashionSketch from './FashionSketch.jsx';
import './atelier-story.css';
export default function AtelierMemories(){return <div className="atelier-memories" aria-hidden="true">
 <div className="attic-memory"><span className="attic-sunbeam"/><svg viewBox="0 0 250 170"><path d="M12 142h222v13H12Z" fill="#90694b"/><path d="M43 124V66q0-20 23-20h75q18 0 20 20v26h-24V74h-36v49Z" fill="#6a5063" stroke="#d9b67d" strokeWidth="3"/><path d="M36 122h130v14H36Z" fill="#7b5c6b" stroke="#d9b67d" strokeWidth="3"/><circle cx="168" cy="73" r="29" stroke="#d9b67d" strokeWidth="5"/><circle cx="168" cy="73" r="20" stroke="#ac8b66"/><path d="M168 44v58m-29-29h58M96 75v51m-17-6h35" stroke="#d9b67d" strokeWidth="2"/><path d="M84 122q-34 12-51 3v20q29 19 66-2Z" fill="#b5ad90"/><path d="M66 46V18m-10 0h20v17H56Z" fill="#c4a0a7" stroke="#d9b67d" strokeWidth="2"/><path d="M66 34q20-2 30 40" stroke="#e9d6aa" strokeWidth="1" fill="none"/></svg><span>Grandma’s attic / the first stitch</span></div>
 <div className="notebook-memories"><div><FashionSketch type="gown" color="#b69ba9"/></div><div><FashionSketch type="tailoring" color="#909d8a"/></div><span>notes from everywhere</span></div>
 <div className="fabric-memories"><i/><i/><i/><span>a second beginning</span></div>
 <div className="runway-memory"><FashionSketch type="gown" variant={1} color="#c5a888"/><svg viewBox="0 0 200 260"><path className="runway-stitch" d="M56 42q107 32 38 72t20 96"/></svg><span>one sketch. one last chance.</span></div>
 </div>}
