# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Admins at one organization provision accounts, manage access, and maintain the support knowledge documents.
- Support agents sign in with a unique username and password, ask internal support questions, review grounded answers and citations, and reopen their own conversation history.

## Product Purpose

Customer Support Assistant helps an internal support team find answers in its approved support documents. It retrieves relevant passages, presents source citations, and abstains when the documents do not provide enough evidence. Success means agents can resolve common questions with less manual document searching while retaining a clear path to verify each answer.

## Positioning

The product grounds answers in the organization's uploaded knowledge, keeps source and page references with each answer, and declines to answer from the corpus when evidence is insufficient.

## Operating Context

Admins create and manage named user accounts, upload PDF/TXT/Markdown knowledge documents, monitor indexing status, retry failed documents, and remove obsolete files. Agents authenticate with their own account, ask support questions, inspect citations, and return to their saved conversation history. The product is an internal single-organization workspace; it is not a public customer support portal.

## Capabilities and Constraints

- Angular web client, NestJS API, and PostgreSQL in an Nx monorepo.
- Username/password authentication, Admin and Agent roles, cookie-backed sessions, CSRF protection, and API-side authorization.
- Durable owner-scoped conversations and messages, server-sent chat events, PostgreSQL full-text retrieval, evidence threshold, citations, and no-evidence abstention.
- Admin user provisioning and lifecycle management; Admin document upload, retry, and deletion.
- Provider credentials stay in the server environment. Local and automated tests use a deterministic fake provider.
- Preserve the existing Express demo as a separate runnable migration reference while the Angular product is built.
- No SSO, public customer portal, billing, email workflows, multi-organization tenancy, or cloud deployment is required for v1.
- Admin workflow priority confirmed for this UI: provide clear guidance and meaningful status at each step.

## Brand Commitments

No company identity, logo, or fixed visual system has been supplied. Use a neutral, replaceable product identity and do not imply company branding.

## Evidence on Hand

- Existing behavior reference: `frontend/index.html` and the runnable Express application.
- Implementation specifications and API contracts: `docs/superpowers/specs/2026-10-18-nx-customer-support-product-design.md`, `docs/product/api.md`, and `libs/api-contract/src/`.
- Test-only support documents and retrieval cases: `apps/api/test/fixtures/knowledge/`. These are synthetic fixtures, not real company policy or customer evidence.
- No production logo, customer testimonials, usage metrics, or real support corpus has been provided. Do not fabricate them.

## Product Principles

- Ground factual answers in approved documents and show where the answer came from.
- Make uncertainty visible; abstain when evidence is insufficient.
- Guide Admins through consequential user and document tasks with clear status and recovery paths.
- Keep identity, session secrets, authorization, and provider credentials under server-side control.
- Preserve the existing demo as a separate reference during migration.

## Accessibility & Inclusion

The Angular interface must be keyboard operable, label controls, expose status updates accessibly, provide readable citations, and adapt to mobile and desktop viewports.
