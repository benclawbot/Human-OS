import {rm,mkdir,copyFile,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const dist=new URL('../dist/',import.meta.url);await rm(dist,{recursive:true,force:true});await mkdir(new URL('assets/',dist),{recursive:true});await mkdir(new URL('icons/',dist),{recursive:true});
for(const name of ['index.html','app.js','data.mjs','storage.mjs','styles.css','sw.js','manifest.webmanifest','assets/mountain-dawn.jpg','icons/icon-192.png','icons/icon-512.png'])await copyFile(new URL('../'+name,import.meta.url),new URL(name,dist));
const html=await readFile(new URL('index.html',dist),'utf8');if(!html.includes('app.js'))throw Error('Build missing entry');
console.log('Static PWA build complete: dist/');
