import React from 'react';

// Each drawing follows the garment on its own catalogue page.
function Flowers({points,color='#f7e3b2',size=3}){
 return <g stroke={color} strokeWidth=".8">{points.map(([x,y],i)=><g key={i} transform={'translate('+x+' '+y+')'}><path d={`M0 0C-${size*2} -${size*3} ${size*2} -${size*3} 0 0C${size*3} -${size*2} ${size*3} ${size*2} 0 0C${size*2} ${size*3} -${size*2} ${size*3} 0 0C-${size*3} ${size*2} -${size*3} -${size*2} 0 0Z`} fill={color} fillOpacity=".22"/><circle r=".8" fill={color}/></g>)}</g>;
}
const skirtFlowers=[[94,182],[132,177],[111,213],[153,227],[82,247],[121,265],[164,275],[66,289],[142,300]];
function Suit({color,accent,mint=false,ivory=false}){
 return <>
  <path d={mint?'m100 167-13 132h29l6-93 8 93h28l-17-132Z':'m100 164-8 123h21l9-80 9 80h22l-12-123Z'} fill={color}/>
  <path d={mint?'m97 73-22 66 15 7 13-38-9 77h54l-10-77 14 38 14-7-22-66-24 10Z':'m97 73-21 61 13 7 14-35-7 65h50l-9-65 14 35 14-7-22-61-23 10Z'} fill={color}/>
  <path d="m109 78 22 0-3 29-16 0Z" fill={ivory?'#f5eee3':mint?accent:color}/>
  <path d="m105 73 15 46-19-16 8-10-9-13m35-7-15 46 20-16-10-10 9-13m-19 40v44m-20-18 13 1m16 0 14-1m-36 40-7 91m31-91 8 91"/>
  <circle cx="123" cy="139" r="1.4" fill="#665454"/>
  {ivory&&<Flowers points={[[139,110]]} color={accent} size={3.2}/>}
 </>;
}
function Outfit({design,color,accent}){
 switch(design){
  case 'cobalt': return <>
   <path d="m98 75 22 8 23-8-8 60 27 62 31 103q-72 27-146 0l30-103 28-62Z" fill={color}/>
   <path d="m87 77 14-10 21 15 23-12 14 12-15 6-22-6-22-2-9 8Z" fill={accent}/>
   <path d="m106 134 28 1m-22 5-20 152m33-153 8 157m7-137 37 134m-71-125-35 123" opacity=".65"/>
   <Flowers points={[[112,103],[126,115],...skirtFlowers]} color={accent} size={2.7}/>
  </>;
  case 'scarlet': return <>
   <path d="M103 116q17 26 35 0l-4 32 11 91 25 63q-46 14-95-1l26-62 7-91Z" fill={color}/>
   <path d="m102 72 33 47m3-47-32 47m-4-47 10 57m26-57-9 57" stroke={color} strokeWidth="2.4"/>
   <path d="m109 149 18 1m-9 3-9 143m22-99 21 97" opacity=".65"/>
  </>;
  case 'golden': return <>
   <path d="m102 75 18 18 18-18 5 54-11 16 27 151q-40 17-80 0l28-151-11-16Z" fill={color}/>
   <path d="m101 75-17 23-27 72q14 13 32 6l19-62m30-39 17 23 27 72q-14 13-32 6l-19-62" fill={color} fillOpacity=".6"/>
   <path d="m108 146 24 0m-19 6-22 140m30-138v141m8-142 21 138" opacity=".6"/>
   <Flowers points={[[108,108],[130,106],[119,128],[83,139],[74,161],[156,137],[166,158],[91,274],[110,283],[132,283],[150,274]]} color={accent} size={2.7}/>
  </>;
  case 'iris': return <>
   <path d="m97 82q11-12 23 0 12-12 23 0l-9 54 61 158q-76 31-151 0l61-158Z" fill={color}/>
   <path d="m94 84-13 4-10 34 19 7 16-25m40-20 13 4 10 34-19 7-16-25" fill={accent}/>
   <path d="m106 135 28 1m-14 4-8 150m25-137 33 136m-68-128-32 126" opacity=".5"/>
   <Flowers points={[[111,106],[127,119],...skirtFlowers]} color={accent} size={3.5}/>
  </>;
  case 'fuchsia-suit': return <Suit color={color} accent={accent}/>;
  case 'mint-suit': return <Suit color={color} accent={accent} mint/>;
  case 'ivory-suit': return <Suit color={color} accent={accent} ivory/>;
  case 'lemon-blazer': return <>
   <path d="m102 74 5 21q13 9 26 0l4-21-1 77 12 111q-29 12-56 0l12-111Z" fill={accent}/>
   <path d="m105 74-9-2-24 71 16 7 15-41-9 73 18-3-2-73Zm30 0 9-2 24 71-16 7-15-41 9 73-18-3 2-73Z" fill={color}/>
   <path d="m103 75-7 23 12 8-9 10 10 17m28-58 7 23-12 8 9 10-10 17m-34 17 11 1m25 0 12-1m-27 37-10 73"/>
  </>;
  case 'bow': return <>
   <path d="m101 99 37 0 6 104q-23 8-47 0Z" fill={color}/>
   <path d="M116 97Q94 57 53 66L57 130q27 9 59-23Zm9 0q22-40 63-31l-4 64q-27 9-59-23Z" fill={accent}/>
   <path d="m116 101-42-20m42 20-36 15m46-15 39-19m-39 19 35 15" opacity=".6"/>
   <path d="m115 94 12 0 3 19-15 0Zm1 17-16 38 15-5 7 10 3-42m1 1 18 33-13-4-4 10-3-40" fill={accent}/>
   <path d="m101 190 39 0m-35-30 33 1" opacity=".5"/>
  </>;
  case 'clementine': return <>
   <path d="m100 77 20 7 19-7 2 39-8 20q11 15 28 24l31 58q-27 25-72 23-44 2-70-23l30-58q18-9 29-24l-11-20Z" fill={color}/>
   <path d="M101 76Q68 61 70 106q1 19 30 5l14-21Zm38 0q33-15 31 30-1 19-30 5l-14-21Z" fill={color}/>
   <path d="m102 79-23 21 22 4m37-25 23 21-21 4m-30 30 23 0m-21 6-17 72m32-72 25 77m-22-62 37 53m-59-52-33 50"/>
   <path d="M59 219q60 25 125 0" stroke={accent} opacity=".7"/>
  </>;
  case 'sugarflutter': return <>
   <path d="m102 80q8-11 18 0 10-11 18 0l-6 54 26 30 15 41q-52 20-105 0l15-41 25-30Z" fill={color}/>
   <path d="m103 76 2-11m32 11-2-11M105 66q-19-10-13 1 2 5 13-1 14-13 13-3-1 8-13 3m30 0q-13-13-14-3 0 8 14 3 19-10 13 1-2 5-13-1" stroke={color} strokeWidth="2"/>
   <path d="m111 86-2 42m20-42 2 42m-24 7 26 0"/>
   {[158,176,194].map((y,i)=><path key={y} d={'M'+(88-i*7)+' '+y+'q9 10 17 0 9 10 17 0 9 10 17 0 9 10 17 0'+(i>0?'q8 10 15 0':'')} stroke={accent} strokeWidth="5"/>)}
   <Flowers points={[[120,82]]} color={accent} size={3}/>
  </>;
  case 'lemon-drop': return <>
   <path d="M102 65h9q9 17 18 0h9l-7 64 12 72q-6 8-11 1-6 8-12 1-6 8-12-1-6 7-11-1l12-72Z" fill={color}/>
   <path d="m109 128 22 0m-22 9-4 57m26-57 4 57" opacity=".55"/>
   <Flowers points={[[113,103],[125,116],[112,145],[128,157],[110,179],[129,190]]} color={accent} size={2.3}/>
  </>;
  default:return null;
 }
}
export default function LookSketch({design,color,accent,variant=0,className=''}){
 const back=design==='scarlet';
 return <svg className={'fashion-sketch '+className} viewBox="0 0 240 340" fill="none" role="img" aria-label={'Lumi’s '+design.replaceAll('-',' ')+' garment sketch'} data-design={design}>
  <path d="M120 18v300M48 135h145M53 301h137" stroke="#ad987c" opacity=".24" strokeDasharray="2 5"/>
  <g stroke="#66534f" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
   <ellipse cx="120" cy="38" rx="11" ry="17" fill="#ead9c6"/>
   <path d={back?'M109 38q-5-22 13-22 15 0 10 22l-7-10-16 10Z':'M109 32q-1-19 16-14 11 4 6 22l-6-13-16 5Z'} fill="#76645d"/>
   {back?<circle cx="121" cy="26" r="7" fill="#76645d"/>:<path d="m115 39 2 0m8 0 1 0m-9 9 6 0" opacity=".6"/>}
   <path d="m114 55-1 10-18 10-19 48-14 43-7 14 8-4 5-11 19-38 16-29m23-43 1 10 18 10 19 48 14 43 7 14-8-4-5-11-19-38-16-29M103 178l-4 62-3 65-8 12h18l14-94 14 94h18l-10-12-3-65-4-62Z" fill="#ead9c6"/>
   <Outfit design={design} color={color} accent={accent}/>
   <path d="m98 305-10 12h18l1-12m27 0v12h18l-10-12" fill="#71605d"/>
  </g>
  <g stroke="#a98e70" strokeWidth=".7" opacity=".75"><path d="M178 84h28m-24 0-8 6m-5 112 35-5m-8 1-8-5M67 265H35m7 0 10-6"/><path d="M62 326q56 4 116-1" strokeDasharray="2 5"/></g>
  <text x="25" y="27" fill="#9e8062" fontSize="8" fontFamily="monospace">L. / {String(variant+1).padStart(2,'0')}</text>
  {back&&<text x="25" y="40" fill="#9e8062" fontSize="6" fontFamily="monospace">BACK VIEW</text>}
  <text x="174" y="316" fill="#9e8062" fontSize="10" fontStyle="italic" fontFamily="Georgia">Lumi</text>
 </svg>;
}
