import fs from "node:fs";
import path from "node:path";
import { publishModule } from "../server/registry.js";
for(const id of ["fcfa_eur_convert","unit_convert","loan_payment","cement_slab"]){
  const mf = JSON.parse(fs.readFileSync(`modules/${id}/manifest.json`,"utf8"));
  const code = fs.readFileSync(`modules/${id}/main.js`,"utf8");
  const { sig } = publishModule(mf, code);
  console.log(`seeded ${id} sig ${sig.slice(0,16)}...`);
}
