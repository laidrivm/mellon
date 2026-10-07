# Harness rules

## Lessons learned (fix & capture)

### The loop — agent responsibilities

Whenever a mistake is confirmed — a bug the user reports, a failed test, a
review finding (human, /triage, /zombies, /warm, /ponytail-review, or
CodeRabbit) the user agrees with, or a mistake you catch in your own earlier
output — do BOTH.
The same applies to **style preferences**: when the user pauses an apply run
(or any task) to say "do it this way instead", that correction is a lesson —
capture it exactly like a bug, so future runs don't repeat the old style:

1. Fix the code.
2. Capture the lesson, in the same turn, before treating the task as done:
   - If it's about how code should be written here → propose a one-line rule
     for the matching sublist of "Rules" below — Code, Process or Safety —
     and add it after the user confirms.
   - If it's about how reviews should be run → say the fix belongs in the
     corresponding skill in the shared skills repo, and propose the exact
     wording (do not edit the skill from this project).
   - If it's a Minor that a local review raised and you skipped → it becomes a
     rule only when the reason is a settled project convention the bot
     cannot know; a one-off keeps its reason in the report and becomes no
     rule. A rule here *or in the docs this file indexes* is read back by the
     next review, since `.coderabbit.yaml` points `code_guidelines` at both
     `**/CLAUDE.md` and `docs/*.md` — so being read back never decides which
     of the two a rule goes in, and the always-on budget is free to.
   - If it's a one-off (typo, misread requirement, wrong file) → say
     "not capturing this" and why. Not every bug becomes a rule.

Rule quality bar — a rule must be:
- **Checkable**: pass/fail is obvious from reading a diff.
  Good: "Invalidate previously issued OTP codes when generating a new one."
  Bad: "Be careful with auth logic."
- **One line**, imperative mood; give the reason after a dash only where the
  rule alone would be misapplied.
- **Non-duplicate**: before adding, re-read the list; if a similar rule
  exists, tighten that rule instead of appending a variant.

### Maintenance & growth

This file is the only one read at the start of every session; a doc it indexes
is read on demand and costs nothing until then. The trigger fires when this
file passes ~350 lines, when one sublist below passes ~20 rules, or when rules
from this file's middle are observably being ignored — the harness's
`openspec/specs/context-budget/` and `openspec/specs/agent-rulebook/` fix
those two figures. What a fired trigger asks for — promotion, deletion, the
protocol for extracting a section or relocating one off the tree, and where a
session save-point lives — is in [rulebook-growth.md](rulebook-growth.md), and
never a second always-on file.

### Rules

What counts as evidence for a claim — environments, external contracts,
observability, causal claims — see [verification.md](verification.md).

#### Code

Rules about this application's code. They age with it: when the code a rule
describes is rewritten, the rule is a candidate for deletion.

- Inline a single-caller helper only after grepping for the logic it duplicates
  elsewhere, and keep one whose comment documents a decision its call site would
  bury.
- A guard against malformed input must cover the whole value, not a prefix —
  anchor both ends or parse it.
- Read a value a tool consumes from the structure that tool parses, and where it
  takes effect — never from a line of the file that resembles it.
- Scope a scan by what it exempts, never by an enumeration of what it covers —
  the collections the scan itself walks included.
- State a scan's exemptions in the scan; never inherit them from another tool's
  configuration.
- Scan source left to right carrying string, comment, template-expression and
  regex-literal state, restoring the enclosing state when a nested construct
  closes, and name which of those the language being scanned has.
- Read a literal's contents from the source at the offset the scan reached,
  never from the copy the scan blanked.
- Where a delimiter's meaning depends on the position within a construct, track
  that position, never infer it from a nesting count.
- Comment what a reader would otherwise "fix" — a deliberate departure from the
  obvious implementation, or a precondition the code does not check — and
  re-read that comment when the code under it moves: one naming a check the
  code no longer makes is a defect no test sees.
- Derive a case's subject inside the case, never in the describe body — a
  throw while the block is collected removes its cases and reports the smaller
  count as a pass.
