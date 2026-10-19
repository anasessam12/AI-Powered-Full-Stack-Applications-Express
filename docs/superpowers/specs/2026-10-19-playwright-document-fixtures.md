# Playwright Data and UI Validation Specification

## Goal

Use realistic local document fixtures to verify the Angular support workspace end to end with Playwright, including seed visibility, document indexing, role restrictions, grounded answers, and persisted conversation state.

## Scope

- Seed one Markdown, one plain-text, and one searchable PDF knowledge document alongside the existing account-security Markdown fixture in both local and dedicated test modes.
- Reuse the production document ingestion path so PDFs receive the same extraction and page metadata as user uploads.
- Run browser acceptance tests only against a dedicated loopback PostgreSQL database whose name ends in `_test`.
- Verify Admin and Agent accounts, indexed document rows, source citations, conversation persistence, denied Admin-only access, and unsupported-file validation.
- Keep test-only LLM responses deterministic; never call an external provider during Playwright runs.

## Acceptance Criteria

1. Local and E2E seed commands add all four documents idempotently, with `INDEXED` status and searchable chunks; PDF chunks retain page number 1.
2. The Admin UI displays both seeded users and all four indexed documents after their API requests finish.
3. An Agent can ask one matching question per seeded source and see the matching source citation; conversations remain visible after reload.
4. A question with no matching evidence receives an abstention and no citations.
5. Agents cannot access user administration, and unsupported uploads show validation feedback without attempting an upload.
6. Playwright starts isolated API and web servers and refuses unsafe database targets before truncating test tables.

Search removes common English question words, matches remaining terms against the PostgreSQL full-text index, and applies a default evidence score threshold of `0.25` before answer generation. The threshold remains configurable through `RETRIEVAL_MIN_SCORE`.

## Test Fixtures

- `account-security.md`: change a password immediately if a development credential is exposed.
- `returns-policy.txt`: unused items may be returned within 30 days of delivery.
- `exchange-policy.md`: exchanges may be requested within 14 days of delivery.
- `billing-policy.pdf`: card refunds carry a 2% processing fee.

## Non-Goals

- Do not seed these fixtures into production or any non-local database.
- Do not use Docker or a live LLM provider.
- Do not make changes to the product's visual design.
