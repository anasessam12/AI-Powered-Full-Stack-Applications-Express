# User and role administration

## User and journey

An Admin creates and maintains team accounts. Each account has one role: `ADMIN` or `AGENT`, an active flag, and a unique normalized username. Agents cannot access these endpoints.

## API contract

- `GET /api/v1/users` lists safe account details.
- `POST /api/v1/users` provisions an account with username, password, and role.
- `PATCH /api/v1/users/:id` updates supported role/activation fields.

Requests require an active session, CSRF token for mutations, and Admin role. The API validates DTOs and never returns `password_hash`.

## Persistence and security

`users.normalized_username` is unique; password hashes use Argon2id. User deletion is not a UI operation. Database references restrict deletion while the user owns durable data. Last-Admin protections prevent demoting/deactivating the final Admin.

## Failure behavior and tests

Duplicate usernames conflict; invalid fields fail validation; Agents receive 403 for Admin operations. Angular route guards hide the UI but API guards remain authoritative. See [users controller](../../../apps/api/src/app/users/users.controller.ts), [service](../../../apps/api/src/app/users/users.service.ts), and [Admin UI](../../../apps/web/src/app/admin/users/users-page.component.ts).
