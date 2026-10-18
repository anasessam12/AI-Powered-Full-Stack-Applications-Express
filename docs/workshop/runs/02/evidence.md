# Run 02 evidence

Status: Incomplete; no first-output scoring. The contaminated shared-scratch attempt is excluded. Isolated partial output: commit `fb5715091c771feac2e86cce19e4dc5436c408a8`.

| Checklist ID | State | Command/reproduction | Result | Evidence path |
| --- | --- | --- | --- | --- |
| EVAL-01 | BLOCKED | `npm ci` / `npm run build` | The model session reached its usage limit before final checks; esbuild reported workspace sandbox access denial. | Isolated run log `codex-run02.jsonl` (untracked audit log in scratch clone) |
| EVAL-02..08 | NOT RUN | No first-output evaluation was completed. | Do not score partial output. | — |
