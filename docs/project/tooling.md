# Tooling inventory

Status: Partial, measured 18 October 2026. Update after choosing the coding agent and installing target tooling.

## Observed

| Item | Observed value | Evidence / limitation |
| --- | --- | --- |
| Repository branch | `Anas-Essam-branch` | `git branch --show-current` |
| Baseline commit | `998bc8662613904b3d50dcfacfe636447822291c` | `git rev-parse HEAD` |
| Project Node requirement | `>=22.13` | `package.json` engines |
| Host Node/npm | `v24.21.0` / `11.19.0` | terminal `node --version`, `npm --version` |
| Angular migration pair selected from Run 01 | Angular `21.2.25`, CLI/build `21.2.27`, Node `24.21.0` | First run resolved these versions; keep the same lockfile-resolved pair in Runs 02–04 for comparability. The earlier Angular 22.1.8 candidate was not used. |
| Project dependencies | Express 5, dotenv, multer, pdf-parse | package manifest; lockfile present |
| Baseline tests | Node built-in test runner; 4/4 pass | local loopback test required approved unsandboxed execution |
| Angular workspace / project dependencies | Not present in this checkout | no `angular.json` or local Angular framework package |
| Global Angular CLI | `22.1.8` | `ng version`; global CLI only |
| Angular CLI MCP command | `ng mcp --help` lists the command and options | MCP server not started; no Angular workspace to bind |
| Angular CLI MCP tools in this Codex session | Not available in active tool list | CLI being installed globally does not attach MCP tools to this session |
| Angular Agent Skills | Not verified as installed/available to chosen coding agent | official installation guide reviewed; no install run |
| External coding-agent CLIs | Codex CLI `0.160.1`; Gemini CLI `0.62.0`; Cursor Agent unavailable on PATH | Installed globally; not run as experiment agents. This inventory records the active Codex desktop session only. |
| Active session model | Codex desktop, GPT-6 family | Exact model alias and reasoning effort are not exposed in this session's tool output; record the alias shown to the participant before comparing runs |
| NestJS | No Nest workspace in this checkout | Nest skill is locally available to Codex |
| Impeccable | Skill locally available to Codex | no project context command run; no UI edits requested in this setup task |
| Superpowers | Skills loaded for planning/execution | see `docs/superpowers/plans/2026-10-18-agentic-workshop.md` |
| Global NestJS CLI | `12.0.1` | `npm ls -g --depth=0`; no local Nest workspace |
| Dependency installation | Not run | existing Express `node_modules` present; Angular/Nest app dependencies not installed |

Workspace bundled Node runtime also provides runtime packages for document workflows; it does not indicate Angular, Nest, or PostgreSQL dependencies exist in this repo. Global Angular/Nest CLIs only generate or operate on workspaces; they are not project dependencies.

## Before starting a run, fill in

```text
Coding agent / version:
Model identifier / effort:
System prompt and active AGENTS/instructions:
Superpowers version / activated skills:
Impeccable version / command context:
Angular skill source and commit:
Angular CLI and Angular version:
Angular CLI MCP host config and available tool names:
Node version and package manager / version:
NestJS version (bonus only):
PostgreSQL version / isolated test database:
Network, install, and provider access:
Per-run time / token / cost limit:
```

Do not record credentials in this file. Use a local environment variable for provider authentication; use synthetic prompts/data; never copy a shared key from a page into the repo or logs.

## Reproducing the baseline check

```powershell
node --version
npm --version
npm test
```

The HTTP integration test opens an ephemeral localhost port. Run it in an environment where local loopback is permitted, and record sandbox/network restrictions accurately.
