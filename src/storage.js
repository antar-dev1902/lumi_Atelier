export const STORE='patch-archive-v1';
export function readSaved(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch{return {};}}
export function writeSaved(value){try{localStorage.setItem(STORE,JSON.stringify(value));}catch{}}
export async function api(path,options={}){const response=await fetch('/api/'+path,{...options,headers:{'Content-Type':'application/json',...options.headers},signal:options.signal||AbortSignal.timeout(7000)});const result=await response.json();if(!response.ok)throw new Error(result.error||'The archive could not connect. Please try again.');return result;}
export function visitorId(){let id;try{id=localStorage.getItem('patch-visitor-id');if(!id){id=crypto.randomUUID();localStorage.setItem('patch-visitor-id',id);}}catch{id=crypto.randomUUID();}return id;}

