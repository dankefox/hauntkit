import{createBrowserSession,el,download,wireSaves,showError,saveIndicator}from'/shared/session.mjs';
const session=createBrowserSession('lost-letters');
const q=s=>document.querySelector(s),fields=['recipient','memory','wish','promise'];
let tone=session.view.tone||'warm',dirty=false,briefDirty=false;
function events(lines){q('#events').replaceChildren(el('span',{class:'event-spark'},'✳'),el('div',{},...lines.map(t=>el('p',{},t))));}
function act(action,input={}){const r=session.act(action,input);showError('');events(r.events);return r;}
function commitEdit(){if(dirty){act('edit',{text:q('#letter-text').value});dirty=false;}}
function commitBrief(){if(briefDirty){act('set_brief',Object.fromEntries(fields.map(f=>[f,q('#'+f).value])));briefDirty=false;}}
function run(fn){try{fn();render();}catch(e){showError(e.message);}}
function render(){
 const v=session.view;tone=v.tone||tone;
 if(!briefDirty)fields.forEach(f=>{q('#'+f).value=v.brief?.[f]||'';});
 q('#letter-text').hidden=!v.draft;q('#empty-letter').hidden=!!v.draft;
 if(!dirty)q('#letter-text').value=v.draft||'';
 q('#undo').disabled=!v.canUndo;q('#seal').disabled=!v.draft;q('#save-edit').disabled=!dirty;
 document.querySelectorAll('.tone').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.tone===tone));b.classList.toggle('active',b.dataset.tone===tone);});
 q('#draft-count').textContent=v.draft?String(v.draft.length)+' CHARACTERS · ALL YOURS':'A BLANK PAGE IS A GOOD START.';
 q('#paper-no').textContent='No. '+String(Math.max(1,v.versions)).padStart(3,'0');
 q('#paper-status').textContent=v.sealed?'SEALED WITH CARE. KEPT WITH YOU.':'A LITTLE SPACE FOR WHAT MATTERS.';
 q('#seal').replaceChildren(v.sealed?'Download again':'Seal & keep',el('span',{},'↗'));
 saveIndicator(session);
 if(dirty||briefDirty)markUnsaved();
}
function markUnsaved(){q('#save-state').textContent='Your changes are waiting to be kept';}
fields.forEach(f=>q('#'+f).addEventListener('input',()=>{briefDirty=true;markUnsaved();}));
q('#brief-form').addEventListener('submit',e=>{e.preventDefault();run(()=>{commitEdit();commitBrief();act('compose',{tone});dirty=false;});});
q('#letter-text').addEventListener('input',()=>{dirty=true;markUnsaved();q('#save-edit').disabled=false;q('#draft-count').textContent=String(q('#letter-text').value.length)+' CHARACTERS · UNSAVED EDITS';});
q('#letter-text').addEventListener('blur',()=>{if(dirty)run(()=>commitEdit());});
q('#save-edit').addEventListener('click',()=>run(()=>{commitEdit();}));
document.querySelectorAll('.tone').forEach(b=>b.addEventListener('click',()=>{const next=b.dataset.tone;if(session.view.draft){run(()=>{commitEdit();commitBrief();act('revise',{tone:next});});}else{tone=next;document.querySelectorAll('.tone').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));}}));
q('#undo').addEventListener('click',()=>run(()=>{commitEdit();act('undo');}));
q('#seal').addEventListener('click',()=>run(()=>{commitEdit();commitBrief();const r=act('seal');if(r.artifact)download(r.artifact.name,r.artifact.text,r.artifact.mime);}));
wireSaves(session,()=>{dirty=false;briefDirty=false;render();events(['Your desk is ready. There is no hurry.']);},{onBefore:()=>{try{commitEdit();commitBrief();return true;}catch(e){showError(e.message);return false;}}});render();
window.addEventListener('beforeunload',e=>{if(dirty||briefDirty){e.preventDefault();e.returnValue='';}});

