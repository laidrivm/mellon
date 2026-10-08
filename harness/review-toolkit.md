# Review toolkit

Indexed from `CLAUDE.md`, which holds the rule quality bar and the
single-source rule this file inherits.

Review skills live in `.claude/skills/`, symlinked into the harness package
`bun.lock` pins — edit them in the harness repository, not here;
`/ponytail-review` comes from the ponytail plugin.

Show a review skill's report, then act on it in the same turn: apply the
findings that hold against the current code, and say which you skip and why.
The report alone is never the deliverable — a turn ending on a gate line that
reads `OPEN` over unapplied fixes is a turn abandoned halfway. Close it, or
write `BLOCKED` and name what only the user can settle. `OPEN` over a proposed
Major or Critical dismissal is the exception: that one ends the turn by
design, because settling it is the user's.

## The skills

- `/zombies [feature]` — test ideas via the ZOMBIES heuristic. With args:
  works from a feature description (pre-code). Without args: diff mode,
  cross-referenced against existing tests.
- `/warm [base]` — WARM check of dependencies the branch pulls in. The change
  is not done until its dependencies are vetted.
- `/ponytail-review` — over-engineering pass over the diff, available and not
  a gate. It stood in the sequence below until 2026-08-26 and was removed on
  its own record: across the eight branches of that session it returned eight
  findings, every one about shape and none a defect, and three branches it
  read returned nothing at all. Worse, it read an enumeration the `CLAUDE.md`
  scan rule forbids and accepted it, which `/coderabbit` then caught — so the
  step was not merely quiet but agreeing. `docs/context/pipeline-yield-*.md`
  holds the counts. Run it when a diff feels overbuilt; nothing waits on it.
- `/triage [base]` — risk-ordered map of the branch diff. Invoke it yourself.
  It returns no findings by design, so acting on it means reading the files it
  ranks High and Medium, reporting the defects they hold, and grepping every
  decision or value the diff changes for the sites that restate it.
- `/coderabbit-local [base]` — the same review against the working branch,
  before there is a PR. Invoke it yourself. A finding that survives
  verification is applied without asking, whatever its severity, overriding the
  skill's own "No fixes before approval" — the branch is unpushed, so being
  wrong costs a `git checkout`. Dismissing a 🟠 Major or 🔴 Critical goes the
  other way: it is put to the user with what the bot missed, and the gate line
  reads `OPEN` until they settle it, because a wrong dismissal reaches the
  merge where a wrong fix does not. At most three reviews with fixes between them; stop
  early the moment a review returns nothing above 🟡 Minor, and if Major or
  above survives the third, report it and stop rather than starting a fourth.
  Collect Minor findings across all passes and report them once at the end,
  each fixed or skipped with its reason. The CLI does not read
  `.coderabbit.yaml` on its own, so the skill passes it explicitly — a local
  review that skips that is a differently aligned reviewer, not a cheaper one.
- `/coderabbit [pr]` — chews the bot's PR comments. Its
  `disable-model-invocation` flag reserves it for the user, because the bot's
  review arrives on its own schedule and waiting for it burns a session doing
  nothing — the cost is the wait, which a synchronous CLI review does not
  have, and that is the whole difference between this bullet and the one above
  it. Once a PR is open, say so and stop —
  do not poll the checks, do not sleep on a timer, do not re-run `gh` to see
  whether the bot has posted. Once the user does invoke it, dispose of the
  findings on the same terms as `/coderabbit-local`: any verified finding
  applied without asking, a Major or Critical dismissal put to the user,
  Minor read and then fixed or skipped with its reason, overriding the skill's
  "No fixes before approval". Invoking it is the approval for the fixes — the
  user is present by definition, and a wrong fix on an open PR costs one more
  commit on a branch already under review. A merged PR still collects reviews:
  re-fetch it once after the merge, because a finding posted while it was being
  merged exists in the API and in no report. The same holds before it: the
  bot's review lands on its own schedule and can arrive after a local pass has
  already reported, so treat `Actionable comments posted: N` as what one review
  posted inline rather than what the pull request holds — a second review, and
  a collapsed out-of-grid section, are each counted separately.

## The pre-PR sequence

Before every PR that changes code — a feature, a bugfix, a chore alike, and
whether or not it goes through the OpenSpec stages. Completing a task group
starts the sequence in the same turn; never ask whether to run it.

1. `bun run diff-budget`, first, because over budget says the reviewable unit
   was cut too wide rather than that the code is wrong — and re-cutting it
   changes the diff every gate below reads. It reports how many lines the
   reviewer must read, and names its own thresholds and, where it has one, the
   remedy in the gate line, so a reader never looks either up here. A gate
   that reports it could not measure is neither over budget nor within it: it
   means the base is unresolvable, and in CI it fails the check rather than
   passing unmeasured.
2. `/zombies` with **no arguments** — diff mode reads the real code and
   existing tests, cross-checks the implementation against the
   proposal-stage edge-case list, and catches the edges only implementation
   decisions create. Fix what it finds.
3. `/warm`, only when a dependency manifest changed, having walked the
   ponytail ladder before ever reaching for a dependency.
4. `/triage`, over the final diff, so it maps the diff the reviewer
   will actually see.
5. `/coderabbit-local` last, then push.

CI measures the budget on every pull request and the pre-push hook measures it
last of all, once every gate that can refuse the push has passed. Neither is
the first reading: a count that arrives with the push arrives after the step
it would have told you to re-cut, and a branch never pushed is a branch never
measured.

A branch of documentation, rules or config runs step 1, then `/triage` alone,
plus a grep for every site restating what it changes, plus `bun test` when it
adds or removes a directory under `openspec/changes/` — a test pins the tree's
change set — then one pass of `/coderabbit-local` — one, not three.

Your sequence ends there — the PR link is the deliverable. `/coderabbit`
closes the loop on either, whenever the user chooses to run it.
