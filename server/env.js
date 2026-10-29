import fs from "node:fs";
export function loadEnv(){
  try{
    const txt = fs.readFileSync(".env","utf8");
    for(const line of txt.split("\n")){
      const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if(!m || line.trim().startsWith("#")) continue;
      let v=m[2].trim();
      if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
      if(!(m[1] in process.env)) process.env[m[1]]=v;
    }
  }catch{}
}
loadEnv();
