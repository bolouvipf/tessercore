import "./env.js";
import Fastify from "fastify";
import fs from "node:fs";
import { listManifests, getModule, publishModule, verifyStored } from "./registry.js";
import { resolveT1 } from "./resolver.js";
import { verifyManifest } from "./signer.js";
import { routeWithLLM } from "./router.js";

const app = Fastify({ logger: true });

app.get("/health", async()=>({ ok:true }));

app.get("/registry/modules", async()=>{
  return listManifests();
});

app.get("/registry/modules/:id", async(req, reply)=>{
  const m = getModule(req.params.id);
  if(!m) return reply.code(404).send({code:"NOT_FOUND"});
  return m;
});

app.get("/registry/resolve", async(req)=>{
  const q = String(req.query.q || "");
  const manifests = listManifests();
  const hit = resolveT1(q, manifests);
  if(!hit) return { module_id: null, score: 0 };
  return { module_id: hit.manifest.id, score: hit.score, manifest: hit.manifest };
});

// Publish — expects {manifest, code}; server verifies manifest+sha256 then signs
app.post("/registry/publish", async(req, reply)=>{
  const { manifest, code } = req.body || {};
  if(!manifest || !code) return reply.code(400).send({code:"INVALID_MANIFEST"});
  // basic checks
  if(manifest.permissions?.length) return reply.code(400).send({code:"INVALID_MANIFEST", message:"permissions must be []"});
  // hash check
  const { createHash } = await import("node:crypto");
  const h = createHash("sha256").update(code,"utf8").digest("hex");
  if(manifest.sha256 !== h) return reply.code(400).send({code:"HASH_MISMATCH", expected: h});
  const { sig } = publishModule(manifest, code);
  return { ok:true, id: manifest.id, sig };
});

// Verify endpoint (for kernel to check before install)
app.get("/registry/verify/:id", async(req, reply)=>{
  const r = verifyStored(req.params.id);
  if(!r.ok && r.error==="NOT_FOUND") return reply.code(404).send(r);
  return r;
});

import { generateBoth } from "./generate.js";
import { verifyModule } from "../verify/pipeline.js";

// T3 Generation — contract + 2 impls + verify (Meta models only)
app.post("/generate", async(req, reply)=>{
  const q = String(req.body?.q || "");
  if(!q) return reply.code(400).send({code:"INVALID_INPUT"});
  try{
    const { manifest, implA, implB } = await generateBoth(q);
    const report = await verifyModule({ manifest: {...manifest}, codeA: implA, codeB: implB });
    if(report.verdict !== "VERIFIED"){
      // one repair round: feed back first failing diff to B
      // (minimal: retry B once with error context — omitted for brevity in v1, just report)
    }
    // human confirmation required before publish — for now auto-publish if VERIFIED (demo: UI will ask)
    let published = null;
    if(report.verdict === "VERIFIED"){
      const { createHash } = await import("node:crypto");
      manifest.sha256 = createHash("sha256").update(implA).digest("hex");
      manifest.provenance.verification="VERIFIED";
      const { publishModule } = await import("./registry.js");
      const { sig } = publishModule(manifest, implA);
      published = { id: manifest.id, sig };
    }
    return { manifest, implA, implB, report, published };
  }catch(e){
    return reply.code(502).send({code:e.code||"GENERATION_FAILED", message:String(e.message).slice(0,800)});
  }
});

// T2 Router — Meta Muse model (allowlisted), falls back to T1 if LLM fails
app.post("/resolve/llm", async(req, reply)=>{
  const q = String(req.body?.q || req.query?.q || "");
  if(!q) return reply.code(400).send({code:"INVALID_INPUT"});
  try{
    const r = await routeWithLLM(q);
    return r;
  }catch(e){
    const code = e.code || "LLM_ERROR";
    if(code==="MODEL_NOT_ALLOWED") return reply.code(400).send({code, message:e.message});
    return reply.code(502).send({code, message: String(e.message).slice(0,500)});
  }
});

const port = Number(process.env.PORT || 8787);
app.listen({ port, host:"0.0.0.0" }, (err)=>{
  if(err){ console.error(err); process.exit(1); }
  console.log(`registry on http://localhost:${port}`);
});
