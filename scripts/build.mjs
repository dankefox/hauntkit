import{cp,mkdir,readFile,rm,writeFile}from'node:fs/promises';
import{fileURLToPath}from'node:url';import path from'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));const out=path.join(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(path.join(root,'site'),out,{recursive:true});
for(const file of ['packages/core/engine.mjs','apps/ghost-inn/world.mjs','apps/lost-letters/world.mjs']){await mkdir(path.dirname(path.join(out,file)),{recursive:true});await cp(path.join(root,file),path.join(out,file));}
await writeFile(path.join(out,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Content-Security-Policy: default-src \'self\'; img-src \'self\' data:; style-src \'self\'; script-src \'self\'; connect-src \'self\'; object-src \'none\'; base-uri \'self\'; frame-ancestors \'none\'\n');
console.log('Built static Hauntkit site in dist/');

