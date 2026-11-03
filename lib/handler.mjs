import {configured,isAuthed,secureEq,createSession,cookie,sameOrigin} from './auth.mjs';
import {loadState,persistState,StateConflict} from './storage.mjs';
import {generateCoaching} from './ai.mjs';
const rateMap=new Map();
function rate(ip,action,limit,windowMs){const key=`${ip}:${action}`,now=Date.now();let x=rateMap.get(key);if(!x||x.until<now)x={count:0,until:now+windowMs};x.count++;rateMap.set(key,x);return x.count<=limit}
const send=(res,status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers});res.end(JSON.stringify(body))};
async function body(req){let chunks=[],count=0;for await(const x of req){count+=x.length;if(count>125000)throw Object.assign(new Error('Request too large'),{status:413});chunks.push(x)}try{return JSON.parse(Buffer.concat(chunks).toString('utf-8'))}catch{throw Object.assign(new Error('Invalid JSON'),{status:400})}}
export async function handleApi(req,res){try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/health'&&req.method==='GET')return send(res,200,{status:'ok',configured:configured(),aiConfigured:!!process.env.OPENAI_API_KEY,storage:process.env.VERCEL?'private-blob':'sqlite'});
 if(!configured())return send(res,503,{error:'Server setup is incomplete. Set APP_PASSWORD and SESSION_SECRET.'});
 if(['POST','PUT','PATCH','DELETE'].includes(req.method)&&!sameOrigin(req))return send(res,403,{error:'Origin not allowed'});
 const ip=req.headers['x-real-ip']||req.socket?.remoteAddress||'local';
 if(path==='/api/login'&&req.method==='POST'){
  if(!rate(ip,'login',8,15*60000))return send(res,429,{error:'Too many login attempts. Try again later.'});
  const payload=await body(req);if(!secureEq(payload.password||'',process.env.APP_PASSWORD))return send(res,401,{error:'Incorrect passphrase'});
  return send(res,200,{ok:true},{'Set-Cookie':cookie(createSession())});
 }
 if(!isAuthed(req))return send(res,401,{error:'Sign in required'});
 if(path==='/api/logout'&&req.method==='POST')return send(res,200,{ok:true},{'Set-Cookie':cookie('',true)});
 if(path==='/api/state'&&req.method==='GET'){const data=await loadState();return send(res,200,{...data,aiConfigured:!!process.env.OPENAI_API_KEY});}
 if(path==='/api/state'&&req.method==='PUT'){
  const b=await body(req);if(typeof b.revision!=='string')return send(res,400,{error:'Missing revision'});
  const revision=await persistState(b.state,b.revision);return send(res,200,{revision});
 }
 if(path==='/api/coach'&&req.method==='POST'){
  if(!rate(ip,'coach',35,60*60000))return send(res,429,{error:'Too many coaching requests. Try again later.'});
  const b=await body(req),mode=['chat','recommend','review'].includes(b.mode)?b.mode:'chat';
  if(typeof b.message!=='string'||b.message.length>2500||!b.message.trim())return send(res,400,{error:'Enter a message (up to 2500 characters).'});
  const {state}=await loadState();const answer=await generateCoaching({mode,message:b.message,state});return send(res,200,answer);
 }
 return send(res,404,{error:'Not found'});
 }catch(e){const status=e instanceof StateConflict?409:e instanceof TypeError?400:e.status||500;console.error('API error:',e.name, e.message);send(res,status,{error:status>=500&&status!==503&&status!==504?'A server error occurred. Try again.':e.message})}}
