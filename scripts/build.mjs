import {mkdir,cp,rm} from 'node:fs/promises';
const root=new URL('../',import.meta.url);const dist=new URL('dist/',root);
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const path of ['index.html','manifest.webmanifest','sw.js','src','icons','data'])await cp(new URL(path,root),new URL(path,dist),{recursive:true});
console.log('Built dist/ — ready for static HTTPS hosting.');
