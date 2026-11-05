import {createEngine} from '/packages/core/engine.mjs';
import {ghostInnWorld} from '/apps/ghost-inn/world.mjs';
import {lostLettersWorld} from '/apps/lost-letters/world.mjs';
const worlds=[ghostInnWorld,lostLettersWorld];
export const el=(tag,attrs={},...children)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')n.className=v;else if(k.startsWith('on')&&typeof v==='function')n.addEventListener(k.slice(2),v);else if(v!==null&&v!==false)n.setAttribute(k,String(v));}for(const c of children.flat())if(c!==null&&c!==undefined)n.append(typeof c==='string'?document.createTextNode(c):c);return n;};
export function download(name,text,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=el('a',{href:url,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function createBrowserSession(worldId){
 const key='hauntkit.v1.'+worldId;let engine=createEngine({worlds}),view,warning='',canSave=true,lastStored=null;
 try{const raw=localStorage.getItem(key);lastStored=raw;if(raw){const snap=JSON.parse(raw);if(snap.worldId!==worldId)throw Error('Wrong world');view=engine.restore(snap);}}catch(e){warning='Your earlier save could not be read. It has been kept untouched. Export it before starting again.';canSave=false;}
 if(!view)view=engine.createSession(worldId);
 function fresh(){if(!canSave)return;if(localStorage.getItem(key)!==lastStored)throw Error('Another tab updated this world. Reload to continue from its saved progress.');}
 function persist(){if(!canSave)return;try{const raw=JSON.stringify(engine.snapshot(view.sessionId));localStorage.setItem(key,raw);lastStored=raw;}catch(e){warning='This browser could not save your progress. Export a save to keep it.';}}
 if(canSave)persist();
 return{
  get view(){return view;},get warning(){return warning;},
  act(action,input={}){fresh();const result=engine.dispatch(view.sessionId,{action,input,expectedVersion:view.version});view=result.view;persist();return result;},
  export(){let raw;try{raw=canSave?null:localStorage.getItem(key);}catch{}download(worldId+'-save.json',raw||JSON.stringify(engine.snapshot(view.sessionId),null,2));},
  import(raw){fresh();const snap=JSON.parse(raw);if(snap.worldId!==worldId)throw Error('That save belongs to a different world.');const next=createEngine({worlds});const restored=next.restore(snap);engine=next;view=restored;canSave=true;warning='';persist();return view;},
  reset(){fresh();engine=createEngine({worlds});view=engine.createSession(worldId);canSave=true;warning='';persist();return view;}
 };
}
export function wireSaves(session,render,{onBefore=()=>true}={}){
 document.querySelector('#export-save')?.addEventListener('click',()=>{if(onBefore())session.export();});
 document.querySelector('#import-save')?.addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>1000000)throw Error('This save is too large.');session.import(await f.text());render();showError('');}catch(err){showError('That save could not be restored: '+err.message);}e.target.value='';});
 document.querySelector('#reset')?.addEventListener('click',()=>{if(confirm('Start again? This clears the saved progress on this device. Export it first if you would like to keep it.')){try{session.reset();render();showError('');}catch(e){showError(e.message);}}});
 if(session.warning)showError(session.warning);
}
export function showError(message){const n=document.querySelector('#app-error');if(n){n.textContent=message;n.hidden=!message;}}
export function saveIndicator(session){const n=document.querySelector('#save-state');if(n)n.replaceChildren(...(session.warning?[el('span',{},'Export to keep your progress')]:[el('span',{class:'green-dot'}),'Saved on this device']));if(session.warning)showError(session.warning);}

