const V='mesh-v1',SHELL=['./','index.html','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!=='mesh-cdn').map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('mesh-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('f',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const rq=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
async function share(req){
 let n=0;
 try{
  const files=(await req.formData()).getAll('files').filter(f=>f&&typeof f!=='string');
  const db=await idb(),t=db.transaction('f','readwrite'),s=t.objectStore('f');
  const done=new Promise((ok,no)=>{t.oncomplete=ok;t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)});
  const all=await rq(s.getAll());
  for(const f of files){
   const name=f.name||('файл-'+Date.now());
   if(all.some(i=>i.name===name&&i.size===f.size))continue;
   await rq(s.add({name,size:f.size,added:Date.now(),text:'',subject:'Другое',pending:1,blob:f}));n++}
  await done;
 }catch(e){}
 return Response.redirect('./?shared='+n,303);
}
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method==='POST'&&u.origin===location.origin&&u.pathname.endsWith('/share')){e.respondWith(share(r));return}
 if(r.method!=='GET')return;
 if(u.origin===location.origin)e.respondWith(fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(V).then(h=>h.put(r,c))}return x}).catch(()=>caches.match(r,{ignoreSearch:true})));
 else if(u.hostname==='cdnjs.cloudflare.com')e.respondWith(caches.open('mesh-cdn').then(async h=>{const m=await h.match(r);if(m)return m;const x=await fetch(r);if(x.ok||x.type==='opaque')h.put(r,x.clone());return x}));
});
