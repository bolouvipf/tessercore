import { generateBoth } from "../server/generate.js";
import { verifyModule } from "../verify/pipeline.js";
const query = process.argv[2] || "convert kilograms to pounds";
console.log("query:", query);
const { manifest, implA, implB } = await generateBoth(query);
console.log("manifest.id", manifest.id, "title", manifest.title);
console.log("intents", manifest.intents);
console.log("examples", JSON.stringify(manifest.examples).slice(0,400));
console.log("implA", implA.slice(0,400));
console.log("implB", implB.slice(0,400));
const report = await verifyModule({ manifest:{...manifest}, codeA: implA, codeB: implB });
console.log("verdict", report.verdict);
console.log(JSON.stringify(report.checks,null,2).slice(0,2000));
if(report.verdict==="VERIFIED"){
  // publish
  const { createHash } = await import("node:crypto");
  manifest.sha256 = createHash("sha256").update(implA).digest("hex");
  manifest.provenance.verification="VERIFIED";
  const { publishModule } = await import("../server/registry.js");
  const { sig } = publishModule(manifest, implA);
  console.log("published", manifest.id, sig.slice(0,16));
}
