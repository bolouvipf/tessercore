// T0 local cache — IndexedDB in browser, in-memory fallback for Node/tests
const DB_NAME = "tessercore";
const STORE = "modules";

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

class IDBCache {
  async put(mod) { const db=await openDB(); return new Promise((res,rej)=>{ const tx=db.transaction(STORE,"readwrite"); tx.objectStore(STORE).put(mod); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
  async get(id) { const db=await openDB(); return new Promise((res,rej)=>{ const tx=db.transaction(STORE,"readonly"); const rq=tx.objectStore(STORE).get(id); rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error); }); }
  async list() { const db=await openDB(); return new Promise((res,rej)=>{ const tx=db.transaction(STORE,"readonly"); const rq=tx.objectStore(STORE).getAll(); rq.onsuccess=()=>res(rq.result||[]); rq.onerror=()=>rej(rq.error); }); }
  async clear(){ const db=await openDB(); return new Promise((res,rej)=>{ const tx=db.transaction(STORE,"readwrite"); tx.objectStore(STORE).clear(); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
}

class MemCache {
  constructor(){ this.m=new Map(); }
  async put(mod){ this.m.set(mod.id, mod); }
  async get(id){ return this.m.get(id)||null; }
  async list(){ return [...this.m.values()]; }
  async clear(){ this.m.clear(); }
}

export function createCache() {
  if (typeof indexedDB !== "undefined") return new IDBCache();
  return new MemCache();
}
// For tests, export MemCache directly
export { MemCache, IDBCache };
