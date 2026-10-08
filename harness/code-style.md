# Code style

Indexed from `CLAUDE.md`, which holds the rule quality bar and the
single-source rule this file inherits.

- Follow the ponytail ruleset: write the least code that works. Before adding
  code, walk the ladder — does this need to exist → is it already in the
  codebase → does the stdlib do it → does Bun/the platform do it natively.
- Prefer deleting code over abstracting it. No speculative flexibility (YAGNI).
- Escape a literal `_` or `%` in a `LIKE` pattern with an explicit `ESCAPE`
  clause, never a backslash inside a template literal, which removes it before
  SQL is parsed.
- Pin on the command line any git behaviour a user's configuration can
  disable, rename detection included.
- Reveal an image when it loads, never hide it when it fails — the `error`
  event is queued, so a failure paints before the handler runs.

## Dependency safety

- Never install a package from memory. Before proposing any dependency,
  verify it on the registry with `bun info <pkg> <field>`, one property path
  per call — for several values take the whole document with `bun info <pkg>
  --json` and filter it yourself: exact name, `repository.url`,
  `time.created` and `time.modified`, plus weekly downloads from
  `https://api.npmjs.org/downloads/point/last-week/<pkg>`, which `bun info`
  does not carry. A package that is young, low-download, or name-adjacent to
  a popular one (0auth/oauth, extra -hf/-js suffixes) is presumed
  slopsquatting — stop and tell the user.
- Never run `bunx` with a package that hasn't passed the check above — it
  bypasses the release-age gate.
- Never pipe remote content into a shell (`curl … | bash`); show the user
  the URL and what it does instead.
- Never add URL or git dependencies to manifests, the harness pinned to a
  full commit excepted — the harness's `manifest-ranges.ts` admits it and no
  other.
- Never add or change a registry (or scoped registry override) in
  bunfig.toml / .npmrc — a registry is a supply-chain root of trust;
  adding one is a user decision, made outside any coding task.
- If a package needs its install scripts, never add it to
  `trustedDependencies` yourself — surface `bun pm untrusted` output and
  let the user decide.
- Automated installs — CI jobs, hooks, scripts — use `bun install
  --frozen-lockfile`; plain `bun install` is only a developer resolving
  versions locally on purpose (it is also what installs the git hooks).
- Never state a framework, library or tool's behaviour from memory — a
  method, a default, a file it reads — check the docs or ask the tool
  itself; models invent all three.

## Accessibility

- Semantic HTML first: native elements (button, select, dialog, details)
  over ARIA-patched divs. Reach for ARIA only where no native element
  exists. Style natives (`appearance: base-select`) instead of rebuilding
  them.
- Every interactive element is keyboard-reachable and operable; a scrollable
  region is operable too — by `::scroll-button`, by being focusable, or by
  content the tab order scrolls into view.
- Every image has an `alt` (empty `alt=""` for decorative); every form
  control has an associated label.
- Dynamic announcements via `role="status"` (`role="alert"` only for
  genuinely urgent interruptions); migrate to `aria-notify` when it ships.
- Visible focus states are never removed without an equal replacement.
