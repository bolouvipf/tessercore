import fs from "node:fs";
import { callLLM, extractJSON } from "./llm.js";

const CONTRACT_TMPL = fs.readFileSync(new URL("./prompts/contract.txt", import.meta.url), "utf8");
const IMPL_A_TMPL = fs.readFileSync(new URL("./prompts/implement_a.txt", import.meta.url), "utf8");
const IMPL_B_TMPL = fs.readFileSync(new URL("./prompts/implement_b.txt", import.meta.url), "utf8");

function detectLang(q){ return /[àâéèêëîïôùûüç]/i.test(q) || /\b(convertir|béton|ciment|mensualité)\b/i.test(q) ? "fr" : "en"; }

export async function generateContract(query){
  const lang = detectLang(query);
  const prompt = CONTRACT_TMPL.replace("{{QUERY}}", query).replace("{{LANG}}", lang);
  const model = process.env.LLM_MODEL_GEN_A || process.env.LLM_MODEL_ROUTER;
  const { content } = await callLLM({ stage:"contract", model, prompt, max_tokens:6000, temperature:0.2 });
  const manifest = extractJSON(content);
  // light validation
  if(!manifest.id || manifest.permissions?.length) throw new Error("invalid contract: permissions or id");
  if(!manifest.examples || manifest.examples.length < 2) throw new Error("contract needs >=2 examples");
  if(!manifest.properties || manifest.properties.length < 1) throw new Error("contract needs >=1 property");
  if(!manifest.sha256) manifest.sha256 = "";
  if(!manifest.provenance) manifest.provenance = { origin:"generated", model, created_at: new Date().toISOString(), verification:"UNVERIFIED" };
  else { manifest.provenance.origin="generated"; manifest.provenance.model=model; manifest.provenance.created_at=new Date().toISOString(); }
  manifest.language = lang;
  return manifest;
}

export async function generateImpl(manifest, variant="A"){
  const tmpl = variant==="B" ? IMPL_B_TMPL : IMPL_A_TMPL;
  const prompt = tmpl.replace("{{MANIFEST}}", JSON.stringify(manifest,null,2));
  const model = variant==="B" ? (process.env.LLM_MODEL_GEN_B || process.env.LLM_MODEL_GEN_A) : (process.env.LLM_MODEL_GEN_A);
  const temp = variant==="B" ? 0.7 : 0.2;
  const { content } = await callLLM({ stage:`impl_${variant}`, model, prompt, max_tokens:6000, temperature: temp });
  // strip fences if any
  let code = String(content).trim().replace(/^```(?:js|javascript)?\s*/i,"").replace(/\s*```$/,"").trim();
  if(code.length > 4096) throw new Error("main.js >4KB");
  return { code, model, variant };
}

export async function generateBoth(query){
  const manifest = await generateContract(query);
  const [a,b] = await Promise.all([generateImpl(manifest,"A"), generateImpl(manifest,"B")]);
  return { manifest, implA: a.code, implB: b.code, metaA: a, metaB: b };
}
