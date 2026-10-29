import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { validateManifest } from "../../kernel/manifest.js";
import { runModuleWithWatchdog } from "../../sandbox/host.mjs";

function load(id){
  const mf = JSON.parse(fs.readFileSync(`modules/${id}/manifest.json`,"utf8"));
  const code = fs.readFileSync(`modules/${id}/main.js`,"utf8");
  return {mf, code};
}

describe("M2 kernel — manifest + hash + seed modules", () => {
  for (const id of ["fcfa_eur_convert","unit_convert","loan_payment","cement_slab"]) {
    it(`${id} manifest valid + hash ok + examples pass`, async () => {
      const {mf, code} = load(id);
      const h = createHash("sha256").update(code).digest("hex");
      assert.equal(mf.sha256, h, "sha256 mismatch");
      const v = validateManifest(mf, {checkHash:h, codeText:code});
      assert.equal(v.ok, true, JSON.stringify(v.errors));
      assert.equal(mf.permissions.length, 0);
      assert.ok(mf.examples.length >= 2);
      // run examples via sandbox
      for (const ex of mf.examples) {
        const r = await runModuleWithWatchdog(code, ex.input, mf.limits);
        assert.equal(r.ok, true, JSON.stringify(r));
        // tolerance check (relative)
        for (const k of Object.keys(ex.output)) {
          const exp = ex.output[k], got = r.output[k];
          if (typeof exp === "number") {
            const tol = mf.tolerance || {relative:1e-9, absolute:1e-9};
            const diff = Math.abs(got - exp);
            const allowed = Math.max(tol.absolute ?? 1e-9, Math.abs(exp)* (tol.relative ?? 1e-9));
            assert.ok(diff <= allowed, `${id} example ${k}: got ${got} exp ${exp} diff ${diff} > ${allowed}`);
          } else assert.deepEqual(got, exp);
        }
      }
    });
  }
  it("flip one byte -> HASH_MISMATCH", async () => {
    const {mf, code} = load("fcfa_eur_convert");
    const tampered = code.replace("655.957","655.958");
    const h = createHash("sha256").update(tampered).digest("hex");
    const v = validateManifest(mf, {checkHash:h, codeText:tampered});
    assert.equal(v.ok, false);
    assert.ok(v.errors.some(e=>e.code==="HASH_MISMATCH"));
  });
  it("permissions non-empty rejected", () => {
    const {mf, code} = load("fcfa_eur_convert");
    const bad = {...mf, permissions:["network"]};
    const h = createHash("sha256").update(code).digest("hex");
    const v = validateManifest(bad, {checkHash:h, codeText:code});
    assert.equal(v.ok, false);
  });
});
