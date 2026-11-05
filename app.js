import {templates,today,initialState,normalizeState,validateState,experimentDay,weekStats,saveReflection,startExperiment} from './data.mjs';
import {readData,writeData} from './storage.mjs';
const app=document.getElementById('app');
const toast=document.getElementById('toast');
const ui={state:initialState(),view:'today',sub:'',busy:false,choice:'Some',energy:3,decision:'Keep',selectedTemplate:'focus',error:'',initialised:false};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>{
 const paths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
 flask:'<path d="M9 3h6m-5 0v7l-5.4 8.5A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.7-2.5L14 10V3"/><path d="M8 15h8"/>',
 chart:'<path d="M5 21v-6M12 21V9M19 21V3"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.2-1.7l2-1.5-2-3.5-2.3 1a8 8 0 0 0-2.9-1.7L13.2 2h-2.4l-.5 2.6a8 8 0 0 0-2.8 1.7l-2.4-1-2 3.5 2 1.5a8 8 0 0 0 0 3.4l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.8 1.7l.5 2.6h2.4l.5-2.6a8 8 0 0 0 2.9-1.7l2.3 1 2-3.5-2-1.5A7 7 0 0 0 19 12Z"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',
 back:'<path d="m15 18-6-6 6-6"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42m-11.3 11.3-1.42 1.42"/>',
 book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>'
 };
 return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.home}</svg>`;
};
const control=(label,action,kind='primary')=>`<button class="${kind}" type="button" data-action="${esc(action)}" ${ui.busy?'disabled':''}>${label}</button>`;
const header=()=>`<header class="top"><div class="brand"><span class="orb" aria-hidden="true"></span>Human OS</div><div class="topright"><button class="iconbtn" data-action="settings" aria-label="Settings">${icon('settings')}</button></div></header>`;
const nav=()=>`<nav class="nav" aria-label="Main navigation">${[['today','home','Today'],['experiment','flask','Experiment'],['journey','chart','Journey']].map(([id,ico,label])=>`<button type="button" class="${ui.view===id?'active':''}" data-action="tab:${id}" aria-current="${ui.view===id?'page':'false'}">${icon(ico)}<span>${label}</span></button>`).join('')}</nav>`;
const detailHeader=title=>`${header()}<button type="button" class="back" data-action="back">${icon('back')} Back</button><h1 class="sectiontitle">${esc(title)}</h1>`;
function notify(message){toast.textContent=message;toast.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('show'),3600);}
async function mutate(fn){if(ui.busy)return;ui.busy=true;try{const result=fn(structuredClone(ui.state));validateState(result);await writeData(result);ui.state=result;ui.error='';}catch(e){ui.error=e.message;notify(`Could not save: ${e.message}`)}finally{ui.busy=false;render()}}
const active=()=>ui.state.experiment;
const checkin=()=>ui.state.logs.find(l=>l.date===today());
const greeting=()=>new Date().getHours()<12?'Good morning.':new Date().getHours()<18?'Good afternoon.':'Good evening.';
function onboarding(){const step=ui.state.onboard;const copy=[
 {title:'What are you growing toward?',subtitle:'Choose one capability that matters to your life.',label:'YOUR NORTH STAR',placeholder:'e.g. Learn complex subjects more effectively',value:ui.state.goal},
 {title:'Where are you starting?',subtitle:'What can you do today? A simple, honest baseline is enough.',label:'CURRENT BASELINE',placeholder:'e.g. I manage 2 focused learning sessions weekly',value:ui.state.baseline},
 {title:'What gets in your way?',subtitle:'Choose the constraint you would most like to understand.',label:'MAIN BOTTLENECK',placeholder:'e.g. Interruptions and switching tasks',value:ui.state.bottleneck},
 {title:'Start with one small test.',subtitle:'Choose a manageable action for the next 14 days.',label:'FIRST EXPERIMENT',placeholder:'e.g. A protected 30-minute session',value:ui.state.experiment.intervention}][step];
 return `<section class="onboard"><div class="orb"></div><div class="step">STEP ${step+1} OF 4</div><h1>${esc(copy.title)}</h1><p class="lead">${esc(copy.subtitle)}</p><form data-form="onboard"><label class="field" for="answer">${copy.label}</label><textarea id="answer" name="answer" maxlength="500" required placeholder="${esc(copy.placeholder)}">${esc(copy.value)}</textarea><button class="primary" type="submit">${step===3?'Begin my journey →':'Continue →'}</button></form>${step>0?control('Back','onboard-back','quiet'):''}<div class="dots">${[0,1,2,3].map(i=>`<span class="${i<=step?'active':''}"></span>`).join('')}</div><p class="privacy-note">Private on this device. No account, AI or tracking service.</p></section>`;
}
function home(){const s=ui.state,e=s.experiment,focus=s.focusDate===today()&&s.focus?s.focus:e.intervention;const log=checkin();const fraction=Math.min(100,Math.round(experimentDay(e)/e.durationDays*100));return `${header()}<section class="hero"><div class="eyebrow">YOUR PERSONAL GROWTH SPACE</div><h1>${greeting()}</h1><p>One focused step today moves your long-term goal forward.</p></section>
 <article class="card interactive" data-action="goal" tabindex="0" role="button"><div class="between"><span class="kicker">${icon('target')} YOUR NORTH STAR</span><span class="arrow">›</span></div><h2>${esc(s.goal)}</h2></article>
 <article class="card interactive" data-action="experiment" tabindex="0" role="button"><div class="between"><span class="kicker">${icon('flask')} ACTIVE EXPERIMENT</span><span class="smallcaps">Day ${experimentDay(e)} of ${e.durationDays}</span></div><h3>${esc(e.title)}</h3><div class="progress" aria-label="${fraction}% time elapsed"><span style="width:${fraction}%"></span></div><p class="subtle">Time elapsed, not performance · ${fraction}%</p></article>
 <article class="card interactive" data-action="focus" tabindex="0" role="button"><div class="between"><span class="kicker">${icon('sun')} TODAY'S FOCUS</span><span class="arrow">›</span></div><h3>${esc(focus)}</h3></article>
 ${control(log?'Edit today’s reflection →':'Reflect on today →','reflect')}
 <p class="foot" style="text-align:center">${log?'Today’s reflection is saved on this device.':'Small experiments. Meaningful growth.'}</p>`;
}
function goal(){const s=ui.state;return `${detailHeader('Your North Star')}<p class="lead">Keep your direction clear enough to make better decisions about what to improve.</p><form data-form="goal"><label class="field" for="goal">NORTH STAR</label><textarea id="goal" name="goal" required maxlength="500">${esc(s.goal)}</textarea><label class="field" for="baseline">CURRENT BASELINE</label><textarea id="baseline" name="baseline" required maxlength="500">${esc(s.baseline)}</textarea><label class="field" for="bottleneck">MAIN BOTTLENECK</label><textarea id="bottleneck" name="bottleneck" required maxlength="500">${esc(s.bottleneck)}</textarea><button class="primary" type="submit">Save direction</button></form>`;}
function focus(){const existing=ui.state.focusDate===today()?ui.state.focus:'';return `${detailHeader('Today’s focus')}<p class="lead">One manageable action is enough.</p><form data-form="focus"><label class="field" for="focus">MY ONE MEANINGFUL ACTION</label><textarea id="focus" name="focus" required maxlength="500" placeholder="What is one thing you can move forward today?">${esc(existing)}</textarea><button class="primary" type="submit">Save today’s focus</button></form>`;}
function reflect(){const l=checkin();ui.choice=l?.progress||ui.choice;ui.energy=l?.energy||ui.energy;return `${detailHeader('Daily reflection')}<p class="lead">A short check-in is enough. What actually happened?</p><form data-form="reflect"><label class="field">DID YOU MAKE MEANINGFUL PROGRESS?</label><div class="choice-row">${[['Yes','Yes'],['Some','Some'],['No','Not today']].map(([v,label])=>`<button type="button" class="choice ${ui.choice===v?'active':''}" data-action="progress:${v}" aria-pressed="${ui.choice===v}">${label}</button>`).join('')}</div><div class="field-end" style="margin-top:22px"><label class="field" for="energy">ENERGY / SUSTAINABILITY</label><strong id="energyValue">${ui.energy}/5</strong></div><input id="energy" name="energy" type="range" min="1" max="5" value="${ui.energy}" style="accent-color:#a3cafa"/><label class="field" for="note">WHAT HELPED OR BLOCKED YOU?</label><textarea id="note" name="note" maxlength="1000" placeholder="A sentence is enough...">${esc(l?.note||'')}</textarea><label class="field" for="metric">OPTIONAL MEASURABLE RESULT</label><input id="metric" name="metric" maxlength="120" placeholder="e.g. 25 minutes of focused study" value="${esc(l?.metric||'')}"><button class="primary" type="submit" style="margin-top:20px">Save reflection</button></form>`;}
function experiment(){const e=active(),d=experimentDay(e),f=Math.round(d/e.durationDays*100);return `${header()}<h1 class="sectiontitle">Your experiment</h1><p class="lead">One test at a time. Observe what changes before drawing conclusions.</p><article class="card"><div class="between"><div class="kicker">${icon('flask')} ACTIVE TEST</div><span class="pill">Day ${d} / ${e.durationDays}</span></div><h2 class="experiment-title">${esc(e.title)}</h2><div class="progress"><span style="width:${f}%"></span></div><p class="muted">${f}% of the scheduled time elapsed. This is not a performance score.</p><div class="days" aria-label="Experiment days">${Array.from({length:Math.min(e.durationDays,21)},(_,i)=>`<span class="day ${i+1<d?'completed':''} ${i+1===d?'current':''}">${i+1}</span>`).join('')}</div></article>
 <article class="card"><div class="kicker">THE HYPOTHESIS</div><p class="soft">${esc(e.hypothesis)}</p><div class="divider"></div><div class="kicker">THE ACTION</div><p class="soft">${esc(e.intervention)}</p><div class="divider"></div><div class="kicker">THE MEASURE</div><p class="soft">${esc(e.metric)}</p><div class="divider"></div><div class="kicker">DECISION RULE</div><p class="soft">${esc(e.decisionRule)}</p></article>
 <div class="buttons">${control('Edit experiment','edit-experiment','secondary compact')}${control('New experiment','new-experiment','secondary compact')}</div>
 <p class="foot">Changing the current experiment resets its start date only when you explicitly start a new one.</p>`;}
function editExperiment(){const e=active();return `${detailHeader('Edit experiment')}<p class="lead">Make the test specific and measurable.</p><form data-form="experiment">${[['title','NAME'],['hypothesis','HYPOTHESIS'],['intervention','THE ACTION'],['metric','MEASUREMENT'],['decisionRule','DECISION RULE']].map(([k,l])=>`<label class="field" for="${k}">${l}</label><textarea id="${k}" name="${k}" maxlength="500" required>${esc(e[k])}</textarea>`).join('')}<label class="field" for="duration">DURATION</label><select id="duration" name="duration">${[7,14,21,28].map(d=>`<option value="${d}" ${d===e.durationDays?'selected':''}>${d} days</option>`).join('')}</select><button class="primary" type="submit" style="margin-top:20px">Save experiment</button></form>`;}
function newExperimentView(){const t=templates.find(x=>x.id===ui.selectedTemplate)||templates[0];return `${detailHeader('Choose your next test')}<p class="lead">Pick a starting idea. Every suggestion is a fixed template, not an AI recommendation.</p><div class="stack">${templates.map(x=>`<button type="button" class="choice ${x.id===ui.selectedTemplate?'active':''}" data-action="template:${x.id}" aria-pressed="${x.id===ui.selectedTemplate}" style="text-align:left">${esc(x.title)}</button>`).join('')}</div><article class="card" style="margin-top:18px"><div class="kicker">${icon('book')} THE EXPERIMENT</div><h3>${esc(t.title)}</h3><p class="muted">${esc(t.intervention)}</p></article>${control('Start this 14-day experiment','use-template')}<p class="privacy-note">Starting a new experiment archives the current one. It will not delete your reflections.</p>`;}
function journey(){const s=ui.state,logs=[...s.logs].sort((a,b)=>b.date.localeCompare(a.date)),stats=weekStats(s);return `${header()}<h1 class="sectiontitle">Your journey</h1><p class="lead">Real observations, not invented progress scores.</p><div class="stats stat-grid-3"><div class="stat"><strong>${stats.checkins}</strong><span>Check-ins this week</span></div><div class="stat"><strong>${stats.meaningful}</strong><span>Meaningful days</span></div><div class="stat"><strong>${stats.averageEnergy??'—'}</strong><span>Average energy / 5</span></div></div>
 <section class="review-banner"><div class="kicker">${icon('book')} WEEKLY REVIEW</div><h3 style="margin-bottom:8px">Look back. Choose what changes.</h3><p class="muted">A short weekly reflection helps improve the process itself.</p>${control('Start weekly review →','review','secondary')}</section>
 <h2 class="section-title">Recent reflections</h2>${logs.length?logs.slice(0,12).map(l=>`<div class="log"><strong>${esc(l.date)} · ${l.progress==='Yes'?'Meaningful progress':l.progress==='Some'?'Some progress':'No progress'} · Energy ${l.energy}/5</strong><p>${esc(l.note||'No note added')}${l.metric?` · ${esc(l.metric)}`:''}</p></div>`).join(''):'<div class="empty">Your observations will appear here after your first reflection.</div>'}
 <h2 class="section-title">Past decisions</h2>${s.reviews.length?[...s.reviews].reverse().slice(0,5).map(r=>`<div class="log"><strong>${esc(r.date.slice(0,10))} · ${esc(r.decision)}</strong><p>${esc(r.note)}</p>${r.systemChange?`<p>System change: ${esc(r.systemChange)}</p>`:''}</div>`).join(''):'<div class="empty">Weekly reviews will accumulate here over time.</div>'}
 ${s.history.length?`<h2 class="section-title">Experiment history</h2>${[...s.history].reverse().slice(0,7).map(x=>`<div class="log"><strong>${esc(x.title)}</strong><p>Archived ${esc(x.closedAt?.slice(0,10)||'')}</p></div>`).join('')}`:''}`;}
function review(){const stats=weekStats(ui.state);return `${detailHeader('Weekly review')}<p class="lead">Use your own evidence to decide what to keep, change or stop.</p><div class="stats stat-grid-3"><div class="stat"><strong>${stats.checkins}</strong><span>Check-ins</span></div><div class="stat"><strong>${stats.meaningful}</strong><span>Meaningful days</span></div><div class="stat"><strong>${stats.averageEnergy??'—'}</strong><span>Avg. energy</span></div></div><form data-form="review"><label class="field" for="takeaway">WHAT DID YOU LEARN THIS WEEK?</label><textarea id="takeaway" name="takeaway" maxlength="1500" required placeholder="What helped, what was difficult, what is still uncertain?"></textarea><label class="field">WHAT WILL YOU DO WITH THE EXPERIMENT?</label><div class="choice-row">${['Keep','Adjust','Stop'].map(v=>`<button type="button" class="choice ${ui.decision===v?'active':''}" data-action="decision:${v}" aria-pressed="${ui.decision===v}">${v}</button>`).join('')}</div><label class="field" for="systemChange">HOW COULD YOUR IMPROVEMENT PROCESS BE BETTER?</label><textarea id="systemChange" name="systemChange" maxlength="800" placeholder="e.g. Pick fewer metrics, set clearer test rules..."></textarea><button type="submit" class="primary" style="margin-top:18px">Save weekly review</button></form>`;}
function settings(){return `${detailHeader('Settings')}<article class="card"><div class="kicker">DATA & PRIVACY</div><h3>On-device by design</h3><p class="muted">Your North Star, reflections and experiments are stored locally in this browser using IndexedDB. There is no account, AI service, analytics, or data sync.</p><p class="privacy-note">Clearing site data or using another device can remove these records. Export backups regularly.</p></article>${control('Export my data','export','secondary')}<form data-form="import"><label class="field" for="import-file">IMPORT A HUMAN OS BACKUP</label><input type="file" id="import-file" name="file" accept="application/json,.json" required><button class="secondary" type="submit" style="margin-top:12px">Import backup</button></form><div class="divider"></div>${control('Start setup again','reset','quiet')}<p class="privacy-note">Reset permanently deletes your local observations after confirmation.</p>`;}
function render(){
 if(!ui.initialised){app.innerHTML='<div class="loading-screen">Human OS</div>';return;}
 if(ui.error&&ui.error.startsWith('STORAGE:')){app.innerHTML=`<section class="onboard"><h1>Local storage unavailable.</h1><p class="lead">Human OS needs browser storage to save your progress. Check your privacy settings, then reload.</p>${control('Try again','reload')}</section>`;return;}
 if(ui.state.onboard<4){app.classList.remove('has-nav');app.innerHTML=onboarding();return;}
 app.classList.add('has-nav');
 const content=ui.sub==='goal'?goal():ui.sub==='focus'?focus():ui.sub==='reflect'?reflect():ui.sub==='edit-experiment'?editExperiment():ui.sub==='new-experiment'?newExperimentView():ui.sub==='review'?review():ui.sub==='settings'?settings():ui.view==='experiment'?experiment():ui.view==='journey'?journey():home();
 app.innerHTML=content+nav();
}
function doAction(action){
 if(action.startsWith('tab:')){ui.view=action.slice(4);ui.sub='';render();scrollTo(0,0);return;}
 if(action.startsWith('progress:')){ui.choice=action.slice(9);render();return;}
 if(action.startsWith('decision:')){ui.decision=action.slice(9);render();return;}
 if(action.startsWith('template:')){ui.selectedTemplate=action.slice(9);render();return;}
 if(action==='back'){ui.sub='';render();return;}
 if(action==='onboard-back'){mutate(s=>({...s,onboard:Math.max(0,s.onboard-1)}));return;}
 if(['goal','focus','reflect','edit-experiment','new-experiment','review','settings'].includes(action)){ui.sub=action;if(action==='reflect'){ui.choice=checkin()?.progress||'Some';ui.energy=checkin()?.energy||3;}render();scrollTo(0,0);return;}
 if(action==='experiment'){ui.view='experiment';ui.sub='';render();scrollTo(0,0);return;}
 if(action==='use-template'){
  const t=templates.find(x=>x.id===ui.selectedTemplate)||templates[0];
  if(!confirm('Start a new 14-day experiment and archive your current one?'))return;
  mutate(s=>startExperiment(s,t)).then(()=>{ui.view='experiment';ui.sub='';render()});return;
 }
 if(action==='export'){
  const blob=new Blob([JSON.stringify({app:'Human OS',exportedAt:new Date().toISOString(),state:ui.state},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`human-os-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('Backup exported');return;
 }
 if(action==='reset'){
  if(!confirm('Delete all Human OS data saved in this browser? Export a backup first if needed.'))return;
  mutate(()=>initialState()).then(()=>{ui.view='today';ui.sub='';render();notify('Local data reset')});return;
 }
 if(action==='reload')location.reload();
}
app.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el)doAction(el.dataset.action)});
app.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"][data-action]')){e.preventDefault();doAction(e.target.dataset.action)}});
app.addEventListener('input',e=>{if(e.target.id==='energy'){ui.energy=Number(e.target.value);const label=document.getElementById('energyValue');if(label)label.textContent=`${ui.energy}/5`;}});
app.addEventListener('submit',async e=>{
 const form=e.target.closest('form[data-form]');if(!form)return;e.preventDefault();const kind=form.dataset.form;const fd=new FormData(form);
 if(kind==='onboard'){
  const answer=String(fd.get('answer')||'').trim();if(!answer){notify('Enter a short answer to continue');return;}
  await mutate(s=>{const keys=['goal','baseline','bottleneck'];if(s.onboard<3)s[keys[s.onboard]]=answer;else{s.experiment.intervention=answer;s.experiment.title='My first improvement experiment';s.experiment.startedAt=new Date().toISOString();}s.onboard=Math.min(4,s.onboard+1);return s;});return;
 }
 if(kind==='goal'){
  await mutate(s=>{for(const key of ['goal','baseline','bottleneck']){const val=String(fd.get(key)||'').trim();if(!val)throw new Error('Complete all fields');s[key]=val;}return s;});ui.sub='';render();return;
 }
 if(kind==='focus'){
  await mutate(s=>{const val=String(fd.get('focus')||'').trim();if(!val)throw new Error('Choose one action');s.focus=val;s.focusDate=today();return s;});ui.sub='';render();return;
 }
 if(kind==='reflect'){
  const entry={date:today(),progress:ui.choice,energy:Number(fd.get('energy')||3),note:String(fd.get('note')||'').trim().slice(0,1000),metric:String(fd.get('metric')||'').trim().slice(0,120)};
  await mutate(s=>saveReflection(s,entry));ui.sub='';render();notify('Reflection saved');return;
 }
 if(kind==='experiment'){
  await mutate(s=>{for(const k of ['title','hypothesis','intervention','metric','decisionRule']){const v=String(fd.get(k)||'').trim();if(!v)throw new Error('Complete every field');s.experiment[k]=v.slice(0,500);}s.experiment.durationDays=Number(fd.get('duration'));return s;});ui.sub='';render();notify('Experiment updated');return;
 }
 if(kind==='review'){
  const note=String(fd.get('takeaway')||'').trim();if(!note){notify('Add one takeaway');return;}
  await mutate(s=>{s.reviews.push({date:new Date().toISOString(),note:note.slice(0,1500),decision:ui.decision,systemChange:String(fd.get('systemChange')||'').trim().slice(0,800)});return s;});ui.sub='';ui.view='journey';render();notify('Weekly review saved');return;
 }
 if(kind==='import'){
  const file=fd.get('file');if(!(file instanceof File)||file.size<1){notify('Select a JSON backup');return;}
  if(file.size>1500000){notify('Backup is too large');return;}
  try{const parsed=JSON.parse(await file.text());const next=normalizeState(parsed);if(!confirm('Replace your current Human OS data with this backup?'))return;await mutate(()=>next);ui.sub='';ui.view='today';render();notify('Backup imported');}catch(err){notify(`Import failed: ${err.message}`)}
 }
});
(async()=>{
 try{ui.state=normalizeState(await readData());ui.initialised=true;render();}catch(e){ui.error='STORAGE:'+e.message;ui.initialised=true;render();}
 if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
