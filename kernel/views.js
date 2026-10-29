// Input form auto-generated from manifest.inputs JSON Schema
// View renderer — never uses innerHTML, only textContent

export function buildInputForm(manifest, container, initial = {}) {
  container.replaceChildren();
  const props = manifest.inputs.properties || {};
  const required = new Set(manifest.inputs.required || []);
  const inputs = {};
  for (const [key, sch] of Object.entries(props)) {
    const row = document.createElement("label");
    row.style.display = "block";
    const title = document.createElement("span");
    title.textContent = key + (required.has(key) ? " *" : "") + (sch.description ? ` — ${sch.description}` : "");
    row.appendChild(title);
    let el;
    if (sch.enum) {
      el = document.createElement("select");
      for (const v of sch.enum) { const o=document.createElement("option"); o.value=v; o.textContent=v; el.appendChild(o); }
      el.value = initial[key] ?? sch.default ?? sch.enum[0];
    } else if (sch.type === "boolean") {
      el = document.createElement("input"); el.type="checkbox"; el.checked = initial[key] ?? sch.default ?? false;
    } else if (sch.type === "number" || sch.type === "integer") {
      el = document.createElement("input"); el.type="number";
      if (sch.minimum != null) el.min = String(sch.minimum);
      if (sch.maximum != null) el.max = String(sch.maximum);
      el.value = String(initial[key] ?? sch.default ?? "");
      if (sch.type==="integer") el.step="1";
    } else {
      el = document.createElement("input"); el.type="text";
      el.value = initial[key] ?? sch.default ?? "";
    }
    el.name = key;
    el.dataset.key = key;
    inputs[key] = el;
    row.appendChild(el);
    container.appendChild(row);
  }
  return {
    getValues() {
      const out = {};
      for (const [k, el] of Object.entries(inputs)) {
        const sch = props[k];
        if (sch.enum) out[k] = el.value;
        else if (sch.type === "boolean") out[k] = el.checked;
        else if (sch.type === "number" || sch.type==="integer") {
          const v = el.value === "" ? undefined : Number(el.value);
          if (v !== undefined) out[k] = sch.type==="integer" ? Math.trunc(v) : v;
        } else out[k] = el.value;
      }
      return out;
    },
    inputs
  };
}

export function renderOutput(manifest, output, container) {
  container.replaceChildren();
  const view = manifest.view || { type:"keyvalue" };
  if (view.type === "text") {
    const p = document.createElement("p");
    let t = view.template || "{result}";
    for (const [k,v] of Object.entries(output)) t = t.replaceAll(`{${k}}`, String(v));
    p.textContent = t;
    container.appendChild(p);
  } else if (view.type === "keyvalue") {
    const dl = document.createElement("dl");
    const labels = view.labels || {};
    for (const [k,v] of Object.entries(output)) {
      const dt=document.createElement("dt"); dt.textContent = labels[k] || k;
      const dd=document.createElement("dd"); dd.textContent = String(v);
      dl.append(dt,dd);
    }
    container.appendChild(dl);
  } else if (view.type === "table") {
    const rows = getPath(output, view.rows_path) || [];
    const table=document.createElement("table");
    const thead=document.createElement("thead"), trh=document.createElement("tr");
    for (const c of view.columns||[]) { const th=document.createElement("th"); th.textContent=c.label||c.key; trh.appendChild(th); }
    thead.appendChild(trh); table.appendChild(thead);
    const tbody=document.createElement("tbody");
    for (const r of rows){ const tr=document.createElement("tr"); for(const c of view.columns||[]){ const td=document.createElement("td"); td.textContent=String(r[c.key]??""); tr.appendChild(td);} tbody.appendChild(tr); }
    table.appendChild(tbody); container.appendChild(table);
  } else if (view.type === "list") {
    const items = getPath(output, view.items_path) || [];
    const ul=document.createElement("ul");
    for(const it of items){ const li=document.createElement("li"); li.textContent=String(it); ul.appendChild(li); }
    container.appendChild(ul);
  } else {
    const pre=document.createElement("pre"); pre.textContent=JSON.stringify(output,null,2); container.appendChild(pre);
  }
  // assumptions
  if (manifest.assumptions?.length){
    const d=document.createElement("details"); const s=document.createElement("summary"); s.textContent="Assumptions"; d.appendChild(s);
    const ul=document.createElement("ul"); for(const a of manifest.assumptions){ const li=document.createElement("li"); li.textContent=a; ul.appendChild(li);} d.appendChild(ul); container.appendChild(d);
  }
}

function getPath(obj, path){
  if(!path) return obj;
  return path.split(".").reduce((o,k)=>o?.[k], obj);
}
