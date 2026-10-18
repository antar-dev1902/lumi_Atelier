import {spawn} from 'node:child_process';
const children=[spawn(process.execPath,['server/index.mjs'],{stdio:'inherit',env:{...process.env,PORT:'4174'},windowsHide:true}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{stdio:'inherit',windowsHide:true})];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const c of children)c.kill();setTimeout(()=>process.exit(code),150).unref();}
for(const c of children){c.on('error',e=>{console.error(e.message);stop(1)});c.on('exit',code=>{if(!stopping)stop(code||0)});}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
