export const initialState = () => ({
  onboard: 0,
  goal: '', baseline: '', bottleneck: '',
  experiment: {title: 'Protected learning block', hypothesis: 'A protected session may help me learn more consistently.', intervention: 'Complete one distraction-free 30-minute learning session, four days a week.', metric: 'Useful learning sessions completed per week', decisionRule: 'Keep if adherence improves without increasing strain.', startedAt: new Date().toISOString(), durationDays: 14, status:'active'},
  logs: [], messages: [], reviews: [], suggestions: [],
  focus: '', focusDate: '',
  settings: {dailyReminder: false}
});
const str = (value,max=2000) => typeof value==='string' && value.length<=max;
export function validateState(s){
  if (!s || typeof s!=='object' || Array.isArray(s)) return 'Invalid state';
  if(!Number.isInteger(s.onboard)||s.onboard<0||s.onboard>4) return 'Invalid onboarding step';
  for(const name of ['goal','baseline','bottleneck','focus','focusDate']) if(!str(s[name])) return `Invalid ${name}`;
  const e=s.experiment;
  if(!e||typeof e!=='object'||Array.isArray(e)) return 'Invalid experiment';
  for(const name of ['title','hypothesis','intervention','metric','decisionRule','startedAt','status']) if(!str(e[name])) return `Invalid experiment ${name}`;
  if(!Number.isInteger(e.durationDays)||e.durationDays<7||e.durationDays>30) return 'Invalid experiment duration';
  for(const name of ['logs','messages','reviews','suggestions'])if(!Array.isArray(s[name])||s[name].length>500)return `Invalid ${name}`;
  if(JSON.stringify(s).length>110000) return 'State too large';
  for(const l of s.logs){if(!l||!str(l.date,20)||!['Yes','Some','No'].includes(l.progress)||!Number.isInteger(l.energy)||l.energy<1||l.energy>5||!str(l.note,1200)|| (l.metric!==null&&l.metric!==undefined&&!str(String(l.metric),120)))return 'Invalid check-in';}
  for(const m of s.messages){if(!m||!['me','ai','error'].includes(m.who)||!str(m.text,5000))return 'Invalid conversation';}
  for(const r of s.reviews){if(!r||!str(r.date,40)||!str(r.note,3000)||!str(r.decision||'',30))return 'Invalid weekly review';}
  for(const x of s.suggestions){if(!x||!str(x.id,100)||!str(x.title,100)||!str(x.intervention,1000))return 'Invalid suggestion';}
  return null;
}
export function experimentDay(e,now=new Date()){
  const start=new Date(e.startedAt).getTime();
  if(!Number.isFinite(start))return 1;
  return Math.max(1,Math.min(e.durationDays,Math.floor((now.getTime()-start)/86400000)+1));
}
export const localDate=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
