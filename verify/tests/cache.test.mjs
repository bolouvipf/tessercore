import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { MemCache } from "../../kernel/cache.js";
import { validateManifest } from "../../kernel/manifest.js";
import { runModuleWithWatchdog } from "../../sandbox/host.mjs";

describe("M3 cache + offline", () => {
  it("put/get/list and run offline (no network)", async () => {
    const cache = new MemCache();
    await cache.clear();
    for (const id of ["fcfa_eur_convert","unit_convert","loan_payment","cement_slab"]) {
      const mf = JSON.parse(fs.readFileSync(`modules/${id}/manifest.json`,"utf8"));
      const code = fs.readFileSync(`modules/${id}/main.js`,"utf8");
      await cache.put({ id: mf.id, manifest: mf, code });
    }
    const list = await cache.list();
    assert.equal(list.length, 4);
    // simulate offline: get from cache, validate hash, run
    for (const entry of list) {
      const h = createHash("sha256").update(entry.code).digest("hex");
      const v = validateManifest(entry.manifest, {checkHash:h, codeText:entry.code});
      assert.equal(v.ok, true);
      const ex = entry.manifest.examples[0];
      const r = await runModuleWithWatchdog(entry.code, ex.input, entry.manifest.limits);
      assert.equal(r.ok, true, JSON.stringify(r));
    }
  });
  it("tampered cached code rejected", async () => {
    const cache = new MemCache();
    const mf = JSON.parse(fs.readFileSync("modules/fcfa_eur_convert/manifest.json","utf8"));
    const code = fs.readFileSync("modules/fcfa_eur_convert/main.js","utf8");
    await cache.put({id: mf.id, manifest: mf, code: code + "// tamper"});
    const entry = await cache.get(mf.id);
    const h = createHash("sha256").update(entry.code).digest("hex");
    const v = validateManifest(entry.manifest, {checkHash:h, codeText:entry.code});
    assert.equal(v.ok, false);
    assert.ok(v.errors.some(e=>e.code==="HASH_MISMATCH"));
  });
});
