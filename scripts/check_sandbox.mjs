import fs from "node:fs";
import { runModuleWithWatchdog } from "../sandbox/host.mjs";
const seedCode = fs.readFileSync("modules/fcfa_eur_convert/main.js","utf8");
const evilFetch = fs.readFileSync("modules/_evil/evil_fetch.js","utf8");
const evilDom = fs.readFileSync("modules/_evil/evil_dom.js","utf8");
const evilLoop = fs.readFileSync("modules/_evil/evil_loop.js","utf8");
const evilMem = fs.readFileSync("modules/_evil/evil_mem.js","utf8");
const subtle = fs.readFileSync("modules/_evil/subtle_wrong.js","utf8");
async function test(name, code, input, limits){
  const r = await runModuleWithWatchdog(code, input, limits);
  console.log(name, JSON.stringify(r).slice(0,400));
}
await test("seed ok XOF->EUR", seedCode, {amount:655957, direction:"XOF_TO_EUR"}, {timeout_ms:200});
await test("seed EUR->XOF", seedCode, {amount:1000, direction:"EUR_TO_XOF"}, {timeout_ms:200});
await test("evil_fetch", evilFetch, {}, {timeout_ms:200});
await test("evil_dom", evilDom, {}, {timeout_ms:200});
await test("evil_loop", evilLoop, {}, {timeout_ms:200});
await test("evil_mem", evilMem, {}, {timeout_ms:200, memory_kb:8192});
await test("subtle_wrong precise", subtle, {amount:655957, direction:"XOF_TO_EUR"}, {timeout_ms:200});
console.log("done");
