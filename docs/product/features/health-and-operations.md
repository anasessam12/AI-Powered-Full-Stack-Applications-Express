# Health and operations

## Health contract

`GET /api/v1/health` checks API readiness against PostgreSQL and returns safe status information. It does not expose connection strings, passwords, or provider secrets. Database failure returns a service-unavailable response.

## Local operations

PostgreSQL is provided by Compose with a persistent named volume, and uploaded bytes use `DOCUMENT_STORAGE_ROOT` (default `var/documents`). Schema changes use TypeORM migrations; automatic schema synchronization is disabled. Local database creation and test database reset are designed as separate guarded workflows. Never point a test URL at shared/deployed data or remove the persistent volume as part of a routine stop.

## Observability and recovery

Provider failures are mapped to safe codes; document failure state is sanitized. Keep secrets out of logs and source control. Back up PostgreSQL and the document-storage directory together because metadata and source bytes are separate. Restore both consistently before serving citations.

The exact package scripts and current-machine setup result are documented in the [development guide](../development.md), [testing guide](../testing.md), and [operations guide](../operations.md). See [health controller](../../../apps/api/src/app/health/health.controller.ts) and [health service](../../../apps/api/src/app/health/health.service.ts).
