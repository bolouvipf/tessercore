import fs from "node:fs";
import { callLLM, extractJSON } from "./llm.js";
import { listManifests } from "./registry.js";

const TEMPLATE = fs.readFileSync(new URL("./prompts/router.txt", import.meta.url), "utf8");

function buildPrompt(query, manifests){
  const mods = manifests.map(m=> `- ${m.id}: ${m.title} — ${m.description} | intents: ${(m.intents||[]).join(", ")} | inputs: ${JSON.stringify(m.inputs.properties)}`).join("\n").slice(0, 4000);
  return TEMPLATE.replace("{{MODULES}}", mods).replace("{{QUERY}}", query);
}

export async function routeWithLLM(query){
  const manifests = listManifests();
  // top-K from T1 scoring already truncated in manifests (keep all 4 in v1)
  const prompt = buildPrompt(query, manifests.slice(0, 20));
  const model = process.env.LLM_MODEL_ROUTER || process.env.LLM_MODEL_GEN_A;
  const { content } = await callLLM({ stage:"router", model, prompt, max_tokens:6000, temperature:0.1 });
  let parsed;
  try{ parsed = extractJSON(content); }catch(e){ return { module_id:null, args:{}, confidence:0, error:"INVALID_JSON", raw: content.slice(0,500) }; }
  // validate confidence threshold
  if(parsed.confidence != null && parsed.confidence < 0.6) parsed.module_id = null;
  // validate module_id exists
  if(parsed.module_id && !manifests.find(m=>m.id===parsed.module_id)) parsed.module_id = null;
  return parsed;
}
