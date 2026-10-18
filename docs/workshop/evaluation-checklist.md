# Shared evaluation checklist — v1

Status: Draft for review before experiment results; fixed criteria derived from the workshop rubric and the existing application behavior. Do not add this file to the Basic or Detailed workspaces as hidden instructions.

## Inputs held constant

- Baseline commit: `998bc8662613904b3d50dcfacfe636447822291c`.
- The exact SHA-256 of `frontend/index.html` must be recorded in every manifest before run.
- Same task, runtime, evaluator, fixtures, agent/model and settings across runs whenever supported.
- Existing Express API is the migration target. The checklist is evaluator-only context and is not disclosed to runs 01–02.
- Synthetic API and stream scenarios are defined in [the fixtures](fixtures/).

## Scenarios

| ID | Procedure | Pass condition |
| --- | --- | --- |
| EVAL-01 install/build | Follow the generated workspace's documented install/build command, recording exact command, cwd, exit code, warnings and elapsed time. | Clean install from lockfile and app build succeed, or failure is captured with its impact. |
| EVAL-02 login/session | Exercise admin and agent login using synthetic accounts/fixtures; expire session and retry a protected request. | Correct role-specific paths; unauthorized result is visible and recovers from loading. |
| EVAL-03 API contract | Capture outgoing request against deterministic fixture. | POST path, JSON body (`query`, `session_id`, `conversation_id`), content type and bearer auth match the documented contract. |
| EVAL-04 stream parser | Fixture emits events split across byte chunks, including multi-byte UTF-8 token, citations, and done; also sends multiple frames per chunk. | Text and citation each render once and in order; parser survives arbitrary network chunk boundaries. |
| EVAL-05 stream failure | Exercise 401, provider `error`, disconnect, failed HTTP response, and EOF without `done`. | No false success; clear error state; controls and resources recover; behavior for EOF matches recorded contract decision. |
| EVAL-06 upload roles | Admin and non-admin attempt the existing upload flow against the fixed Express API. | UI feedback is clear and server-side authorization response is handled. |
| EVAL-07 citation/accessibility | Render citations, keyboard through controls, and inspect narrow/mobile viewport. | Sources are readable, no critical overflow; labels/focus/order usable by keyboard. |
| EVAL-08 change challenge | Give each output the same small, preselected UX-copy change tied to one testable behavior. Ask evaluator to locate, explain, implement and test it after first-output scoring. | Record time, assistance, changed files, regression result and explanation in a separate after-repair row. |

## Scoring

Use the rubric and weights from [the experiment protocol](02-experiments.md#rubric-مقترحة-ثابتة-قبل-رؤية-النتائج). Score after every first-output run and keep failures. Distinguish inherited gaps (e.g. empty conversation endpoints), regressions in migration, unsupported features and unable-to-evaluate cases. A blocked test is not a pass or a fail unless its behavior was actually observed.

For each scenario record: `PASS / FAIL / BLOCKED / NOT RUN`, command or reproduction steps, evidence path, and short reason. Score every subjective category 0–5 with a concrete example. Report rubric as a comparative workshop signal, not a statistically general result.
