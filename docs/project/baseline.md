# Baseline — AI Customer Support Assistant (Express)

Status: Verified for preparation, 18 October 2026.

## Source identity

- Repository: `D:\c4r\AI-Powered-Full-Stack-Applications-Express`
- Branch: `Anas-Essam-branch`
- Commit at measurement: `998bc8662613904b3d50dcfacfe636447822291c`
- Frontend source: `frontend/index.html` (SHA-256: `30D21AA08129EEFDBE2FB0ACB79FD9720380BDF97CACD36EF320A1254FF04964` at measurement).
- The current branch tip is `f331f4f5a3431158d2db44b41b177302d14382da`, a documentation-only commit; the frontend hash still matches the original measurement. Start comparison workspaces from the recorded baseline and exclude evaluator docs from Basic/Detailed inputs.
- Stack from `package.json`/README: Node.js, Express 5, SQLite, single-page HTML, OpenRouter provider.
- Test command: `npm test` (`node --test`). Result: **4 passed, 0 failed** after an allowed local loopback run.
- Run time: approximately 456 ms; test process started local Express on an ephemeral port. The first sandboxed attempt failed with `EACCES 127.0.0.1`; rerun with approved local networking passed. Do not treat the sandbox failure as a code regression.

Recompute the frontend hash before each experiment to ensure the exact source bytes match; repository commit alone will not identify subsequent uncommitted changes to that file.

## Existing behavior verified from source and baseline tests

- Login accepts demo usernames; the browser sends a bearer session token.
- UI queries the health endpoint and supports admin document upload.
- Chat is a `POST /api/v1/chat` with JSON body and bearer auth; server streams `token`, `citations`, `done`, or `error` as SSE frames.
- Server validates a trimmed query of 1–2000 characters and requires the configured OpenRouter key/model.
- Source citations include source name, page number, and chunk index.
- Express app and retrieval use SQLite, not PostgreSQL.
- Conversation list and message endpoints currently return empty arrays. Do not claim history persistence as a baseline capability.

For the exact contract and migration implications see [the tooling guide](../workshop/04-stack-and-tools.md#نقطة-حساسة-عقد-streaming-الحالي).

## Scope boundaries

The experiment baseline is the original frontend and its existing Express API. Earlier reference materials in `artifacts/` describe Python/FastAPI, ChromaDB, Redis, and other choices; they are not the runtime measured here. The Angular outputs and proposed NestJS/PostgreSQL bonus do not exist in this baseline.

## Remaining before experiment runs

- Confirm the frontend SHA-256 again after establishing an experiment workspace.
- Settle an installable Angular/Node version pair and record the agent/model.
- Provide a deterministic API fixture for SSE fragmentation and failure cases.
- Create four clean workspaces from the same source identity.
