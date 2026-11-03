import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {handleApi} from './lib/handler.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 const uri=new URL(req.url,'http://localhost');
 if(uri.pathname.startsWith('/api/'))return handleApi(req,res);
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
 const f=path.join(ROOT,uri.pathname==='/'?'index.html':uri.pathname);
 if(!f.startsWith(ROOT+path.sep)){res.writeHead(404);res.end();return}
 try{const data=await fs.readFile(f);res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':uri.pathname==='/sw.js'?'no-cache':'public, max-age=300','X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});res.end(req.method==='HEAD'?undefined:data)}catch{res.writeHead(404);res.end('Not found')}
});
if(process.env.RUN_SERVER!=='0')server.listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log(`Human OS on http://localhost:${process.env.PORT||4173}`));
export {server};
