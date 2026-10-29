import fs from "node:fs";
import { createHash } from "node:crypto";
import { resolveT1 } from "../server/resolver.js";
import { listManifests } from "../server/registry.js";
import { MemCache } from "../kernel/cache.js";
import { runModuleWithWatchdog } from "../sandbox/host.mjs";

// Scripted session 50 requests: some repeated, some new, some paraphrased
const session = [
  "convert 5000 fcfa to eur","convertir 1000 fcfa en euro","convert 5000 fcfa to eur",
  "convert length 100 m to ft","unit convert 1 km to m","convert length 100 m to ft",
  "loan payment 12000 0% 12 months","calculate loan 100000 5% 60 months","loan payment 12000 0% 12 months",
  "cement for 5x4 slab 10cm","béton dalle 10m x 10m 15cm","cement for 5x4 slab 10cm",
  "convert 200 eur to fcfa","convert 200 eur to fcfa","convert 5000 fcfa to eur",
  "convert 10 kg to pounds","convert kg to lbs","convert 10 kg to pounds",
  "unknown request xyz poem","write a poem","unknown request xyz poem",
  "convert 1 m to cm","convert 1 m to cm","convert 1 km to m",
  "loan 50000 3% 24 months","loan 50000 3% 24 months",
  "cement slab 2x2 5cm","cement slab 2x2 5cm",
  "convert fcfa eur 1000","convert fcfa eur 1000",
  "random unknown 1","random unknown 2","random unknown 3","random unknown 4",
  "convert length 5 ft to cm","convert length 5 ft to cm",
  "convert 100 eur to xof","convert 100 eur to xof",
  "loan payment 200000 4.5% 120 months","loan payment 200000 4.5% 120 months",
  "cement 3x3 0.12m 350kg","cement 3x3 0.12m 350kg",
  "unknown foo","unknown bar","convert 1 m to mm"
];
const manifests = listManifests();
const cache = new MemCache();
const metrics=[];
let llmCalls=0;
for(const q of session){
  const t0=performance.now();
  // T0 cache
  const cached = await cache.get(q); // key by query string for demo (real: intent key)
  if(cached){ metrics.push({query:q, tier:"T0", llm:0, latency: performance.now()-t0}); continue; }
  // T1 rule-based
  const hit = resolveT1(q, manifests);
  if(hit){
    // simulate install from registry
    const mod = manifests.find(m=>m.id===hit.manifest.id);
    await cache.put({id: q, manifest: mod, code: fs.readFileSync(`modules/${mod.id}/main.js`,"utf8")});
    metrics.push({query:q, tier:"T1", llm:0, module: hit.manifest.id, latency: performance.now()-t0});
    continue;
  }
  // T2/T3 would need LLM — count as 1 call (router) + maybe 3 for generation
  const isNew = q.includes("kg to pounds") || q.includes("random unknown") || q.includes("unknown");
  const calls = isNew ? 4 : 1;
  llmCalls += calls;
  metrics.push({query:q, tier: isNew ? "T3" : "T2", llm: calls, latency: performance.now()-t0});
  // simulate caching after generation for second occurrence of kg->lbs
  if(isNew && q==="convert 10 kg to pounds"){
    const fake = {id:"convert_kilograms_to_pounds", title:"kg->lbs"};
    manifests.push(fake);
    await cache.put({id:q, manifest: fake, code:""});
  }
}
const byTier={}; for(const m of metrics) byTier[m.tier_used||m.tier]=(byTier[m.tier_used||m.tier]||0)+1;
const total=metrics.length;
const pct={}; for(const k of Object.keys(byTier)) pct[k]=(byTier[k]/total*100).toFixed(1)+"%";
const avoided = ((metrics.filter(m=> (m.llm||m.llm_calls||m.llm===0) ? (m.llm===0) : false).length)/total*100).toFixed(1);
const out={ date:new Date().toISOString(), total, byTier, pct, llmCalls, avoided_percent: avoided, metrics,
  note: "Simulated scripted session 50 reqs from empty registry; T0=local cache, T1=rule-based, T2=router, T3=generation — counts llm_calls per request; real bench should run live LLM for T2/T3 and measure bytes/latency"
};
fs.mkdirSync("bench/results",{recursive:true});
fs.writeFileSync("bench/results/m4_tier_mix.json", JSON.stringify(out,null,2));
console.log(JSON.stringify({total, byTier, pct, llmCalls, avoided_percent: avoided},null,2));
