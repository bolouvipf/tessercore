import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { verifyModule } from "../pipeline.js";

function load(id){ return { manifest: JSON.parse(fs.readFileSync(`modules/${id}/manifest.json`,"utf8")), codeA: fs.readFileSync(`modules/${id}/main.js`,"utf8") }; }

describe("M6 verify pipeline", () => {
  it("seed fcfa VERIFIED (A==B identical)", async () => {
    const {manifest, codeA} = load("fcfa_eur_convert");
    const r = await verifyModule({manifest:{...manifest}, codeA, codeB: codeA});
    assert.equal(r.verdict,"VERIFIED", JSON.stringify(r,null,2));
  });
  it("subtle_wrong REJECTED by differential", async () => {
    const {manifest} = load("fcfa_eur_convert");
    const correct = fs.readFileSync("modules/fcfa_eur_convert/main.js","utf8");
    const wrong = fs.readFileSync("modules/_evil/subtle_wrong.js","utf8");
    const r = await verifyModule({manifest:{...manifest, sha256:""}, codeA: correct, codeB: wrong});
    assert.equal(r.verdict,"REJECTED");
    assert.ok(r.checks.some(c=>c.name==="differential" && !c.ok));
  });
});
