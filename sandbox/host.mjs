import { getQuickJS, shouldInterruptAfterDeadline } from "quickjs-emscripten";

let quickJS = null;
async function getQJS() {
  if (!quickJS) quickJS = await getQuickJS();
  return quickJS;
}

/**
 * Run a pure-function module inside QuickJS.
 * @param {string} code - content of main.js (must define function run(input))
 * @param {unknown} input - plain JSON object
 * @param {{timeout_ms?:number, memory_kb?:number, output_max_bytes?:number}} limits
 * @returns {Promise<{ok:boolean, output?:unknown, error?:{code:string,message:string}, latency_ms:number, mechanism:string}>}
 */
export async function runModule(code, input, limits = {}) {
  const timeout_ms = limits.timeout_ms ?? 200;
  const memory_kb = limits.memory_kb ?? 8192;
  const output_max_bytes = limits.output_max_bytes ?? 4096;
  const QJS = await getQJS();
  const rt = QJS.newRuntime();
  rt.setMemoryLimit(memory_kb * 1024);
  // QuickJS interrupt after deadline
  const deadline = Date.now() + timeout_ms;
  rt.setInterruptHandler(shouldInterruptAfterDeadline(deadline));

  const ctx = rt.newContext();
  const t0 = performance.now();
  let mechanism = "interrupt";
  try {
    const inputJson = JSON.stringify(input);
    // 1) load module code (defines run)
    const load = ctx.evalCode(code, "main.js");
    if (load.error) {
      const msg = ctx.dump(load.error);
      load.error.dispose();
      const errStr = String(msg?.message ?? msg ?? "load error");
      // classify OOM vs syntax
      if (/memory|allocation|string too long/i.test(errStr)) return { ok:false, error:{code:"MEMORY_LIMIT", message:errStr}, latency_ms: performance.now()-t0, mechanism };
      return { ok:false, error:{code:"RUNTIME_ERROR", message:errStr}, latency_ms: performance.now()-t0, mechanism };
    }
    load.value.dispose();

    // check run exists
    const check = ctx.evalCode("typeof run");
    const type = ctx.dump(check.value);
    check.value.dispose();
    if (check.error) { check.error.dispose(); }
    if (type !== "function") {
      return { ok:false, error:{code:"RUNTIME_ERROR", message:"run() not defined"}, latency_ms: performance.now()-t0, mechanism };
    }

    // 2) call run with input — avoid string interpolation injection by passing via handle
    // set global __input_json
    const inputHandle = ctx.newString(inputJson);
    ctx.setProp(ctx.global, "__input_json", inputHandle);
    inputHandle.dispose();

    const call = ctx.evalCode(`JSON.stringify(run(JSON.parse(__input_json)))`);
    // cleanup global
    try { const del = ctx.evalCode(`delete globalThis.__input_json`); del.value?.dispose(); del.error?.dispose(); } catch {}

    if (call.error) {
      const dumped = ctx.dump(call.error);
      call.error.dispose();
      const msg = String(dumped?.message ?? dumped ?? "runtime error");
      // interrupted => timeout
      const elapsed = performance.now() - t0;
      if (/interrupted|deadline|interrupt/i.test(msg) || elapsed >= timeout_ms - 5) {
        return { ok:false, error:{code:"TIMEOUT", message:`interrupted after ${elapsed.toFixed(0)}ms: ${msg}`}, latency_ms: elapsed, mechanism: "interrupt" };
      }
      if (/memory|allocation|string too long/i.test(msg)) {
        return { ok:false, error:{code:"MEMORY_LIMIT", message: msg}, latency_ms: elapsed, mechanism };
      }
      return { ok:false, error:{code:"RUNTIME_ERROR", message: msg}, latency_ms: elapsed, mechanism };
    }
    const outStr = ctx.dump(call.value);
    call.value.dispose();
    const elapsed = performance.now() - t0;
    // output size check
    const outBytes = Buffer.byteLength(String(outStr), "utf8");
    if (outBytes > output_max_bytes) {
      return { ok:false, error:{code:"OUTPUT_TOO_LARGE", message:`output ${outBytes} > ${output_max_bytes}`}, latency_ms: elapsed, mechanism };
    }
    let output;
    try { output = JSON.parse(String(outStr)); } catch(e) {
      return { ok:false, error:{code:"INVALID_OUTPUT", message:`not JSON: ${String(outStr).slice(0,200)}`}, latency_ms: elapsed, mechanism };
    }
    // also check for elapsed exceeding timeout (watchdog simulation)
    if (elapsed > timeout_ms) {
      return { ok:false, error:{code:"TIMEOUT", message:`timeout ${elapsed.toFixed(0)}ms > ${timeout_ms}ms`}, latency_ms: elapsed, mechanism: "watchdog" };
    }
    return { ok:true, output, latency_ms: elapsed, mechanism };
  } finally {
    ctx.dispose();
    rt.dispose();
  }
}

// Browser Worker watchdog wrapper (for Node we simulate with Promise.race)
export async function runModuleWithWatchdog(code, input, limits = {}) {
  const timeout_ms = limits.timeout_ms ?? 200;
  const margin = 50;
  const p = runModule(code, input, limits);
  const timer = new Promise((_, rej) => setTimeout(() => rej({ code:"TIMEOUT", message:`watchdog terminate after ${timeout_ms+margin}ms` }), timeout_ms + margin));
  try {
    return await Promise.race([p, timer]);
  } catch (e) {
    if (e && e.code === "TIMEOUT") return { ok:false, error:e, latency_ms: timeout_ms+margin, mechanism:"watchdog" };
    throw e;
  }
}
