# Phase 05 — Evidence retrieval and LLM provider boundary

**Status:** Delivered. **Source phase:** original product implementation Task 5.

## Objective

Answer support questions from indexed workspace documents and abstain when evidence is missing.

## Delivered scope

- Migration-managed PostgreSQL `tsvector` trigger, parameterized lexical search, stable ordering, five-chunk cap, and exact-substring fallback when a query parses to no terms.
- Retrieval excludes failed/deleted documents and returns source/page/section evidence.
- `AnswerPolicy` bounds context, sets an evidence threshold, treats document text as untrusted, and supports abstention.
- `LlmProvider` interface, deterministic fake, and OpenRouter SSE adapter with server-only key, timeout, cancellation, safe errors, and output caps.

## API, data, and UI boundaries

- Retrieval and provider credentials remain server-side.
- Provider is swappable behind an interface; evaluation fixtures measure retrieval evidence, not model fluency.

## Acceptance criteria

- Relevant chunks rank deterministically within configured caps.
- No-evidence questions abstain without an unnecessary provider call.
- Provider failures, disconnects, and timeouts are bounded.

## Verification evidence

Historical log records PostgreSQL rank, tie order, result cap, exclusion, Arabic fallback, evaluation set, and provider failure/cancellation checks. Live model credentials were not needed.

## Known limits and links

Retrieval is lexical, not embedding search. See [implementation history](../../product/implementation-log.md), [retrieval service](../../../apps/api/src/app/retrieval/retrieval.service.ts), [answer policy](../../../apps/api/src/app/retrieval/answer-policy.ts), and [provider contract](../../../apps/api/src/llm/llm-provider.ts).
