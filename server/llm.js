import "./env.js";

// Single place that calls a Meta model — enforces MODEL_ALLOWLIST
const cache = new Map(); // hash(stage,model,prompt) -> response

function allowlist(){ return (process.env.MODEL_ALLOWLIST||"").split(",").map(s=>s.trim()).filter(Boolean); }
export function assertAllowed(model){
  const list = allowlist();
  if(list.length && !list.includes(model)) throw Object.assign(new Error(`Model ${model} not in MODEL_ALLOWLIST`), {code:"MODEL_NOT_ALLOWED"});
}

function hashKey(stage, model, prompt){
  // simple hash: stage|model|prompt length + prefix
  let h=0; for(let i=0;i<prompt.length;i++) h=(h*31+prompt.charCodeAt(i))>>>0;
  return `${stage}|${model}|${h}|${prompt.length}`;
}

export async function callLLM({ stage, model, prompt, max_tokens=6000, temperature=0.1 }) {
  assertAllowed(model);
  const key = hashKey(stage, model, prompt);
  if(cache.has(key)) return cache.get(key);

  const base = (process.env.LLM_BASE_URL||"").replace(/\/+$/,"");
  const apiKey = process.env.LLM_API_KEY||"";
  if(!base || !apiKey) throw new Error("LLM_BASE_URL / LLM_API_KEY missing");
  const url = `${base}/chat/completions`;

  const body = JSON.stringify({
    model,
    messages: [{role:"user", content: prompt}],
    max_tokens,
    temperature,
  });

  let lastErr;
  for(let attempt=0; attempt<3; attempt++){
    const t0 = performance.now();
    const res = await fetch(url, {method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${apiKey}`}, body});
    const text = await res.text();
    const latency = performance.now()-t0;
    console.log(`[llm] stage=${stage} model=${model} attempt=${attempt} status=${res.status} latency=${latency.toFixed(0)}ms`);
    if(!res.ok){ lastErr = new Error(`LLM ${res.status}: ${text.slice(0,500)}`); continue; }
    let json;
    try{ json = JSON.parse(text); }catch(e){ lastErr=e; continue; }
    // Muse "reasoning" model: content may be null, reasoning_content holds text
    const msg = json.choices?.[0]?.message;
    let content = msg?.content;
    if(content == null) content = msg?.reasoning_content || "";
    const result = { raw: json, content: String(content||""), usage: json.usage, latency_ms: latency, model };
    cache.set(key, result);
    return result;
  }
  throw lastErr || new Error("LLM failed after retries");
}

export function extractJSON(content){
  // strip markdown fences if present, extract first { ... }
  let s = String(content).trim();
  s = s.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if(a!==-1 && b!==-1) s = s.slice(a, b+1);
  return JSON.parse(s);
}
