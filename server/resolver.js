// T1 rule-based resolver — plain scoring, no model
// Shared by server and kernel (kernel imports this file)

export function score(query, manifest){
  const q = query.toLowerCase();
  const intents = (manifest.intents||[]).map(s=>s.toLowerCase());
  const title = (manifest.title||"").toLowerCase();
  const desc = (manifest.description||"").toLowerCase();
  let s = 0;
  // exact intent substring
  const q0 = q.split(/\W+/)[0]?.toLowerCase();
  const stop0 = new Set(["convert","convertir"]);
  for (const intent of intents) {
    if (q.includes(intent)) s += 10;
    else if (q0 && !stop0.has(q0) && intent.includes(q0)) s += 2;
    // token overlap (ignore stopwords)
    const stop = new Set(["convert","convertir","to","en","in","a","de","du","la","le","the","and","et"]);
    const qt = new Set(q.split(/\W+/).filter(Boolean).map(w=>w.toLowerCase()).filter(w=>!stop.has(w)));
    const it = new Set(intent.split(/\W+/).filter(Boolean).map(w=>w.toLowerCase()).filter(w=>!stop.has(w)));
    let inter=0; for(const t of qt) if(it.has(t)) inter++;
    s += inter * 2.5;
  }
  const firstTitle = title.split(/\W+/)[0]?.toLowerCase();
  if (firstTitle && !new Set(["convert","convertir"]).has(firstTitle) && q.includes(firstTitle)) s += 2;
  if (desc && q.split(/\W+/).some(w=> w.length>3 && !new Set(["convert","convertir","to","en"]).has(w.toLowerCase()) && desc.includes(w.toLowerCase()))) s += 1;
  // keyword in title/desc (ignore stopwords)
  const stop2 = new Set(["convert","convertir","to","en","in","a","de","du","la","le","the","and","et"]);
  const qTokens = q.split(/\W+/).filter(w=>w.length>2).map(w=>w.toLowerCase()).filter(w=>!stop2.has(w));
  for(const t of qTokens){ if(title.includes(t)) s+=1; if(desc.includes(t)) s+=0.5; }
  return s;
}

export function resolveT1(query, manifests){
  let best=null, bestScore=-1;
  for(const m of manifests){
    const sc = score(query, m);
    if(sc > bestScore){ bestScore=sc; best=m; }
  }
  // threshold: need meaningful overlap (stopwords ignored)
  if(bestScore < 4) return null;
  return { manifest: best, score: bestScore };
}
