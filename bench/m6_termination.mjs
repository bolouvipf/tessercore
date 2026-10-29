import fs from "node:fs";
import { runModuleWithWatchdog } from "../sandbox/host.mjs";
const evilLoop = fs.readFileSync("modules/_evil/evil_loop.js","utf8");
const evilMem = fs.readFileSync("modules/_evil/evil_mem.js","utf8");
async function bench(name, code, limits){
  const t0=performance.now();
  const r=await runModuleWithWatchdog(code, {}, limits);
  const dt=performance.now()-t0;
  return { name, ...r, wall_ms: dt.toFixed(2) };
}
const out={
  date: new Date().toISOString(),
  device: `Node ${process.version} ${process.platform}`,
  timeout_ms: 200,
  results: []
};
out.results.push(await bench("evil_loop", evilLoop, {timeout_ms:200, memory_kb:8192}));
out.results.push(await bench("evil_mem", evilMem, {timeout_ms:200, memory_kb:1024}));
out.mechanism_note="interrupt (QuickJS shouldInterruptAfterDeadline) + watchdog terminate +50ms; browser Worker.terminate() is hard watchdog";
fs.writeFileSync("bench/results/m6_termination.json", JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
