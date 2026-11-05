import{test}from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
let source=await readFile(new URL('../site/shared/session.mjs',import.meta.url),'utf8');
for(const path of ['/packages/core/engine.mjs','/apps/ghost-inn/world.mjs','/apps/lost-letters/world.mjs'])source=source.replaceAll("'"+path+"'",JSON.stringify(new URL('..'+path,import.meta.url).href));
const{createBrowserSession}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function storage(){const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};return data;}
test('actual browser adapter blocks a stale tab without altering its world',()=>{storage();const a=createBrowserSession('ghost-inn'),b=createBrowserSession('ghost-inn');a.act('inspect',{target:'bell'});assert.throws(()=>b.act('inspect',{target:'guestbook'}),/Another tab/);assert.equal(b.view.version,0);assert.equal(b.view.clues.length,0);});
test('corrupt local save is preserved until an explicit reset',()=>{const data=storage(),key='hauntkit.v1.ghost-inn';data.set(key,'broken-json');const s=createBrowserSession('ghost-inn');assert.match(s.warning,/untouched/);s.act('inspect',{target:'bell'});assert.equal(data.get(key),'broken-json');s.reset();assert.equal(JSON.parse(data.get(key)).version,0);});
test('a blocked storage write is reported instead of claiming a durable save',()=>{globalThis.localStorage={getItem:()=>null,setItem:()=>{throw Error('quota');}};const s=createBrowserSession('lost-letters');assert.match(s.warning,/could not save/);});

