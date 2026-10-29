export function validateManifest(manifest, { checkHash, codeText } = {}) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") return { ok:false, errors:[{code:"INVALID_MANIFEST", message:"not an object"}] };
  const required = ["id","version","title","description","language","intents","inputs","outputs","permissions","limits","examples","properties","tolerance","view","assumptions","provenance","sha256"];
  for (const k of required) if (!(k in manifest)) errors.push({code:"INVALID_MANIFEST", message:`missing ${k}`});
  if (manifest.permissions && manifest.permissions.length !== 0) errors.push({code:"INVALID_MANIFEST", message:"permissions must be [] in v1"});
  if (!Array.isArray(manifest.examples) || manifest.examples.length < 2) errors.push({code:"INVALID_MANIFEST", message:"examples >=2 required"});
  if (manifest.sha256 && !/^[a-f0-9]{64}$/.test(manifest.sha256)) errors.push({code:"INVALID_MANIFEST", message:"sha256 malformed"});
  if (codeText != null && codeText.length > 4096) errors.push({code:"INVALID_MANIFEST", message:"main.js > 4KB"});
  if (manifest.id && !/^[a-z0-9_]+$/.test(manifest.id)) errors.push({code:"INVALID_MANIFEST", message:"id pattern"});
  if (checkHash && codeText != null && manifest.sha256) {
    if (checkHash !== manifest.sha256) errors.push({code:"HASH_MISMATCH", message:`sha256 mismatch expected ${manifest.sha256} got ${checkHash}`});
  }
  return { ok: errors.length===0, errors };
}
