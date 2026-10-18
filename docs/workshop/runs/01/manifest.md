# Run 01 — Basic Prompt

Status: First output evaluated; no human repair applied.

Source commit / `frontend/index.html` SHA-256: `998bc8662613904b3d50dcfacfe636447822291c` / `30D21AA08129EEFDBE2FB0ACB79FD9720380BDF97CACD36EF320A1254FF04964`; verify again before run.
Workspace and fresh session: `.superpowers/sdd/agentic-workshop/workspaces/run-01`; fresh ephemeral Codex CLI session.
Agent/version / model ID / effort: Codex CLI `0.160.1`; `gpt-6.1-sol`, medium.
Active system instructions, skills, MCP, hooks, memory: Codex CLI config and repository instructions; agent independently loaded Superpowers brainstorming/planning/debugging/review and computer-use skills; CUA browser MCP used for smoke testing. No Angular MCP tools were connected. Skills/instructions were not disabled, a known Basic-prompt confounder.
Runtime and target versions: Node `v24.21.0`, npm `11.19.0`; Angular `21.2.25`, CLI/build `21.2.27`, TypeScript `5.9.3`; Express API kept in this run.
Prompt source: section Run 01 in `docs/workshop/05-templates-and-prompts.md`.
Start / first output / total time: started 2026-10-18; total `417.9 s`; CLI reported completion at 2026-10-18 22:47:38 +03:00.
Tokens / cost: CLI usage `3,122,797` input (including `3,019,392` cached), `17,779` output, `2,485` reasoning; currency cost unavailable.
Agent self-repairs / human interventions: one agent correction after an asynchronous-health test timing failure; zero human code interventions before snapshot.
First-output snapshot / repaired snapshot: `5974345ca20162474cc8ff83b2952dece60e514f` on branch `codex/workshop-run-01-basic`; no post-snapshot repair.
Evaluation checklist: `docs/workshop/evaluation-checklist.md` v1
Results and evidence: see [evidence](evidence.md). Angular version was selected by the agent because no version was in the Basic prompt; standardize Runs 02–04 on the resolved pair above.
Confounders / inherited gaps / regressions: Skills were available globally and agent chose to load them. Backend PDF parser was modified even though the task was frontend migration. Conversation history endpoints remain stubs from baseline. Mobile viewport and permission checks against a live API were not exercised.
