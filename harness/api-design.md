# API design

Indexed from `CLAUDE.md`, which holds the rule quality bar and the
single-source rule this file inherits.

The API is a product; its consumer is a TypeScript frontend. Contract rules
— all checkable in a diff:

- Every endpoint responds through an explicit response schema (zod/typebox
  or equivalent) — never a raw ORM/DB object. The TypeScript response type
  derives from that schema, not the other way round.
- Honest types: booleans are `true`/`false` (never 0/1), enums are strings
  (`"published"`, not magic numbers), timestamps are ISO 8601 with offset. A
  field that is a calendar day rather than an instant is `YYYY-MM-DD` and says
  so where it is declared; anything comparing it against a timestamp states
  the calendar it converts on.
- Every contract key is always present; an absent value is `null`. No
  dynamic or conditional keys.
- camelCase everywhere in JSON — including error bodies and pagination
  metadata. Postgres columns are the one exception and stay `snake_case`,
  because an unquoted identifier folds to lowercase; the exporter renames at
  that boundary.
- An ID an endpoint accepts or a consumer resolves is a UUIDv7 — never an
  incremental integer, no ulid/uuid packages — and the server mints its own
  with `Bun.randomUUIDv7()` (time-sortable) rather than a package. An ID that
  no endpoint accepts and no consumer resolves, travelling only inside a
  payload, is exempt and carries that reason where it is declared.
- Display-ready fields are computed server-side once (assembled URLs,
  initials) instead of in every consumer.
- Errors follow RFC 9457 (`application/problem+json`) with two extension
  fields: a machine-readable `code` (frontend logic keys off codes, never
  off message strings) and an `action` hint, `null` when the user can do
  nothing about the error.
- CORS is configured server-side together with the first endpoint — a
  consumer staring at a CORS error means the backend isn't finished.
- List endpoints use cursor pagination unless the list is small and
  internal-only.

Architecture defaults (SSE vs WebSockets, BFF response shaping, caching,
N+1 policy) live in the `context:` field of `openspec/config.yaml` — apply
them at propose time.
