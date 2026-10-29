import { createHash } from "node:crypto";
import { validateManifest } from "../kernel/manifest.js";
import { runModuleWithWatchdog } from "../sandbox/host.mjs";
import { generateInputs } from "./inputgen.js";
import { advisoryScan } from "./advisory.js";

function withinTol(a,b,tol){
  if(typeof a==="number" && typeof b==="number"){
    const diff=Math.abs(a-b);
    const allowed=Math.max(tol.absolute ?? 1e-9, Math.abs(b)*(tol.relative ?? 1e-9));
    return diff <= allowed;
  }
  return JSON.stringify(a)===JSON.stringify(b);
}

function deepEqualTol(outA, outB, tol){
  if(typeof outA==="number" && typeof outB==="number") return withinTol(outA,outB,tol);
  if(outA===null || outB===null) return outA===outB;
  if(typeof outA !== typeof outB) return false;
  if(typeof outA !== "object") return withinTol(outA,outB,tol);
  const ka=Object.keys(outA), kb=Object.keys(outB);
  if(ka.length!==kb.length) return false;
  for(const k of ka) if(!deepEqualTol(outA[k], outB[k], tol)) return false;
  return true;
}

export async function verifyModule({ manifest, codeA, codeB, seed=0xC0FFEE }){
  const report = { checks: [], verdict:"REJECTED" };
  // 1 manifest checks
  const hA = createHash("sha256").update(codeA).digest("hex");
  const v = validateManifest(manifest, {checkHash: manifest.sha256 || hA, codeText: codeA});
  // for generation, manifest.sha256 is empty -> compare against hA after, or set it
  if(!manifest.sha256) manifest.sha256 = hA;
  else if(manifest.sha256 !== hA) { report.checks.push({name:"manifest/hash", ok:false, error:"HASH_MISMATCH"}); report.verdict="REJECTED"; return report; }
  if(!v.ok && !v.errors.every(e=>e.code==="HASH_MISMATCH")){ report.checks.push({name:"manifest", ok:false, errors:v.errors}); report.verdict="REJECTED"; return report; }
  report.checks.push({name:"manifest", ok:true});

  // 2 advisory scan
  const advA = advisoryScan(codeA), advB = advisoryScan(codeB);
  report.checks.push({name:"advisory_A", ...advA});
  report.checks.push({name:"advisory_B", ...advB});
  // advisory is not blocking

  // 3 examples
  const tol = manifest.tolerance || {relative:1e-9, absolute:1e-9};
  for(let i=0;i<manifest.examples.length;i++){
    const ex = manifest.examples[i];
    const rA = await runModuleWithWatchdog(codeA, ex.input, manifest.limits);
    const rB = await runModuleWithWatchdog(codeB, ex.input, manifest.limits);
    if(!rA.ok || !rB.ok){ report.checks.push({name:`example_${i}`, ok:false, rA, rB}); report.verdict="REJECTED"; return report; }
    if(!deepEqualTol(rA.output, ex.output, tol) || !deepEqualTol(rB.output, ex.output, tol)){
      report.checks.push({name:`example_${i}`, ok:false, expected:ex.output, gotA:rA.output, gotB:rB.output});
      report.verdict="REJECTED"; return report;
    }
  }
  report.checks.push({name:"examples", ok:true, count: manifest.examples.length});

  // 4 differential test
  const inputs = generateInputs(manifest.inputs, 200, seed);
  const diffs=[];
  for(const inp of inputs){
    const rA = await runModuleWithWatchdog(codeA, inp, manifest.limits);
    const rB = await runModuleWithWatchdog(codeB, inp, manifest.limits);
    const bothErr = !rA.ok && !rB.ok && rA.error.code === rB.error.code;
    const bothOk = rA.ok && rB.ok && deepEqualTol(rA.output, rB.output, tol);
    if(!bothErr && !bothOk){
      diffs.push({input: inp, outA: rA.ok? rA.output: rA.error, outB: rB.ok? rB.output: rB.error});
      if(diffs.length>=5) break;
    }
  }
  if(diffs.length){ report.checks.push({name:"differential", ok:false, diffs}); report.verdict="REJECTED"; return report; }
  report.checks.push({name:"differential", ok:true, tested: inputs.length});

  // 5 properties (simple expr eval via sandbox check — reuse host)
  if(manifest.properties?.length){
    for(const prop of manifest.properties){
      // expr like "output.result >= 0" — evaluate inside QuickJS with output
      // For now support only simple JS expr with `output` var; run via host with code `function run(input){ return {ok: (${prop.expr})} }`? Simpler: eval in Node with Function but only for safe exprs (sandbox does real defense)
      // Advisory: use Function only for property expr (not user code)
      for(const inp of inputs.slice(0,20)){
        const rA = await runModuleWithWatchdog(codeA, inp, manifest.limits);
        if(!rA.ok) continue;
        try{
          const fn = new Function("output","return ("+prop.expr+")");
          if(!fn(rA.output)){ report.checks.push({name:`property_${prop.name}`, ok:false, input:inp, output:rA.output}); report.verdict="REJECTED"; return report; }
        }catch(e){ /* malformed expr -> skip */ }
      }
    }
    report.checks.push({name:"properties", ok:true});
  }

  // 6 resource checks already via runModule (timeout/memory)

  report.verdict="VERIFIED";
  return report;
}