- Await a rejection from a driver's query object through `then(ok, err)`,
  never `expect().rejects`, which hangs on a thenable instead of failing.
- Give a test hook that spawns synchronously an explicit timeout — bun cannot
  fire the default one while the call blocks, so the hook overruns and is
  reported with a time no configured limit explains.
- Convert a `file:` URL with `fileURLToPath` before handing it to the
  filesystem; never `.pathname`, which stays percent-encoded.
- Compare prose across a line wrap by normalising whitespace, never by matching
  a raw substring.

#### Process

Rules about how work is carried out here. They do not age with the code.

- Confirm a path is tracked before a check or a claim depends on it — a
  gitignored file is present for the author and absent in a clone.
- Build the environment a spawned command runs under from what the case needs,
  and start it in a directory holding no `.env` — bun fills a variable the case
  left out from the `.env` where the process starts.
- Restore a file a probe edited from a copy taken before it, never with `git
  checkout` or `git stash` — the first discards every uncommitted change in
  that file rather than the probe alone, and the second unstages what the
  index was holding.
- A rules or docs edit that no artefact of the change under way asks for goes
  in its own commit.
- Never silence a linter or type-checker finding by disabling its rule in
  configuration; fix the code or ask the user to approve a suppression.
- All repo artefacts — docs, plans, specs, code comments, commit messages —
  are written in British English by default (`behaviour`, `afterwards`);
  identifiers and third-party API names keep whatever spelling they ship with.
- Script a string replacement only for a pattern repeating across files, assert
  the match count, and read the changed passage back — a diff stat, a token
  count and a silent no-op all read as a successful edit.
- Edit a file with the editing tool, never a shell heredoc, when its text
  carries a backtick or `${`.
- Write a commit message from the staged diff, never from the last change made.
- Verify a test file's split by the full describe path of every test, never by
  their count — a block absorbed into its neighbour runs exactly as many.
- Split a file to the cap that will apply to it, not the one that applies
  today, and re-measure the diff budget afterwards — a split counts its moved
  lines in it twice.
- A suite that may skip locally fails the CI job that owns it when it skips
  there — supply what it needs, and assert it ran.
- Cite the requirement that fixes a value; never restate the value in another
  requirement.
- Grep a claim's own wording when correcting it, never the files it was noticed
  in — a claim repeats wherever its subject is discussed, and a renaming or
  renumbering repeats at every member of its series.
- Apply a rule the branch adds to the artefacts the branch already carries,
  before it is pushed.
- Commit an edit in a repo another session works in before handing the turn
  back — its `git add -A` takes whatever the tree holds.
- Re-measure a count gate in the commit that moves its count, whichever task
  the list files the re-measure under — a commit between the two is red on the
  default branch.
- State the count a task expects from a measurement of the tree the step will
  leave, never from what the step intends.
- After re-pinning a Git dependency with `bun add`, run `bun install` and
  confirm the lockfile's workspace block names it once — bun writes the new
  specifier beside the old.
- Fix a verified defect in what the branch ships, or file it as a card, in the
  same turn — a non-goal defers rewording, never a reference that no longer
  resolves.
- List the files a plan routes, moves or deletes, and confirm each exists,
  before the plan is written.

#### Safety

Rules that keep something out of the repository or off the machine. They do
not age with the code.

- Before the first dependency install or tool run in a repo, verify
  `.gitignore` covers its outputs (`node_modules`, build dirs, local
  settings) with no trailing slash.
- Reconcile a vendored skill's `allowed-tools` and `disable-model-invocation`
  against this project's policy before the skill is used.
- Run every npm-family command the `playwright-cli` skill or its references
  name through bun instead — `npx` as `bunx`, `npm run` as `bun run`,
  `npm install -g` as `bun add -g`, `npm init` as `bun create` — since its own
  are denied here.
- Beside a pinned image, binary or digest that no dependency manifest tracks,
  write which tool updates the pin, or that nothing does.
- Gate a suite that runs destructive SQL on a variable saying the database is
  disposable, never on the connection string alone.
- After a generator runs, compare the directories it writes against a listing
  taken before it, ignored ones included — `git status` hides what
  `.gitignore` covers.
