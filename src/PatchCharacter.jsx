import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {Pose,Prop} from './ui.jsx';

// A textured mesh keeps Lumi's original illustration while articulating it.
// Wings bend at their roots; the face, feelers and feet have separate weights.
const VERTEX=`
precision highp float;
attribute vec2 aUV;
uniform float uTime,uPhase,uFlight,uTuck,uBank,uBlink,uLook,uReach;
uniform mediump float uPart;
varying vec2 vUV,vLocalUV;
varying float vShade;
void main(){
 vec2 p=aUV;float shade=1.0;
 if(uPart<1.5){
  bool left=uPart<.5;
  float angle=mix(.66+.025*sin(uTime*1.1+(left?0.0:.6)),.79+.55*sin(uPhase+(left?0.0:.19)),uFlight);
  float hinge=left?.43:.63;
  p.x=hinge+(p.x-hinge)*cos(angle);
  p.y+=.022*sin(angle)*smoothstep(.02,.35,abs(aUV.x-hinge));
  p.y+=.007*uFlight*sin(uPhase+.5+aUV.y*2.0)*abs(aUV.x-hinge);
  shade=1.0-.17*sin(angle);
 }else{
  float head=(1.0-smoothstep(.54,.68,aUV.y));
  float roll=(.014*sin(uTime*.82)-uBank*.003+uLook*.013+uReach*.045)*head;
  vec2 h=p-vec2(.52,.49);
  p=vec2(h.x*cos(roll)-h.y*sin(roll),h.x*sin(roll)+h.y*cos(roll))+vec2(.52,.49);
  vec2 eyeL=aUV-vec2(.43,.46),eyeR=aUV-vec2(.61,.51);
  float blinkL=exp(-pow(eyeL.x/.085,4.0)-pow(eyeL.y/.085,4.0));
  float blinkR=exp(-pow(eyeR.x/.085,4.0)-pow(eyeR.y/.085,4.0));
  p.y-=uBlink*.93*(eyeL.y*blinkL+eyeR.y*blinkR);
  p.x+=(blinkL+blinkR)*uLook*.004;
  float tip=1.0-smoothstep(.09,.30,aUV.y),side=aUV.x<.51?-1.0:1.0;
  p.x+=tip*(.010*sin(uTime*1.9+side*.9)+uBank*.0006);
  p.y+=tip*.003*cos(uTime*1.6+side);
  float belly=smoothstep(.63,.78,aUV.y)*(1.0-smoothstep(.89,.98,aUV.y));
  p.x+=(p.x-.52)*belly*.027*sin(uTime*1.7);
  float feet=smoothstep(.80,.94,aUV.y);
  p.y-=feet*uTuck*.075;
  p.x+=feet*uFlight*.007*sin(uPhase*.46+side);
  float seated=(1.0-uFlight)*smoothstep(.84,.97,aUV.y);
  p.x+=seated*(aUV.x-.51)*.6;
  p.y-=seated*.028;
  p.y+=uFlight*.002*sin(uPhase+.7)*(1.0-feet);
 }
 gl_Position=vec4((p.x-.5)*1.8,(.5-p.y)*1.65,uPart<1.5?.25:0.0,1.0);
 vUV=(vec2(1.5)+aUV*vec2(370.0,339.0))/vec2(1448.0,1086.0);
 vLocalUV=aUV;vShade=shade;
}`;
const FRAGMENT=`
precision mediump float;
uniform sampler2D uArt;
uniform mediump float uPart;
varying vec2 vUV,vLocalUV;
varying float vShade;
float ellipse(vec2 p,vec2 center,vec2 radius){vec2 d=(p-center)/radius;return dot(d,d);}
void main(){
 vec2 p=vLocalUV;
 float head=ellipse(p,vec2(.50,.46),vec2(.245,.20));
 float feelerL=ellipse(p,vec2(.39,.14),vec2(.20,.16));
 float feelerR=ellipse(p,vec2(.76,.22),vec2(.19,.14));
 float body=ellipse(p,vec2(.51,.77),vec2(.165,.215));
 float mask=1.0-smoothstep(.98,1.03,min(min(head,body),min(feelerL,feelerR)));
 if(uPart<.5&&p.x>.54)discard;
 if(uPart>.5&&uPart<1.5&&p.x<.54)discard;
 float layer=uPart<1.5?1.0-mask:mask;
 vec4 c=texture2D(uArt,vUV);c.a*=layer;if(c.a<.035)discard;
 gl_FragColor=vec4(c.rgb*vShade*c.a,c.a);
}`;

