# DECISIONS.md

| Date | Decision | Reason | Alternative rejected |
|------|----------|--------|----------------------|
| 2026-10-29 | Repo `tessercore` = new repo created during event; `houetorwasm` referenced only as separate named resource, never copied | Hard rule AGENTS.md#1 + 00_BRIEF prior-work conflict | Copying old code |
| 2026-10-29 | Kernel: vanilla JS ES modules, no framework, no bundler for dev | Spec 01, keep kernel tiny | React/Svelte etc. |
| 2026-10-29 | Server: Node.js + Fastify (to pick, keep <400 lines v1) | Spec 01 options | Python FastAPI |
| 2026-10-29 | Sandbox: QuickJS via quickjs-emscripten in Web Worker | Spec 01 candidate library | Plain Worker-only (kept as M7 comparison) |
