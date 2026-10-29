import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { verifyManifest, signManifest } from "../../server/signer.js";
import { getModule, verifyStored } from "../../server/registry.js";
import { resolveT1 } from "../../server/resolver.js";
import { listManifests } from "../../server/registry.js";

describe("M4 registry + signing + T1", () => {
  it("seed modules signed and verifiable", () => {
    for(const id of ["fcfa_eur_convert","unit_convert","loan_payment","cement_slab"]) {
      const m = getModule(id);
      assert.ok(m, `missing ${id}`);
      assert.ok(verifyManifest(m.manifest, m.sig), `sig fail ${id}`);
      const r = verifyStored(id);
      assert.equal(r.ok, true);
    }
  });
  it("tamper manifest -> SIGNATURE_INVALID", () => {
    const m = getModule("fcfa_eur_convert");
    const tampered = { ...m.manifest, title: m.manifest.title + "X" };
    assert.equal(verifyManifest(tampered, m.sig), false);
  });
  it("tamper main.js -> hash mismatch would be caught by loader (simulate)", async () => {
    const m = getModule("fcfa_eur_convert");
    const tamperedCode = m.code + "//x";
    const { createHash } = await import("node:crypto");
    const h = createHash("sha256").update(tamperedCode).digest("hex");
    assert.notEqual(h, m.manifest.sha256);
  });
  it("fresh profile: list then T1 resolve", () => {
    const manifests = listManifests();
    assert.ok(manifests.length >= 4);
    const hit = resolveT1("convert fcfa to eur please", manifests);
    assert.ok(hit && hit.manifest.id === "fcfa_eur_convert");
    const hit2 = resolveT1("loan payment for 12000", manifests);
    assert.ok(hit2 && hit2.manifest.id === "loan_payment");
    const miss = resolveT1("unknown thing that does not exist xyz", manifests);
    assert.equal(miss, null);
  });
  it("paraphrase routes to right module", () => {
    const manifests = listManifests();
    const q = "convertir fcfa en euro";
    const hit = resolveT1(q, manifests);
    assert.ok(hit && hit.manifest.id === "fcfa_eur_convert");
  });
});
