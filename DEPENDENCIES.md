# DEPENDENCIES.md

Every third-party dependency and dataset must be listed here and in README.md.

| Name | Version | License | Purpose |
|------|---------|---------|---------|
| quickjs-emscripten | 0.31.0 | MIT | QuickJS compiled to WASM — sandbox engine (lazy-loaded, verified size at bench) |
| fastify | 5.x | MIT | Server — registry API (<400 lines), resolver T1 endpoint |
| tweetnacl | 1.0.3 | Unlicense | Ed25519 — signer (server) + verifier (kernel) |
| tweetnacl-util | 0.15.1 | Unlicense | Base64 helpers for tweetnacl |

> **open_weight: true** — `meta-models/muse-spark-open-1026` (Muse Spark Open, open weights) via Baseten `https://inference.baseten.co/v1` — primary for T2/T3, flagged for $10K bonus.

