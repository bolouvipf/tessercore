import fs from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
function gzKB(file){ const buf=fs.readFileSync(file); return (gzipSync(buf).length/1024).toFixed(2); }
function fileKB(file){ return (fs.statSync(file).size/1024).toFixed(2); }
const kernelFiles = ["kernel/hash.js","kernel/manifest.js","kernel/views.js","kernel/loader.js","kernel/cache.js","kernel/metrics.js","kernel/resolver.js"];
let totalRaw=0, totalGz=0;
const details={};
for(const f of kernelFiles){ if(!fs.existsSync(f)) continue; const raw=fs.statSync(f).size; const gz=gzipSync(fs.readFileSync(f)).length; totalRaw+=raw; totalGz+=gz; details[f]={ raw_kb:(raw/1024).toFixed(2), gz_kb:(gz/1024).toFixed(2)}; }
const quickjs = fs.existsSync("node_modules/quickjs-emscripten/dist/index.js") ? fileKB("node_modules/quickjs-emscripten/dist/index.js") : "n/a";
const wasm = (()=>{ try{ const p="node_modules/quickjs-emscripten"; const files=fs.readdirSync(p,{recursive:true}); let s=0; for(const f of files) if(String(f).endsWith(".wasm")) s+=fs.statSync(path.join(p,String(f))).size; return (s/1024).toFixed(2);}catch{return "n/a"; }})();
const modules=[];
for(const id of ["fcfa_eur_convert","unit_convert","loan_payment","cement_slab"]){
  const mf=fs.statSync(`modules/${id}/manifest.json`).size;
  const code=fs.statSync(`modules/${id}/main.js`).size;
  modules.push({id, manifest_kb:(mf/1024).toFixed(2), main_kb:(code/1024).toFixed(2), total_kb:((mf+code)/1024).toFixed(2)});
}
const out={
  date: new Date().toISOString(),
  device: `Node ${process.version} ${process.platform} ${process.arch}`,
  kernel: { files: details, total_raw_kb:(totalRaw/1024).toFixed(2), total_gz_kb:(totalGz/1024).toFixed(2) },
  engine: { quickjs_js_kb: quickjs, wasm_kb: wasm, note: "engine lazy-loaded, cached separately; kernel gz excludes engine" },
  modules,
  limits_note: "kernel gz target <=30KB (excl. engine); engine size must be reported honestly (see M1)"
};
fs.mkdirSync("bench/results",{recursive:true});
fs.writeFileSync("bench/results/m1_sizes.json", JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
