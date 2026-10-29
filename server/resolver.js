// T1 rule-based resolver — plain scoring, no model
// Shared by server and kernel (kernel imports this file)

export function score(query, manifest){
  const q = query.toLowerCase();
  const intents = (manifest.intents||[]).map(s=>s.toLowerCase());
  const title = (manifest.title||"").toLowerCase();
  const desc = (manifest.description||"").toLowerCase();
  let s = 0;
  // exact intent substring
  for (const intent of intents) {
    if (q.includes(intent)) s += 10;
    else if (intent.includes(q.split(" ")[0])) s += 2;
    // token overlap
    const qt = new Set(q.split(/\W+/).filter(Boolean));
    const it = new Set(intent.split(/\W+/).filter(Boolean));
    let inter=0; for(const t of qt) if(it.has(t)) inter++;
    s += inter * 1.5;
  }
  if (title && q.includes(title.split(" ")[0])) s += 2;
  if (desc && q.split(/\W+/).some(w=> w.length>3 && desc.includes(w))) s += 1;
  // keyword in title/desc
  const qTokens = q.split(/\W+/).filter(w=>w.length>2);
  for(const t of qTokens){ if(title.includes(t)) s+=1; if(desc.includes(t)) s+=0.5; }
  return s;
}

export function resolveT1(query, manifests){
  let best=null, bestScore=-1;
  for(const m of manifests){
    const sc = score(query, m);
    if(sc > bestScore){ bestScore=sc; best=m; }
  }
  // threshold: need at least one intent token overlap or s>=3
  if(bestScore < 3) return null;
  return { manifest: best, score: bestScore };
}
