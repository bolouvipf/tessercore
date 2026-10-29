import fs from "node:fs";
import path from "node:path";
import { canonical, signManifest, verifyManifest } from "./signer.js";

const DIR = process.env.REGISTRY_DIR || "./server/data";

export function ensureDir(){
  fs.mkdirSync(DIR, {recursive:true});
}

function modDir(id){ return path.join(DIR, id); }

export function listManifests(){
  ensureDir();
  const ids = fs.readdirSync(DIR, {withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
  return ids.map(id=>{
    try{ return JSON.parse(fs.readFileSync(path.join(modDir(id),"manifest.json"),"utf8")); }catch{ return null; }
  }).filter(Boolean);
}

export function getModule(id){
  const dir = modDir(id);
  if (!fs.existsSync(dir)) return null;
  const manifest = JSON.parse(fs.readFileSync(path.join(dir,"manifest.json"),"utf8"));
  const code = fs.readFileSync(path.join(dir,"main.js"),"utf8");
  const sig = fs.readFileSync(path.join(dir,"manifest.sig"),"utf8").trim();
  return { manifest, code, sig };
}

export function publishModule(manifest, code){
  ensureDir();
  // verify sha256 already in manifest
  const dir = modDir(manifest.id);
  fs.mkdirSync(dir, {recursive:true});
  fs.writeFileSync(path.join(dir,"manifest.json"), JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(dir,"main.js"), code);
  const sig = signManifest(manifest);
  fs.writeFileSync(path.join(dir,"manifest.sig"), sig);
  return { sig, canonical: canonical(manifest) };
}

export function verifyStored(id){
  const m = getModule(id);
  if (!m) return { ok:false, error:"NOT_FOUND"};
  // hash check omitted (caller does)
  const ok = verifyManifest(m.manifest, m.sig);
  return { ok, error: ok? null : "SIGNATURE_INVALID" };
}
