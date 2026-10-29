import fs from "node:fs"; import { createHash } from "node:crypto";
for(const id of ["unit_convert","loan_payment","cement_slab"]){
  const code=fs.readFileSync(`modules/${id}/main.js`,"utf8");
  const h=createHash("sha256").update(code).digest("hex");
  const p=`modules/${id}/manifest.json`;
  const m=JSON.parse(fs.readFileSync(p,"utf8")); m.sha256=h;
  fs.writeFileSync(p, JSON.stringify(m,null,2)); console.log(id,h);
}
