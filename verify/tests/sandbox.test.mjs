import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { runModuleWithWatchdog } from "../../sandbox/host.mjs";

const seed = fs.readFileSync("modules/fcfa_eur_convert/main.js","utf8");
const evilFetch = fs.readFileSync("modules/_evil/evil_fetch.js","utf8");
const evilDom = fs.readFileSync("modules/_evil/evil_dom.js","utf8");
const evilLoop = fs.readFileSync("modules/_evil/evil_loop.js","utf8");
const evilMem = fs.readFileSync("modules/_evil/evil_mem.js","utf8");

describe("sandbox M1", () => {
  it("seed runs", async () => {
    const r = await runModuleWithWatchdog(seed, {amount:655957, direction:"XOF_TO_EUR"}, {timeout_ms:200});
    assert.equal(r.ok, true);
    assert.equal(r.output.currency, "EUR");
    assert.ok(Math.abs(r.output.result - 1000) < 1e-9);
  });
  it("evil_fetch blocked", async () => {
    const r = await runModuleWithWatchdog(evilFetch, {}, {timeout_ms:200});
    assert.equal(r.ok, false);
    assert.match(r.error.message, /fetch/i);
  });
  it("evil_dom blocked", async () => {
    const r = await runModuleWithWatchdog(evilDom, {}, {timeout_ms:200});
    assert.equal(r.ok, false);
    assert.match(r.error.message, /document/i);
  });
  it("evil_loop timeout < 350ms", async () => {
    const r = await runModuleWithWatchdog(evilLoop, {}, {timeout_ms:200});
    assert.equal(r.ok, false);
    assert.equal(r.error.code, "TIMEOUT");
    assert.ok(r.latency_ms < 350, `latency ${r.latency_ms}ms`);
  });
  it("evil_mem memory/timeout < 500ms", async () => {
    const r = await runModuleWithWatchdog(evilMem, {}, {timeout_ms:200, memory_kb:1024});
    assert.equal(r.ok, false);
    assert.ok(["MEMORY_LIMIT","TIMEOUT"].includes(r.error.code));
    assert.ok(r.latency_ms < 500, `latency ${r.latency_ms}ms`);
  });
});
