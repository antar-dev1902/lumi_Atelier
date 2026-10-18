import React from 'react';
import LookSketch from './LookSketch.jsx';
export default function FashionSketch({type='gown',design,accent='#e8c9d9',variant=0,color='#9884a1',className=''}){
 if(design)return <LookSketch design={design} color={color} accent={accent} variant={variant} className={className}/>;
 return <svg className={'fashion-sketch '+className} viewBox="0 0 240 340" fill="none" role="img" aria-label={'Lumi’s '+type+' concept sketch'}>
  <g stroke="#625351" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
   <ellipse cx="120" cy="37" rx="12" ry="18" fill="#ead9c6"/><path d="M109 32q0-19 15-14q11 3 7 20l-5-11-17 5Z" fill="#75665f"/>
   <path d="M114 53v11l-21 10-21 54-12 44m66-119v11l21 10 21 54 12 44"/><path d="m60 172-4 12m124-12 4 12M104 246l-6 65-10 9h17l12-75m18 0 8 66 9 9h-17l-10-75" fill="#ead9c6"/>
   {type==='gown'?<>
    <path d={variant===1?'M99 73l21 22 21-22 1 57 34 169q-55 20-112 0l34-169Z':variant===2?'M114 63l6 15 6-15 19 25-8 44 49 163q-66 28-132 0l49-163-8-44Z':'M93 74l27 13 27-13 8 24-23 31 43 164q-53 24-107 0l37-164-22-31Z'} fill={color}/>
    <path d="m104 130 32 1m-16 5-18 150m24-152 15 151m-48-119-13 110m64-104 20 103" opacity=".7"/>
    {variant===0&&<path d="m91 87 41 39m-28-26 32 1m-34 9 33 2m-29 8 27 1"/>}
    {variant===2&&Array.from({length:10},(_,i)=><path key={i} d={'M'+(78+(i%4)*22)+' '+(180+Math.floor(i/4)*35)+'l4-6 4 6-4 5Z'} stroke="#eee0b7"/>)}
   </>:type==='tailoring'?<>
    <path d={variant===2?'m95 74-17 51 13 8 12-31-4 57 42 0-4-57 12 31 13-8-17-51-25 11Z':'m94 74-19 61 15 7 11-38-8 80 55 0-9-80 11 38 15-7-19-61-25 10Z'} fill={color}/>
    <path d="m106 72 14 44-19-17 8-8-8-11m33-8-14 44 20-17-9-8 8-11m-19 36v52m-23-15 15 1m18 0 14-1"/>
    <path d={variant===1?'m99 181-2 120h15l9-85 8 85h16l-3-120Z':'m100 175-16 125h31l7-91 7 91h30l-19-125Z'} fill={color}/><path d="m107 192-9 94m34-94 11 94" opacity=".6"/>
   </>:<>
    <path d={variant===1?'m94 74-22 67 17 8 12-39-15 125 68 0-15-125 12 39 17-8-22-67-25 10Z':variant===2?'m95 74 25 11 25-11 8 28-17 5 7 69H98l7-69-18-5Z':'m94 74-20 60 16 7 12-36-5 54h47l-5-54 12 36 16-7-20-60-26 10Z'} fill={color}/>
    <path d="m104 75 16 27 17-27m-17 27v108m-19-96 12 0v13h-14Zm29 0 13 0 2 13h-15Z"/>
    <path d={variant===0?'m99 161-22 137h86l-21-137Z':'m101 176-12 125h24l9-95 9 95h25l-15-125Z'} fill={color}/><path d="m100 184 19 1-3 49-22-1Zm30 26 17 3 4 44-18-1Z" fill="#c8baa5" opacity=".7"/><path d="m100 145 41 2m-29 18-11 120m30-118 13 120" strokeDasharray="3 3"/>
   </>}
   <path d="M62 326q55 5 116-1" stroke="#b6a28c" strokeDasharray="2 5"/><path d="M182 88h26m-23 0-8 9m-10 75 35 5m-8 0-8-6M63 250H34m12 0 13-9" stroke="#aa8c6c"/>
  </g><text x="32" y="30" fill="#9e8062" fontSize="8" fontFamily="monospace">L. / {String(variant+1).padStart(2,'0')}</text><text x="174" y="316" fill="#9e8062" fontSize="9" fontStyle="italic" fontFamily="Georgia">Lumi</text>
 </svg>;
}
