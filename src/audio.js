let context,enabled=false,ambienceWanted=false,ambientTimer,narration;
const live=new Set(),pads=new Set();
export async function setAudioEnabled(value){enabled=value;try{if(value){context ||= new(window.AudioContext||window.webkitAudioContext)();await context.resume();if(ambienceWanted)startAmbience();}else{cancelNarration();stopNotes();stopAmbience();if(context?.state==='running')await context.suspend();}return enabled;}catch{enabled=false;return false;}}
export function tone(frequency=261.63,duration=.55,delay=0,volume=.026){if(!enabled||!context||context.state!=='running')return;const osc=context.createOscillator(),gain=context.createGain(),start=context.currentTime+delay;osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+Math.min(.08,duration/3));gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(gain);gain.connect(context.destination);osc.onended=()=>{live.delete(osc);osc.disconnect();gain.disconnect();};live.add(osc);osc.start(start);osc.stop(start+duration+.05);}
export function chime(){[261.63,329.63,392].forEach((f,i)=>tone(f,1.15,i*.18,.021));}
export function clickSound(){tone(392,.18,0,.009);}
export function stopNotes(){for(const osc of live){try{osc.stop();}catch{}}live.clear();}
export const notes=[{name:'C',frequency:261.63},{name:'E',frequency:329.63},{name:'G',frequency:392},{name:'A',frequency:440}];
function stopAmbience(){clearInterval(ambientTimer);ambientTimer=null;for(const item of pads){try{item.osc.stop();}catch{}}pads.clear();}
function startAmbience(){if(ambientTimer||!enabled||!context||document.hidden)return;let chord=0;const chords=[[130.81,196,261.63,329.63],[110,164.81,220,261.63],[87.31,130.81,174.61,261.63],[98,146.83,196,293.66]];const play=()=>{if(!enabled||document.hidden)return;const start=context.currentTime;chords[chord%4].forEach((f,i)=>{const osc=context.createOscillator(),gain=context.createGain(),item={osc,gain};osc.type='sine';osc.frequency.value=f;osc.detune.value=i%2?2:-2;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.009/(i+1),start+3.5);gain.gain.setValueAtTime(.009/(i+1),start+10);gain.gain.linearRampToValueAtTime(0,start+16);osc.connect(gain);gain.connect(context.destination);pads.add(item);osc.onended=()=>{pads.delete(item);osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+16.1);});chord++;};play();ambientTimer=setInterval(play,13000);}
export function setStoryAmbience(active){ambienceWanted=active;if(active)startAmbience();else stopAmbience();}
export function cancelNarration(){narration=null;if('speechSynthesis'in window)window.speechSynthesis.cancel();}
export function pauseNarration(){if(!narration||!('speechSynthesis'in window))return false;narration.paused=true;window.speechSynthesis.pause();return true;}
export function resumeNarration(text){if(!enabled||!narration||narration.text!==text||!('speechSynthesis'in window))return false;if(narration.paused){narration.paused=false;window.speechSynthesis.resume();}return true;}
export function narrate(text){
 cancelNarration();if(!enabled||!('speechSynthesis'in window))return false;
 const synth=window.speechSynthesis,speech=new SpeechSynthesisUtterance(text.replace(/[""]/g,'')),voices=synth.getVoices(),english=voices.filter(v=>v.lang.startsWith('en'));
 speech.voice=english.find(v=>/Samantha|Aria|Jenny|Zira|Serena|Natural/i.test(v.name))||english[0]||null;speech.lang=speech.voice?.lang||'en-GB';speech.rate=.94;speech.pitch=1.06;speech.volume=.6;
 const active={speech,text,paused:false};narration=active;
 speech.onend=speech.onerror=()=>{if(narration===active)narration=null;};
 // A cancelled paused utterance can leave the native queue paused.
 synth.resume();synth.speak(speech);return true;
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopNotes();stopAmbience();cancelNarration();}else if(ambienceWanted)startAmbience();});


export function stitchSound(){if(!enabled||!context||context.state!=='running')return;[0,.065,.13].forEach(delay=>tone(170,.045,delay,.004));}
