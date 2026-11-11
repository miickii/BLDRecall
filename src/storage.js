let db;
export async function openStore(){
  db=await new Promise((resolve,reject)=>{const request=indexedDB.open('bld-recall',1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
}
export function load(){return new Promise((resolve,reject)=>{const request=db.transaction('state').objectStore('state').get('current');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export function save(state){return new Promise((resolve,reject)=>{const transaction=db.transaction('state','readwrite');transaction.objectStore('state').put(state,'current');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);});}
