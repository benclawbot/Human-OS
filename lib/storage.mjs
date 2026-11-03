import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initialState,validateState} from './model.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let sqlite;
async function localDb(){
  if(!sqlite){
    const {DatabaseSync}=await import('node:sqlite');
    sqlite=new DatabaseSync(process.env.DB_PATH||path.join(root,'human-os.sqlite'));
    sqlite.exec('CREATE TABLE IF NOT EXISTS human_state (id INTEGER PRIMARY KEY CHECK (id=1), revision INTEGER NOT NULL, payload TEXT NOT NULL)');
  }
  return sqlite;
}
const cloud=()=>Boolean(process.env.VERCEL||process.env.STORAGE_BACKEND==='blob');
const key='human-os/private/state.json';

export async function loadState(){
  if(!cloud()){
    const db=await localDb();
    const row=db.prepare('SELECT revision,payload FROM human_state WHERE id=1').get();
    return row?{state:JSON.parse(row.payload),revision:String(row.revision)}:{state:initialState(),revision:'0'};
  }
  const {get,head}=await import('@vercel/blob');
  const blob=await get(key,{access:'private'});
  if(!blob)return {state:initialState(),revision:'0'};
  const metadata=await head(key);
  const state=JSON.parse(await new Response(blob.stream).text());
  return {state,revision:metadata.etag};
}

export class StateConflict extends Error{constructor(){super('Your data changed on another device. Reload to avoid overwriting it.');this.name='StateConflict'}}
export async function persistState(state,revision){
  const invalid=validateState(state);if(invalid)throw new TypeError(invalid);
  if(!cloud()){
    const db=await localDb();const current=db.prepare('SELECT revision FROM human_state WHERE id=1').get();
    const currentVersion=String(current?.revision||0);
    if(currentVersion!==revision)throw new StateConflict();
    const next=Number(currentVersion)+1;
    if(current)db.prepare('UPDATE human_state SET revision=?, payload=? WHERE id=1 AND revision=?').run(next,JSON.stringify(state),current.revision);
    else db.prepare('INSERT INTO human_state(id,revision,payload) VALUES(1,?,?)').run(next,JSON.stringify(state));
    return String(next);
  }
  const {put, BlobPreconditionFailedError}=await import('@vercel/blob');
  try{
    const opts={access:'private',contentType:'application/json',cacheControlMaxAge:60};
    if(revision==='0')opts.allowOverwrite=false;
    else {opts.allowOverwrite=true;opts.ifMatch=revision}
    const result=await put(key,JSON.stringify(state),opts);
    return result.etag;
  }catch(err){
    if(err instanceof BlobPreconditionFailedError||/already exists|precondition|conflict/i.test(err.message))throw new StateConflict();
    throw err;
  }
}
