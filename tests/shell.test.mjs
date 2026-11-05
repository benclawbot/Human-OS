import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const root=new URL('../',import.meta.url);
test('PWA entry point and offline asset list are complete',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8');
  const worker=await readFile(new URL('sw.js',root),'utf8');
  assert.match(html,/\.\/app\.js/);
  assert.match(html,/manifest\.webmanifest/);
  assert.match(worker,/data\.mjs/);
  assert.match(worker,/storage\.mjs/);
  for(const name of ['index.html','app.js','data.mjs','storage.mjs','styles.css','sw.js','manifest.webmanifest','assets/mountain-dawn.jpg','icons/icon-192.png','icons/icon-512.png']){
    const s=await stat(new URL(name,root));assert.ok(s.size>0,name);
  }
});
test('delivered application has no server API or AI dependencies',async()=>{
 const app=await readFile(new URL('app.js',root),'utf8');
 const pkg=JSON.parse(await readFile(new URL('package.json',root),'utf8'));
 assert.doesNotMatch(app,/fetch\(\s*['"`]\/api|OPENAI_API_KEY|requestAI\(/);
 assert.equal(Object.keys(pkg.dependencies||{}).length,0);
});
test('local HTTP server delivers JavaScript modules with correct MIME types',async()=>{
  const port=43391;
  const server=spawn('node',[new URL('scripts/serve.mjs',root).pathname,String(port)],{stdio:'ignore'});
  try{
    let response;
    for(let i=0;i<40;i++){
      try{response=await fetch(`http://127.0.0.1:${port}/data.mjs`);break;}catch{await new Promise(r=>setTimeout(r,50));}
    }
    assert.ok(response?.ok,'data.mjs accessible');
    assert.match(response.headers.get('content-type')||'',/javascript/);
    const source=await response.text();assert.match(source,/export const templates/);
  }finally{server.kill();}
});
