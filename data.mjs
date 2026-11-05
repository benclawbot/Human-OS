export const templates = [
  {id:'focus', title:'Protected focus', hypothesis:'A distraction-free block may improve meaningful progress.', intervention:'Protect one 30-minute session, four days a week.', metric:'Focused sessions completed each week', decisionRule:'Keep if the sessions help without increasing strain.'},
  {id:'practice', title:'Active practice', hypothesis:'Retrieval practice may improve what I remember.', intervention:'Spend 10 minutes recalling key ideas without looking at notes after each learning session.', metric:'Correct answers on a short delayed recall check', decisionRule:'Keep if later recall improves for similar material.'},
  {id:'recover', title:'Recovery window', hypothesis:'A consistent wind-down routine may improve my next-day energy.', intervention:'Reserve the final 30 minutes before bedtime for a low-stimulation routine.', metric:'Daily self-rated energy and ease of starting work', decisionRule:'Keep if energy improves without creating new friction.'},
  {id:'decision', title:'Decision reflection', hypothesis:'Writing down predictions may improve decision calibration.', intervention:'Record one consequential prediction with a probability and revisit the outcome.', metric:'Predictions reviewed with actual outcomes', decisionRule:'Keep if the record helps me identify correctable assumptions.'},
];
export const today = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function newExperiment(base = templates[0]) {return {...base, id:`exp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, startedAt:new Date().toISOString(),durationDays:14,status:'active'};}
export function initialState(){return {version:4,onboard:0,goal:'',baseline:'',bottleneck:'',experiment:newExperiment(),history:[],logs:[],reviews:[],focus:'',focusDate:''};}
const text = (v,max=3000) => typeof v==='string' ? v.slice(0,max) : '';
export function validateState(s){
  if(!s||typeof s!=='object'||Array.isArray(s)) throw new Error('Invalid backup data');
  if(!Number.isInteger(s.onboard)||s.onboard<0||s.onboard>4) throw new Error('Invalid setup data');
  for (const key of ['goal','baseline','bottleneck','focus','focusDate']) if(typeof s[key]!=='string') throw new Error(`Invalid ${key}`);
  const e=s.experiment;if(!e||typeof e!=='object')throw new Error('Experiment missing');
  for(const key of ['title','hypothesis','intervention','metric','decisionRule','startedAt'])if(typeof e[key]!=='string')throw new Error('Invalid experiment');
  if(!Number.isInteger(e.durationDays)||e.durationDays<7||e.durationDays>30)throw new Error('Invalid experiment duration');
  if(!Array.isArray(s.logs)||s.logs.length>1500||!Array.isArray(s.reviews)||s.reviews.length>300||!Array.isArray(s.history)||s.history.length>150)throw new Error('Invalid history');
  for(const entry of s.logs)if(!entry||typeof entry.date!=='string'||!['Yes','Some','No'].includes(entry.progress)||!Number.isInteger(entry.energy)||entry.energy<1||entry.energy>5||typeof entry.note!=='string')throw new Error('Invalid reflection');
  if(JSON.stringify(s).length>1500000)throw new Error('Backup exceeds size limit');
  return true;
}
export function normalizeState(raw){
  const base=initialState();
  if(!raw)return base;
  const src=(raw.state&&typeof raw.state==='object')?raw.state:raw;
  const obj={...base, ...src, version:4,history:Array.isArray(src.history)?src.history:[],logs:Array.isArray(src.logs)?src.logs:[],reviews:Array.isArray(src.reviews)?src.reviews:[]};
  obj.experiment={...base.experiment,...(src.experiment||{})};
  if(!Number.isInteger(obj.experiment.durationDays))obj.experiment.durationDays=14;
  // The older cloud export included AI conversations; these are intentionally discarded.
  delete obj.messages;delete obj.suggestions;delete obj.settings;
  validateState(obj);return obj;
}
export function experimentDay(e,when=new Date()){const a=new Date(e.startedAt).getTime();if(!Number.isFinite(a))return 1;return Math.max(1,Math.min(e.durationDays,Math.floor((when.getTime()-a)/86400000)+1));}
export function weekStats(state,when=new Date()){
  const midnight=new Date(when.getFullYear(),when.getMonth(),when.getDate());
  const since=new Date(midnight);since.setDate(since.getDate()-6);
  const logs=state.logs.filter(l=>{const d=new Date(`${l.date}T12:00:00`);return d>=since&&d<new Date(midnight.getTime()+86400000)});
  return {checkins:logs.length,meaningful:logs.filter(l=>l.progress==='Yes').length,averageEnergy:logs.length?Math.round(logs.reduce((sum,l)=>sum+l.energy,0)/logs.length*10)/10:null};
}
export function saveReflection(state, entry){
  const next={...state,logs:[...state.logs.filter(l=>l.date!==entry.date),entry].sort((a,b)=>a.date.localeCompare(b.date))};
  validateState(next);return next;
}
export function startExperiment(state,entry){
  const next={...state,history:[...state.history,{...state.experiment,closedAt:new Date().toISOString()}],experiment:newExperiment(entry)};
  validateState(next);return next;
}
