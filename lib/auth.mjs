import crypto from 'node:crypto';
const b64=data=>Buffer.from(JSON.stringify(data)).toString('base64url');
const secret=()=>process.env.SESSION_SECRET||'';
const mac=payload=>crypto.createHmac('sha256',secret()).update(payload).digest('base64url');
export const configured=()=>Boolean((process.env.APP_PASSWORD||'').length>=12&&secret().length>=32);
export function secureEq(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
export function createSession(){const body=b64({exp:Date.now()+7*86400000,nonce:crypto.randomBytes(12).toString('hex')});return `${body}.${mac(body)}`;}
export function isAuthed(req){if(!configured())return false;const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('human_session='))?.slice(14);
  if(!token)return false;const [body,sig]=token.split('.');if(!body||!sig||!secureEq(mac(body),sig))return false;
  try{return JSON.parse(Buffer.from(body,'base64url')).exp>Date.now()}catch{return false}
}
export function cookie(token,expire=false){const flags=['HttpOnly','SameSite=Strict','Path=/'];if(process.env.VERCEL||process.env.NODE_ENV==='production')flags.push('Secure');flags.push(`Max-Age=${expire?0:604800}`);return `human_session=${token}; ${flags.join('; ')}`;}
export function sameOrigin(req){const origin=req.headers.origin;if(!origin)return true;const host=req.headers['x-forwarded-host']||req.headers.host;const protocol=req.headers['x-forwarded-proto']||(process.env.VERCEL?'https':'http');try{const u=new URL(origin);return u.host===host&&u.protocol===`${protocol}:`}catch{return false}}
