# Run 01 evidence

Status: First-output evaluation recorded 2026-10-18. Snapshot: `5974345ca20162474cc8ff83b2952dece60e514f` on branch `codex/workshop-run-01-basic`.

| Checklist ID | State | Command/reproduction | Result | Evidence path |
| --- | --- | --- | --- | --- |
| EVAL-01 | PASS | `npm ci --cache <shared-cache> --prefix <run-01>`; `npm run build --prefix <run-01>` | 478 packages installed from lockfile; build exit 0. npm reported four optional install scripts requiring explicit npm approval; application still built. | Run 01 workspace |
| EVAL-02 | PASS (component tests) | `npm run test:frontend --prefix <run-01>` | Admin/agent login, role visibility, login failure, and expired-session handling covered; 14 tests pass. | `frontend/src/app/app.component.spec.ts` |
| EVAL-03 | PASS (mocked request assertion) | `npm run test:frontend --prefix <run-01>` | Asserts POST `/api/v1/chat`, JSON query/session/conversation fields, bearer token, and no provider credential in browser request. | `frontend/src/app/app.component.spec.ts` |
| EVAL-04 | PASS | `npm run test:frontend --prefix <run-01>` | Parser test splits UTF-8 stream into single-byte chunks and verifies token, citation, and done event once and in order. | `frontend/src/app/chat-stream.spec.ts` |
| EVAL-05 | PASS (automated UI/parser cases) | `npm run test:frontend --prefix <run-01>` | Covers 401, provider 503, error events, and EOF before done; loading clears and session-expiry is visible. Live network disconnect was not separately injected. | `frontend/src/app/app.component.spec.ts`; `frontend/src/app/chat-stream.spec.ts` |
| EVAL-06 | BLOCKED (live API role fixture) | Frontend suite only | UI tests verify admin upload and agent-side rejection with mocked API; no independent live unauthorized upload request was made. | `frontend/src/app/app.component.spec.ts` |
| EVAL-07 | BLOCKED (mobile/accessibility review incomplete) | Browser smoke test at default viewport; inspect AX tree | Browser showed login/session/chat error state and accessible labels/status regions. Narrow viewport and full keyboard traversal were not run. | CLI JSONL browser event; snapshot HTML/CSS |
| EVAL-08 | NOT RUN | Deferred to Task 4 | Change challenge is reserved for the repair/learning stage. | — |

## First-output verification

- `npm run check --prefix <run-01>`: exit 0; production build, 14 Angular tests, 4 backend tests passed.
- Independent recheck: same command, exit 0. Clean install and production build also passed separately.
- `git diff --check`: exit 0.
- Browser smoke: dev server returned HTTP 200 and `<app-root>`; browser rendered login, health, and backend-not-configured error states.
- Snapshot changes 22 files. Existing backend tests exposed a PDF Buffer view-offset issue; agent changed the parser input to `Uint8Array`, then all backend tests passed. This is outside frontend migration scope.

## Rubric (first output)

| Dimension | Score / 5 | Evidence and reason |
| --- | ---: | --- |
| Accuracy | 3.1 | Five scenarios pass; EVAL-06 and mobile/keyboard part of EVAL-07 are blocked; EVAL-08 not run. Uses 5 × 5/8. |
| Code quality | 3 | Typed Angular app and focused stream/API services; several unrelated backend/CI/config changes. |
| Architecture | 3 | UI, API, and SSE parser separated; app state remains concentrated in one component. |
| Maintainability | 2 | No common change challenge yet; 215-line component and backend scope creep make ownership less clear. Provisional. |
| Scalability | 3 | Reasonable frontend boundaries for migration; no evidence of broader scale needs. |
| Assumptions | 2 | Chose Angular 21 without a supplied target; updated Express static serving and backend PDF parsing without explicit task scope. |
| Effort | 3 | 417.9 seconds, one self-repair; includes tool discovery and browser smoke. |

Scores are workshop judgments, not statistical results. Task 4 will keep these first-output scores immutable and record any later challenge or repair separately.
