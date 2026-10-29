import "./env.js";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
const { decodeBase64, encodeBase64 } = naclUtil;

function hexToU8(hex){ return new Uint8Array(hex.match(/.{2}/g).map(b=>parseInt(b,16))); }
function u8ToHex(u8){ return [...u8].map(b=>b.toString(16).padStart(2,"0")).join(""); }

// Canonical JSON: sorted keys recursively, no whitespace
export function canonical(obj){
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonical).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k=>JSON.stringify(k)+":"+canonical(obj[k])).join(",")}}`;
}

export function getKeypair(){
  const privHex = process.env.SIGN_PRIVATE_KEY_HEX || "";
  const pubHex = process.env.SIGN_PUBLIC_KEY_HEX || "";
  if (!privHex || !pubHex) throw new Error("SIGN_*_KEY_HEX missing in .env");
  return { publicKey: hexToU8(pubHex), secretKey: hexToU8(privHex) };
}

export function signManifest(manifest){
  const { secretKey } = getKeypair();
  const msg = new TextEncoder().encode(canonical(manifest));
  const sig = nacl.sign.detached(msg, secretKey);
  return encodeBase64(sig);
}

export function verifyManifest(manifest, sigB64){
  const pubHex = process.env.SIGN_PUBLIC_KEY_HEX || "";
  if (!pubHex) throw new Error("SIGN_PUBLIC_KEY_HEX missing");
  const pub = hexToU8(pubHex);
  const msg = new TextEncoder().encode(canonical(manifest));
  const sig = decodeBase64(sigB64);
  return nacl.sign.detached.verify(msg, sig, pub);
}
