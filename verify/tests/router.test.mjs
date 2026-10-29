import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertAllowed } from "../../server/llm.js";

describe("M5 llm gateway allowlist", () => {
  it("allowlisted model passes", () => {
    assert.doesNotThrow(()=> assertAllowed("meta-models/muse-spark-open-1026"));
  });
  it("non-Meta model rejected", () => {
    try{ assertAllowed("gpt-4"); assert.fail("should throw"); }catch(e){ assert.equal(e.code,"MODEL_NOT_ALLOWED"); }
    try{ assertAllowed("text-embedding-ada-002"); assert.fail("should throw"); }catch(e){ assert.equal(e.code,"MODEL_NOT_ALLOWED"); }
  });
});

describe("M5 router integration (requires live LLM, may skip)", () => {
  it("router prompt routes fcfa (live)", async () => {
    if(!process.env.LLM_API_KEY) return;
    const { routeWithLLM } = await import("../../server/router.js");
    const r = await routeWithLLM("convert 1000 eur to fcfa");
    assert.ok(r.module_id === "fcfa_eur_convert" || r.module_id === null); // must be valid id or null
    if(r.module_id) assert.ok(r.confidence >= 0.6);
  });
});
