// Instrument per-request metrics: tier_used, llm_calls, bytes_down, latency_ms
export const metrics = [];
export function record({ tier, llm_calls=0, bytes_down=0, latency_ms=0, query, module_id }){
  metrics.push({ ts: Date.now(), tier_used: tier, llm_calls, bytes_down, latency_ms, query, module_id });
}
export function tierMix(){
  const n = metrics.length || 1;
  const byTier = {};
  let totalLLM=0;
  for(const m of metrics){ byTier[m.tier_used]=(byTier[m.tier_used]||0)+1; totalLLM+=m.llm_calls; }
  const pct = {}; for(const k of Object.keys(byTier)) pct[k]= (byTier[k]/n*100).toFixed(1)+"%";
  return { total: n, byTier, pct, totalLLM, avoided: ((n - totalLLM)/n*100).toFixed(1)+"%" };
}
export function toJSON(){ return { generated_at: new Date().toISOString(), metrics, mix: tierMix() }; }
