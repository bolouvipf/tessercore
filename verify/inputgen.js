// Input generator from JSON Schema — boundaries, typical, seeded random (N default 200)
export function generateInputs(inputsSchema, N=200, seed=0xC0FFEE){
  const rnd = mulberry32(seed);
  const props = inputsSchema.properties || {};
  const required = inputsSchema.required || Object.keys(props);
  const out = [];
  // helper: values per prop
  function valuesFor(key, sch){
    const vals = new Set();
    if(sch.enum) {
      for(const v of sch.enum) vals.add(v);
      return [...vals];
    }
    if(sch.type==="number" || sch.type==="integer"){
      const min = sch.minimum ?? 0, max = sch.maximum ?? 100;
      const isInt = sch.type==="integer";
      const picker = v=> isInt? Math.trunc(v): v;
      vals.add(picker(min)); vals.add(picker(max));
      if(min <= 0 && 0 <= max) vals.add(0);
      if(min+1 <= max) vals.add(picker(min+1));
      if(max-1 >= min) vals.add(picker(max-1));
      // typical
      vals.add(picker((min+max)/2));
      vals.add(picker(1)); vals.add(picker(10));
      // random
      for(let i=0;i<Math.ceil(N/4);i++){
        const r = rnd();
        vals.add(picker(min + r*(max-min)));
      }
    } else if(sch.type==="string"){
      vals.add(""); vals.add("hello"); vals.add("héllo 🌍");
      if(sch.enum) for(const e of sch.enum) vals.add(e);
    } else if(sch.type==="boolean"){ vals.add(true); vals.add(false); }
    return [...vals];
  }
  const perKey = {};
  for(const [k,sch] of Object.entries(props)) perKey[k]=valuesFor(k,sch);

  // boundaries: cartesian of min/max/0 combos (limited)
  const keys = Object.keys(props);
  // 1) all-min, all-max, all-zeroish
  // 2) seeded random combos
  const combos = new Set();
  function addCombo(obj){ combos.add(JSON.stringify(obj)); }

  // systematic: take first 3 values per key, limited combos
  const first3 = keys.map(k=> perKey[k].slice(0,3));
  // cap combos to avoid explosion: sample random combos from cartesian
  for(let i=0;i<Math.min(N, 200); i++){
    const obj={};
    for(const k of keys){
      const arr = perKey[k];
      obj[k]= arr[Math.floor(rnd()*arr.length)];
    }
    addCombo(obj);
  }
  // ensure enum coverage: each enum value appears at least once per key
  for(const k of keys){
    const sch = props[k];
    if(sch.enum) for(const v of sch.enum){ const o={}; for(const kk of keys) o[kk]= perKey[kk][0]; o[k]=v; addCombo(o); }
  }

  const arr = [...combos].map(s=> JSON.parse(s)).slice(0, N);
  return arr;
}

function mulberry32(a){
  return function(){
    a|=0; a = a + 0x6D2B79F5 |0;
    let t = Math.imul(a ^ a>>>15, 1|a);
    t = t + Math.imul(t ^ t>>>7, 61|t) ^ t;
    return ((t ^ t>>>14) >>>0) / 4294967296;
  }
}
