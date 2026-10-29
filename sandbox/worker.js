// Browser Web Worker — QuickJS-WASM host (lazy-loaded, cached)
// Loads quickjs-emscripten via importmap/CDN; kernel posts {id, code, input, limits}
let QJS = null;
async function getQJS() {
  if (QJS) return QJS;
  const m = await import("https://esm.sh/quickjs-emscripten@0.31.0");
  QJS = await m.getQuickJS();
  return QJS;
}
self.onmessage = async (e) => {
  const { id, code, input, limits } = e.data;
  const t0 = performance.now();
  try {
    const QS = await getQJS();
    const rt = QS.newRuntime();
    rt.setMemoryLimit((limits?.memory_kb ?? 8192) * 1024);
    const { shouldInterruptAfterDeadline } = await import("https://esm.sh/quickjs-emscripten@0.31.0");
    rt.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + (limits?.timeout_ms ?? 200)));
    const ctx = rt.newContext();
    const inputJson = JSON.stringify(input);
    let res = ctx.evalCode(code, "main.js");
    if (res.error) { const msg = String(ctx.dump(res.error)?.message ?? ctx.dump(res.error)); res.error.dispose(); ctx.dispose(); rt.dispose(); self.postMessage({ id, ok:false, error:{code:"RUNTIME_ERROR", message:msg}, latency_ms: performance.now()-t0, mechanism:"interrupt"}); return; }
    res.value.dispose();
    const h = ctx.newString(inputJson); ctx.setProp(ctx.global, "__input_json", h); h.dispose();
    const call = ctx.evalCode(`JSON.stringify(run(JSON.parse(__input_json)))`);
    try{ const d=ctx.evalCode(`delete globalThis.__input_json`); d.value?.dispose(); d.error?.dispose(); }catch{}
    if (call.error){ const m2=String(ctx.dump(call.error)?.message ?? ctx.dump(call.error)); const el=performance.now()-t0; call.error.dispose(); ctx.dispose(); rt.dispose(); const isTimeout=/interrupted|deadline|interrupt/i.test(m2)||el>=(limits?.timeout_ms??200)-5; self.postMessage({id, ok:false, error:{code:isTimeout?"TIMEOUT":"RUNTIME_ERROR", message:m2}, latency_ms:el, mechanism:"interrupt"}); return; }
    const outStr = String(ctx.dump(call.value)); call.value.dispose(); ctx.dispose(); rt.dispose();
    const outBytes = new TextEncoder().encode(outStr).length;
    if (outBytes > (limits?.output_max_bytes ?? 4096)){ self.postMessage({id, ok:false, error:{code:"OUTPUT_TOO_LARGE", message:`output ${outBytes} > ${limits.output_max_bytes}`}, latency_ms: performance.now()-t0, mechanism:"interrupt"}); return; }
    self.postMessage({id, ok:true, output: JSON.parse(outStr), latency_ms: performance.now()-t0, mechanism:"interrupt"});
  } catch(err){ self.postMessage({id, ok:false, error:{code:"RUNTIME_ERROR", message:String(err?.message??err)}, latency_ms: performance.now()-t0, mechanism:"watchdog"}); }
};
// kernel watchdog: Worker.terminate() after timeout+margin (handled in kernel/loader.js)
