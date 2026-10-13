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
     and add it after the user confirms (unattended: card — hand the wording
     on, as for the skills-repo wording below).
   - If it's about how reviews should be run → say the fix belongs in the
     corresponding skill in the shared skills repo, and propose the exact
     wording (do not edit the skill from this project).
   - If it's a Minor that a local review raised and you skipped → it becomes a
     rule only when the reason is a settled project convention the bot
     cannot know; a one-off keeps its reason in the report and becomes no
     rule. A rule here *or in the docs this file indexes* is read back by the
     next review wherever the repository's `.coderabbit.yaml` names, under
     `code_guidelines`, the paths this file and those docs sit at — so being
     read back never decides which of the two a rule goes in, and the
     always-on budget is free to.
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
What a session does at a step that names the user when it runs unattended —
see [autonomy.md](autonomy.md).

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
- Pin a hook's registration on every field that decides whether it runs and can
  block, never on its command string alone.
- Recognise the entries a tool owns in a shared file by a mark only that tool
  writes, never by a substring a user's own entry can also contain.
- Pin a name one system looks up in another with a test that reads it where it
  is defined, whenever a missing match reads as nothing to do.

#### Process

Rules about how work is carried out here. They do not age with the code.

- Confirm a path is tracked before a check or a claim depends on it — a
  gitignored file is present for the author and absent in a clone, and a glob
  matches a path string whether or not the file exists.
- Never silence a linter or type-checker finding by disabling its rule in
  configuration; fix the code or ask the user to approve a suppression
  (unattended: card — hand the suppression on).
- All repo artefacts — docs, plans, specs, code comments, commit messages —
  are written in British English by default (`behaviour`, `afterwards`);
  identifiers and third-party API names keep whatever spelling they ship with.
- Script a string replacement only for a pattern repeating across files, assert
  the match count, and read the changed passage back — a diff stat, a token
  count and a silent no-op all read as a successful edit.
- Edit a file with the editing tool, never a shell heredoc, when its text
  carries a backtick or `${`.
- Split a file to the cap that will apply to it, not the one that applies
  today, and re-measure the diff budget afterwards — a split counts its moved
  lines in it twice.
- Ask the user to run a command that prompts for a password in a terminal of
  their own, never through the `!` prefix — the prompt there reads no input,
  and the command fails as if the password were wrong (unattended: user —
  report `BLOCKED`, naming the command).
- Before the first `/opsx:` command of a task, find or create its card on the
  board `feature-workflow.md` names and move it to that stage's status — no
  `/opsx:` skill points there, so the card is otherwise missed.
- Commit or push in another checkout with `git -C <literal path>` — never `cd`
  into it, since the command guard also checks the directory the call starts
  in, nor through a shell variable, which the guard cannot resolve and refuses.
- Name in `after:` only a change whose directory the branch already holds,
  under `openspec/changes/` or its archive — `bun/board-state.ts` refuses any
  other slug and `bun/board-state-hygiene.test.ts` runs it over the repository;
  keep the order in the proposal's prose until that change merges.
- Pass a CI gate the base it measures from as the checked-out merge commit's
  first parent, never `pull_request.base.sha`, which does not follow the base
  branch.
- Pass `--full-tree` to a `git ls-tree` whose pathspec names a path from the
  repository root — a working directory below the root resolves it against
  itself and lists nothing.
- Before a commit, run the build's own scan over every file the commit writes
  that the scan covers, since a fixture in a test can be valid input to the
  scan it tests.

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
- Push from a repository's own checkout, never a `git worktree` — a hook there
  hands the tests it runs an absolute `GIT_DIR`.
- Delete a branch, local or remote, only when the user asks for it — never
  folded into a command run for another purpose (unattended: user — delete
  nothing, and name the branch in the report).
- Never run an act the command guard or a permission entry refuses or asks
  about — a commit, a push, a `gh` write, a package command, an edit to a gated
  file — through an interpreter (`python3 -c`, `bun -e`, `node -e`) or a
  throwaway script; both read only the call's own words, so the act walks past.
