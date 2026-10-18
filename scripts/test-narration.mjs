import assert from 'node:assert/strict';

// Exercise the native speech API contract without launching a browser or network.
const events=new Map(),calls={spoken:[],pauses:0,resumes:0,cancels:0};
globalThis.document={hidden:false,addEventListener:(name,handler)=>events.set(name,handler)};
class AudioContext {
 state='suspended';
 async resume(){this.state='running';}
 async suspend(){this.state='suspended';}
}
globalThis.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
globalThis.window={AudioContext,speechSynthesis:{
 getVoices:()=>[{name:'Samantha',lang:'en-GB'}],
 speak:speech=>calls.spoken.push(speech),
 cancel:()=>calls.cancels++,
 pause:()=>calls.pauses++,
 resume:()=>calls.resumes++
}};
const {setAudioEnabled,narrate,pauseNarration,resumeNarration,cancelNarration}=await import('../src/audio.js');

assert.equal(narrate('Quiet before Explore World.'),false);
assert.equal(calls.spoken.length,0,'No narration before audio is enabled');
await setAudioEnabled(true);
const first='My fascination with fashion began in Grandma’s attic.';
assert.equal(narrate(first),true);
const original=calls.spoken.at(-1);
assert.equal(original.text,first);
assert.equal(original.voice.name,'Samantha');
assert.equal(pauseNarration(),true);
assert.equal(calls.pauses,1);
assert.equal(resumeNarration(first),true);
assert.equal(calls.spoken.length,1,'Resume continues the existing utterance');
assert.equal(calls.spoken[0],original);

pauseNarration();
const second='Bridges became seams. Autumn leaves became silhouettes.';
assert.equal(resumeNarration(second),false,'Changing frames never resumes the old frame');
assert.equal(narrate(second),true);
assert.equal(calls.spoken.length,2);
original.onend();
assert.equal(resumeNarration(second),true,'Late completion from an old utterance cannot clear the current one');
const current=calls.spoken.at(-1);current.onend();
assert.equal(resumeNarration(second),false,'Finished narration can be replayed');

narrate(first);pauseNarration();cancelNarration();
assert.equal(resumeNarration(first),false,'Exit clears paused narration');
narrate(second);await setAudioEnabled(false);
assert.equal(resumeNarration(second),false,'Mute clears narration');
assert.equal(narrate(first),false,'Muted chapters remain silent');

await setAudioEnabled(true);narrate(first);document.hidden=true;events.get('visibilitychange')();
assert.equal(resumeNarration(first),false,'Hidden tabs stop the speech queue');
delete window.speechSynthesis;
assert.equal(narrate(first),false);assert.equal(pauseNarration(),false);assert.equal(resumeNarration(first),false);
await setAudioEnabled(false);
console.log('PASS: audio activation, native pause/resume without restart, chapter switching, late callbacks, completion, exit, mute, hidden tabs and unsupported speech API. No browser or network used.');