function makeRenderer(canvas,onReady,onFailure){
 canvas.dataset.ready='false';
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'low-power'});
 if(!gl)return null;
 if(gl.isContextLost())return null;
 // Restored contexts may still report errors from disposed pre-loss handles.
 for(let i=0;i<16&&gl.getError()!==gl.NO_ERROR;i++){}
 const shaders=[],buffers=[];let texture,disposed=false;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(error);}shaders.push(s);return s;}
 const program=gl.createProgram();
 try{gl.attachShader(program,shader(gl.VERTEX_SHADER,VERTEX));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));}catch(error){canvas.dataset.rigError=error.message;for(const s of shaders)gl.deleteShader(s);gl.deleteProgram(program);return null;}
 const columns=96,rows=88,uv=[],indices=[];
 for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++)uv.push(x/columns,y/rows);
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1);}
 gl.useProgram(program);
 const vertices=gl.createBuffer();buffers.push(vertices);gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);
 const attr=gl.getAttribLocation(program,'aUV');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
 const elements=gl.createBuffer();buffers.push(elements);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 const part=gl.getUniformLocation(program,'uPart');
 const names=['Time','Phase','Flight','Tuck','Bank','Blink','Look','Reach'],uniforms=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(program,'u'+n)]));
 texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
 let ready=false,last;
 const art=new Image();art.onload=()=>{if(disposed)return;try{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,art);if(gl.getError()!==gl.NO_ERROR)throw Error('Character texture could not be uploaded');ready=true;canvas.dataset.ready='true';if(last)draw(last);onReady();}catch{onFailure();}};art.onerror=()=>{if(!disposed)onFailure();};art.src='/assets/poses.webp';
 function draw(state){last=state;if(!ready||disposed||gl.isContextLost())return;const size=Math.min(640,Math.max(256,Math.round(canvas.clientWidth*Math.min(devicePixelRatio||1,1.6))));if(canvas.width!==size){canvas.width=size;canvas.height=size;}gl.viewport(0,0,size,size);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);for(const n of names)gl.uniform1f(uniforms[n],state[n.toLowerCase()]||0);for(let layer=0;layer<3;layer++){gl.uniform1f(part,layer);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);}}
 return{draw,dispose(){disposed=true;art.onload=null;art.onerror=null;for(const b of buffers)gl.deleteBuffer(b);for(const s of shaders)gl.deleteShader(s);gl.deleteTexture(texture);gl.deleteProgram(program);}};
}

const PatchCharacter=forwardRef(function PatchCharacter({reduced=false},ref){
 const canvas=useRef(null),renderer=useRef(null),latest=useRef({time:0,phase:0,flight:0,tuck:0,bank:0,blink:0,look:0}),[fallback,setFallback]=useState(true);
 useImperativeHandle(ref,()=>({draw(state){latest.current=state;renderer.current?.draw(state);}}),[]);
 useEffect(()=>{const element=canvas.current;let instance,active=true;const ready=()=>{if(active)setFallback(false);},failed=()=>{if(active)setFallback(true);};function setup(){setFallback(true);try{instance=makeRenderer(element,ready,failed);}catch{instance=null;}renderer.current=instance;instance?.draw(latest.current);element.dataset.rig=instance?'mesh':'fallback';}setup();const lost=e=>{e.preventDefault();setFallback(true);};const restored=()=>{instance?.dispose();setup();};element.addEventListener('webglcontextlost',lost);element.addEventListener('webglcontextrestored',restored);return()=>{active=false;element.removeEventListener('webglcontextlost',lost);element.removeEventListener('webglcontextrestored',restored);instance?.dispose();renderer.current=null;};},[]);
 return <div className={'patch-character '+(reduced?'patch-character--still':'')}><canvas ref={canvas} className={'patch-mesh '+(fallback?'is-unavailable':'')} width="512" height="512" role="img" aria-label="Lumi, a fluffy moth with fluttering wings and curious amber eyes"/>{fallback&&<Pose mood="idle" className="patch-rig-fallback"/>}<div className="patch-carried-light" aria-hidden="true"><span className="patch-lantern-thread"/><div className="patch-lantern-swing"><Prop item={0}/></div></div></div>;
});
export default PatchCharacter;
