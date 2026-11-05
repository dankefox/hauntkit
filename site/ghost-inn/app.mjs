import{createBrowserSession,el,wireSaves,showError,saveIndicator}from'/shared/session.mjs';
import{sceneFor}from'./scenes.mjs';
const session=createBrowserSession('ghost-inn');
const q=s=>document.querySelector(s);
let lastEvents=['The boat has left. The inn is quiet. Someone is waiting by the desk.'];
function act(action,input){try{const r=session.act(action,input);lastEvents=r.events;showError('');render();}catch(e){showError(e.message);}}
function render(){
 const v=session.view,hasLetter=v.inventory.some(i=>/letter/.test(i.id));
 q('#rooms').replaceChildren(...v.rooms.map((r,i)=>el('button',{class:'room-tab','aria-current':r.id===v.room.id?'true':'false',onclick:()=>act('move',{room:r.id})},el('span',{class:'tab-num'},'0'+(i+1)),r.name,r.locked?el('span',{class:'tab-lock'},'LOCKED'):null)));
 q('#scene').innerHTML=sceneFor(v.room.id,hasLetter);
 q('#scene').append(el('span',{class:'scene-label'},'GHOST INN / '+v.room.name.toUpperCase()),el('span',{class:'scene-badge'},'TAKE YOUR TIME'));
 q('#room-label').textContent='YOU ARE HERE';
 q('#room-title').textContent=v.room.name;
 q('#room-description').textContent=v.room.description;
 q('#targets').replaceChildren(...v.targets.map(t=>el('button',{class:'target-button',onclick:()=>act('inspect',{target:t.id})},t.label)));
 q('#characters').replaceChildren(...v.characters.map(c=>el('div',{class:'character-block'},el('span',{class:'character-avatar','aria-hidden':'true'},c.name.slice(0,1)),el('div',{class:'character-info'},el('div',{class:'character-name'},c.name),el('div',{class:'topic-row'},...c.topics.map(t=>el('button',{class:'topic',onclick:()=>act('talk',{character:c.id,topic:t.id})},t.label)))))));
 q('#events').replaceChildren(el('span',{class:'event-spark'},'✳'),el('div',{},...lastEvents.map(s=>el('p',{},s))));
 q('#clue-count').textContent=String(v.clues.length).padStart(2,'0');
 q('#clues').replaceChildren(...(v.clues.length?v.clues.map(c=>el('article',{class:'clue'},el('h4',{},c.title),el('p',{},c.text))):[el('p',{class:'empty-note'},'A good mystery begins with a little looking around.')]));
 q('#inventory').replaceChildren(v.inventory.length?el('div',{class:'inventory-chips'},...v.inventory.map(i=>el('span',{class:'inventory-chip'},i.label))):el('p',{class:'empty-note'},'Empty pockets. An open mind.'));
 q('#journal').replaceChildren(...v.journal.slice(-12).map(s=>el('li',{},s)));
 const special=q('#special-actions');special.replaceChildren();
 if(v.room.id==='attic'&&v.actions.includes('unlock')&&!hasLetter){const field=el('input',{name:'code',inputmode:'numeric',pattern:'[0-9]{4}',maxlength:'4',placeholder:'Four digits','aria-label':'Trunk combination',required:'true'});const form=el('form',{class:'inline-form',onsubmit:e=>{e.preventDefault();act('unlock',{code:field.value});}},field,el('button',{type:'submit',class:'button ink'},'Try the lock ↗'));special.append(el('section',{class:'special-box'},el('h3',{},'A little lock. A long-kept secret.'),el('p',{},'Four digits. There must be something in the inn that remembers.'),form));}
 if(v.room.id==='lobby'&&hasLetter&&!v.ending){const field=el('input',{name:'recipientName',maxlength:'100',placeholder:"Who was this letter for?",'aria-label':'The forgotten guest name',required:'true'});const form=el('form',{class:'inline-form name-form',onsubmit:e=>e.preventDefault()},field);const choices=el('div',{class:'choice-row'},el('button',{class:'button ink',onclick:()=>act('return_letter',{recipientName:field.value,choice:'open'})},'Open it together ↗'),el('button',{class:'button outline',onclick:()=>act('return_letter',{recipientName:field.value,choice:'keep'})},'Let her keep it sealed'));special.append(el('section',{class:'special-box'},el('h3',{},'Some letters take the long way home.'),el('p',{},'You have the letter. Now help Maude remember the name it belongs to.'),form,choices));}
 q('#ending').replaceChildren(...(v.ending?[el('section',{class:'ending-box'},el('span',{class:'eyebrow'},'ONE KIND OF HOMECOMING'),el('h2',{},v.ending.title),el('p',{},v.ending.text),el('a',{href:'/lost-letters/'},'Have a letter of your own? Take a seat at Lost Letters ↗'))]:[]));
 saveIndicator(session);
}
wireSaves(session,()=>{lastEvents=['A new page in the guestbook. Take your time.'];render();});render();

