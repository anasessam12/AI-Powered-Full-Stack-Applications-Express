# Phase 07 — Angular authentication and Admin workspace

**Status:** Delivered. **Source phase:** original product implementation Task 7.

## Objective

Provide a responsive Angular shell and clear Admin workflows for accounts and knowledge documents.

## Delivered scope

- Username/password sign-in, in-memory session state, API restore, logout, cookie credentials, and CSRF headers.
- Role-aware navigation and guards; Admin user provisioning/role/activation and document upload/status/retry/delete.
- Responsive workspace styling with visible loading, status, and error states.

## API, data, and UI boundaries

- Angular owns presentation and transient client state only; passwords/session secrets are not stored in localStorage.
- NestJS enforces permissions and input validation regardless of client routing.
- Agents do not see Admin navigation.

## Acceptance criteria

- Login, restore, logout, and CSRF behavior work.
- Admin actions show useful outcomes.
- Agent navigation does not expose Admin routes.

## Verification evidence

Historical log records Angular unit coverage for authentication, guards, user management, and document flows, with lint and production build passing.

## Known limits and links

The interim Agent route from this phase was replaced in Phase 08. See [implementation history](../../product/implementation-log.md), [routes](../../../apps/web/src/app/app.routes.ts), [session client](../../../apps/web/src/app/core/auth/session.service.ts), and [Admin screens](../../../apps/web/src/app/admin/).
