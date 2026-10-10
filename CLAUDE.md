# mellon

A local-first password manager prototype — see [README.md](README.md).

- Run tests: `bun run test`, e2e: `bun run test:e2e`.
- Harness checks: `bun run harness:check`.
- Tasks live on the `mellon` board — see [harness/feature-workflow.md](harness/feature-workflow.md).

## Stack rules

Rules specific to this project's stack. Shared rules belong in `laidrivm/harness`;
`harness/` is a synced copy and must not be edited here.

- Treat a CouchDB write that returns without `ok: true` as a failure — nano
  throws only on an error status, not on a redirected or non-CouchDB reply.

@harness/rules.md
