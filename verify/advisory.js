const FORBIDDEN = ["fetch","XMLHttpRequest","WebSocket","import","eval","Function(","Date","Math.random","globalThis","constructor","process","require","child_process"];
export function advisoryScan(code){
  const hits = [];
  for(const tok of FORBIDDEN){
    if(code.includes(tok)) hits.push(tok);
  }
  return { hits, ok: hits.length===0, note: hits.length? `forbidden tokens: ${hits.join(", ")} (advisory only; sandbox is the real defense)`: "clean" };
}
