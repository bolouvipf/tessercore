import fs from "node:fs";
import { runModuleWithWatchdog } from "../sandbox/host.mjs";
const code = fs.readFileSync("modules/fcfa_eur_convert/main.js","utf8");
const input = {amount: 5000, direction:"XOF_TO_EUR"};
// Plain Worker (plain JS) — direct run without QuickJS
function plainRun(code, input){
  const fn = new Function("input", code + "\nreturn run(input);");
  return fn(input);
}
const N=1000;
let t0=performance.now();
for(let i=0;i<N;i++) plainRun(code, input);
const plainMs = performance.now()-t0;
t0=performance.now();
for(let i=0;i<N;i++) await runModuleWithWatchdog(code, input, {timeout_ms:200});
const wasmMs = performance.now()-t0;
const out={
  date: new Date().toISOString(),
  device: `Node ${process.version}`,
  N,
  plain_total_ms: plainMs.toFixed(2),
  plain_per_call_ms: (plainMs/N).toFixed(4),
  wasm_total_ms: wasmMs.toFixed(2),
  wasm_per_call_ms: (wasmMs/N).toFixed(4),
  ratio_wasm_over_plain: (wasmMs/plainMs).toFixed(2),
  isolation: "WASM: QuickJS inside WASM inside Worker — no DOM/fetch/globals; Plain: Worker only — globals still present, weaker isolation",
  note: "Plain is faster (expected); WASM cost is engine size + startup but stronger isolation + uniform engine"
};
fs.writeFileSync("bench/results/m7_wasm_vs_plain.json", JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
