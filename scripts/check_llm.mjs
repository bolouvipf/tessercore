#!/usr/bin/env node
// Minimal check: sends one trivial prompt to each configured Meta model via the server gateway.
// Reads .env, enforces MODEL_ALLOWLIST, prints model id + latency. Does NOT hard-code model names.
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const p = path.resolve(".env");
  if (!fs.existsSync(p)) { console.error("Missing .env — copy .env.example"); process.exit(1); }
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnv();

const allow = (process.env.MODEL_ALLOWLIST || "").split(",").map(s=>s.trim()).filter(Boolean);
function assertAllowed(id){ if(allow.length && !allow.includes(id)) throw new Error(`Model ${id} not in MODEL_ALLOWLIST (${allow.join(", ")})`); }

async function checkOne(label, model) {
  if (!model) { console.log(`${label}: (not configured, skip)`); return; }
  try { assertAllowed(model); } catch(e){ console.error(`${label}: ${e.message}`); return; }
  const base = (process.env.LLM_BASE_URL || "").replace(/\/+$/,"");
  const key = process.env.LLM_API_KEY || "";
  if (!base || !key) { console.error(`${label}: missing LLM_BASE_URL or LLM_API_KEY`); return; }
  const url = `${base}/chat/completions`;
  const body = JSON.stringify({ model, messages: [{role:"user", content:"Reply with JSON only: {\"ok\": true}"}], max_tokens: 6000, temperature: 0 });
  const t0 = performance.now();
  const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${key}` }, body });
  const dt = (performance.now()-t0).toFixed(0);
  const text = await res.text();
  console.log(`${label} model=${model} status=${res.status} latency_ms=${dt}`);
  console.log(text.slice(0, 400));
}

await checkOne("ROUTER", process.env.LLM_MODEL_ROUTER);
await checkOne("GEN_A", process.env.LLM_MODEL_GEN_A);
await checkOne("GEN_B", process.env.LLM_MODEL_GEN_B);
