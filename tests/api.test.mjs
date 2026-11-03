import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'human-os-test-'));
const port=51000+Math.floor(Math.random()*1000);
const password='integration-test-secret-passphrase';
const child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),RUN_SERVER:'1',APP_PASSWORD:password,SESSION_SECRET:'test-secret-that-is-longer-than-32-characters',DB_PATH:path.join(dir,'data.sqlite'),OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
const base=`http://127.0.0.1:${port}`;
async function request(url,method='GET',data,cookie,extra={}){
 const res=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},body:data===undefined?undefined:JSON.stringify(data),redirect:'manual'});
 const body=await res.json().catch(()=>({}));return {status:res.status,body,cookie:res.headers.get('set-cookie'),headers:res.headers};
}
async function waitForServer(){for(let i=0;i<50;i++){try{const r=await fetch(base+'/api/health');if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('Server did not start')}
let auth,revision,state;
test('ready',async()=>{await waitForServer();const health=await request('/api/health');assert.equal(health.status,200);assert.equal(health.body.aiConfigured,false)});
test('authorization and origin checks',async()=>{
 const no=await request('/api/state');assert.equal(no.status,401);
 const bad=await request('/api/login','POST',{password:'wrong'});assert.equal(bad.status,401);
 const login=await request('/api/login','POST',{password});assert.equal(login.status,200);assert.match(login.cookie,/HttpOnly/);assert.match(login.cookie,/SameSite=Strict/);auth=login.cookie.split(';')[0];
 const csrf=await request('/api/state','PUT',{},auth,{Origin:'https://evil.example'});assert.equal(csrf.status,403);
});
test('onboarding and persistent state',async()=>{
 let current=await request('/api/state','GET',undefined,auth);assert.equal(current.status,200);revision=current.body.revision;state=current.body.state;
 state.goal='Learn to reason about complex problems';state.baseline='One session a week';state.bottleneck='Interruptions';state.onboard=4;
 let saved=await request('/api/state','PUT',{revision,state},auth);assert.equal(saved.status,200);revision=saved.body.revision;
 current=await request('/api/state','GET',undefined,auth);assert.equal(current.body.state.goal,state.goal);
});
test('check-ins, experiment and weekly review persistence',async()=>{
 state.logs=[{date:'2026-11-03',progress:'Yes',energy:4,note:'Focused learning went well',metric:'3/4 questions correct'}];
 state.reviews=[{date:'2026-11-03T12:00:00Z',note:'Protected time helped. Evidence remains limited.',decision:'Keep'}];
 state.experiment.title='Deep learning test';
 let saved=await request('/api/state','PUT',{state,revision},auth);assert.equal(saved.status,200);revision=saved.body.revision;
 const current=await request('/api/state','GET',undefined,auth);assert.equal(current.body.state.logs.length,1);assert.equal(current.body.state.reviews.length,1);assert.equal(current.body.state.experiment.title,'Deep learning test');
});
test('optimistic revision conflict cannot overwrite newer state',async()=>{
 const outdated=await request('/api/state','PUT',{state,revision:'0'},auth);assert.equal(outdated.status,409);
 const current=await request('/api/state','GET',undefined,auth);assert.equal(current.body.revision,revision);
});
test('validation rejects malformed payload and oversized content',async()=>{
 const bad=structuredClone(state);bad.logs[0].energy=900;
 const r=await request('/api/state','PUT',{state:bad,revision},auth);assert.equal(r.status,400);
 const huge=structuredClone(state);huge.goal='x'.repeat(6000);
 const r2=await request('/api/state','PUT',{state:huge,revision},auth);assert.equal(r2.status,400);
});
test('AI is real-only and disabled without API credentials',async()=>{
 const c=await request('/api/coach','POST',{mode:'chat',message:'Help me reflect'},auth);assert.equal(c.status,503);assert.match(c.body.error,/AI is not configured/);
});
test('PWA app shell and assets delivered',async()=>{
 for(const file of ['/','/styles.css','/app.js','/sw.js','/manifest.webmanifest','/assets/mountain-dawn.png','/icons/icon-192.png']){
  const r=await fetch(base+file);assert.equal(r.status,200,file)
 }
 const html=await (await fetch(base+'/')).text();assert.match(html,/Human OS/);
});
test('logout invalidates browser session cookie',async()=>{
 const logout=await request('/api/logout','POST',{},auth);assert.equal(logout.status,200);assert.match(logout.cookie,/Max-Age=0/);
 const no=await request('/api/state','GET',undefined,'human_session=');assert.equal(no.status,401);
});
test.after(()=>{child.kill();fs.rmSync(dir,{recursive:true,force:true})});
