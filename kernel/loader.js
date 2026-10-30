import { validateManifest } from "./manifest.js";
import { sha256Hex } from "./hash.js";

// Verifies hash + manifest, then runs via sandbox Worker.
// In browser, pass worker instance; in Node tests, runs via sandbox/host.mjs directly.
export async function loadAndRun({ manifest, code, input, worker }) {
  // hash check (browser async)
  const hash = await sha256Hex(code);
  const v = validateManifest(manifest, { checkHash: hash, codeText: code });
  if (!v.ok) return { ok:false, error:{code: v.errors[0].code, message: v.errors[0].message} };

  // permissions must be []
  if (manifest.permissions?.length) return { ok:false, error:{code:"INVALID_MANIFEST", message:"permissions must be []"}};

  // input validation (light — full Ajv in verifier)
  // sandbox run
  if (worker) {
    return runViaWorker(worker, code, input, manifest.limits);
  } else {
    const { runModuleWithWatchdog } = await import("../sandbox/host.mjs");
    return runModuleWithWatchdog(code, input, manifest.limits);
  }
}

function runViaWorker(worker, code, input, limits) {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    const t0 = performance.now();
    // WASM engine lazy-load needs ~1s (677KB gz) — keep watchdog generous so first run isn't cut
    const watchdogMs = 8000;
    const timer = setTimeout(() => { try{ worker.terminate(); }catch{} resolve({ ok:false, error:{code:"TIMEOUT", message:`watchdog terminate after ${watchdogMs}ms`}, latency_ms: performance.now()-t0, mechanism:"watchdog"}); }, watchdogMs);
    const handler = (e) => {
      if (e.data.id !== id) return;
      clearTimeout(timer);
      worker.removeEventListener("message", handler);
      resolve(e.data);
    };
    worker.addEventListener("message", handler);
    worker.postMessage({ id, code, input, limits });
  });
}
