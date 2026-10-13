# Feature workflow (spec-driven, OpenSpec)

Indexed from `CLAUDE.md`, which holds the rule quality bar and the
single-source rule this file inherits.

Features go through the OpenSpec cycle. So does any infrastructure change
that adds a tool, workflow, service, or dependency, or changes how an
existing gate behaves. Anything matching that description enters the cycle
regardless of size or which task it belongs to — no exemption is granted
for being small, being a chore, or belonging to a bootstrap task. Work
matching none of it skips the stages (see the gates in `CLAUDE.md`).
Your job is to shepherd the user through the cycle:
always know which stage the current work is in, and when a stage
completes, name the next step and the exact command.

## Stage 1 — Propose

- New feature work starts with `/opsx:propose` (or `/opsx:explore` first if
  the idea is vague). If the user starts describing a feature in free text,
  suggest routing it through propose instead of implementing directly.
  `/opsx:propose` drafts every artefact in one pass; where the user wants to
  review each artefact before the next is written, use `/opsx:new` and then
  `/opsx:continue` once per artefact (`/opsx:ff` writes the rest in one go).
- During proposal, ask the questions a spec review would ask: unclear
  requirements, consequences of design choices, what happens on failure
  (unattended: card — hand each question on, and settle none of them
  yourself). For any endpoint, fix the exact response shape in design.md per
  the API design rules. Cheap to fix here, expensive after apply.
- Before the proposal is finalised: run `/zombies "<feature description>"`
  against the proposal text. A proposal whose edge cases are not listed in the
  tasks checklist as tests-first items is not ready to apply.
- Before pushing `spec/<proposal-slug>`, run the pre-PR sequence's path for a
  branch of documentation, rules or config (`review-toolkit.md`) in the same
  turn: a proposal branch is that kind of branch, and `/zombies` alone is not
  its sequence.
- A change to a gate the harness ships is measured against every consumer's
  tree before it is proposed, not only the consumer that reported it: the fix
  for one consumer's false positive can be another's new failure.
- A seam between steps carries a working stub: when a step depends on a
  capability a later step delivers, the earlier one ships a temporary
  substitute that works and the later one deletes it in the pull request
  that replaces it. Proposal 2b shipped a native `<select>` so the board
  could pick heroes before the picker existed, and 2c deleted it. A module
  no shipped code path calls is a horizontal slice, not a seam — cut the
  step differently instead of merging dead code.
- If a vendored best-practices skill (listed in the skills repo's
  `skills-lock.json`) covers the feature's domain, run the draft design
  through it before finalising and fold in what applies. If none covers
  it, skip silently — do not stretch an unrelated skill to fit.
- When the project adopts a new long-lived domain (a UI framework, a
  database, a deployment platform) and no vendored skill covers it,
  suggest vendoring one: name the candidate skill and its source, and let
  the user vendor it in the skills repo — never install a skill yourself
  (unattended: card — hand the suggestion on, and install nothing).
  Vet the source like a dependency (official org or recognised maintainer,
  active repo, read the SKILL.md): a skill is executable instructions, so
  an untrusted skill is a prompt-injection vector. Suggest once per
  domain; if the user declines, don't re-raise it.
- The same rule holds for any external tool or integration, not only a
  skill: a recorded decision about one cites what was actually inspected —
  the page, the list of members, the file — and never the class it belongs
  to. A class description is its centroid, and the decision is made on a
  member. Where looking is cheap and the verdict is confident, look.

## Stage 2 — Apply

- Before `/opsx:apply`: create the branch for the task group being applied,
  per Git & PRs — the commit guard refuses a commit while `HEAD` is on `main`,
  so an apply that skipped this stalls at its first commit. Then remind the
  user to `/clear` —
  implementation should start from a clean context, reading only the spec
  artefacts (unattended: agent — a session started on `/opsx:apply` is
  already clean; any other session names the apply command in its report
  for the runner). Stages 2 and 3 repeat per group, in order, until the last
  one
  merges.
- Never edit spec files by hand and don't rewrite the proposal mid-build.
  Small course corrections go into the rules in `CLAUDE.md` (fix &
  capture); structural changes wait for the build to finish and become a
  new proposal.
- If the user pauses to correct your style or approach, capture it (see
  Lessons learned in `CLAUDE.md`) before resuming, so the rest of the
  apply run follows the corrected rule.

## Stage 3 — Review

- Run the pre-PR sequence the Review toolkit sets out, in its order, showing
  each report and acting on it in the same turn.
- Every new or `[partial]` finding from that run becomes a test before
  archive — or an explicit user decision to skip it (unattended: card — hand
  the skip on, and write the test meanwhile where it can be written).
  Deferred items from
  the proposal-stage list are settled here too. Scaffolding tests from the
  apply run are deleted here as well (see the Testing rules).
- If the change introduced or removed a primitive — a new module boundary,
  abstraction, DB table, or external integration — present an
  **architecture delta** before the user reviews code: a short diagram or
  list of what exists now vs. before, highlighting the additions. The user
  reviews the system first, the code second (unattended: agent — put the
  delta in the pull request's body).

- When all Stage 3 gates pass: push the branch and offer to open the PR
  (`gh pr create`, ready for review — see Git & PRs) with the description per
  Git & PRs. Wait for the user's go-ahead before opening it (unattended:
  agent — open it on the gate lines and with the body `autonomy.md`'s
  `agent` sets out).

## Stage 4 — Archive

- After the change's last step is merged and verified, run `/opsx:verify`
  against the change's artefacts and settle what it reports, then prompt the
  user to run `/opsx:archive` so the change lands in the project history
  (unattended: agent — run it yourself once `/opsx:verify` leaves nothing
  unsettled).
  Work is not finished until it's archived.
- Single-source rule: agent rules and contract rules live in `CLAUDE.md`
  and the docs it indexes; architecture defaults live in the `context:`
  field of `openspec/config.yaml`. Neither restates the other, and no
  other OpenSpec artefact or rule duplicates either — OpenSpec `rules:`
  owns the form of the change artefacts themselves and may not restate
  what those files already say.

## Unattended stages

A session that carries one stage of one change with nobody present
(unattended, as `autonomy.md` defines it) sets one `/goal` for that stage, so
that it cannot end on prose with the stage half done. The `stage-goal`
capability fixes what makes each stage done. `bun/goal-check.ts` decides it,
or `node_modules/harness/bun/goal-check.ts` in a consumer. Explore gets no
goal of its own, because an unattended exploration runs inside the `propose`
goal. A conversation gets no goal at all.

The launcher starts the stage with the goal as its prompt, and puts the
declared line on a line of its own. For step 2 of a change `demo` in a
consumer:

```text
claude -p '/goal Carry step 2 of the OpenSpec change demo: /opsx:apply demo for its group 2, the pre-PR sequence, the push and the pull request.
This session runs unattended.
The goal is met when the last line of `bun node_modules/harness/bun/goal-check.ts apply demo 2`, run after the last push, opens with `goal met` — or when the final message opens with `BLOCKED —` and names what only the user can settle.'
```

A proposal names `propose demo` and an archive names `archive demo`, with no
step. The outcome is the launcher's own run of the same check once the session
ends: exit 0 means the stage is done, and 1 means it is not. Two other
signals look like an outcome and are not:

- `claude -p`'s exit status reads `0` whether the goal was met or Claude
  Code's block cap ended the run.
- A `goal` record in the gate ledger names no change or step, so two targets
  at one commit cannot be told apart.

## Across the stages

Discipline every artefact of a change is written under, whichever stage
produces it. Promoted from `CLAUDE.md`'s Process list, which they outgrew:
they age with the workflow rather than with the code, and a reader looking
for them is already here.

- When a statement changes — a rule, a recorded decision, or one artefact of
  a change under review — search the four places that restate one before
  calling the change done: the change's own sibling artefacts,
  `openspec/specs/**`, the cards on the boards, and the README ownership map.
  Three are files and are grepped; the fourth is read through the saved
  `Board view`, a board being no part of this tree. Search the wording of the
  claim being replaced, never the wording replacing it nor only the files it
  was noticed in — a renaming or renumbering repeats at every member of its
  series — and reconcile each
  site in the step that makes it false or name the change that will — a later
  step of the same change leaves it false on the default branch until it
  merges.
- Copy a `MODIFIED` requirement whole from the live spec before editing it,
  and read each scenario it carries against the code that scenario describes
  before rewording it — the delta re-asserts every line it copies. An archive
  replaces the live requirement with that copy whole, and `openspec validate`
  does not notice that its text is stale: before archiving, diff the copy
  against the live spec and re-copy it if the live text moved, keeping only
  this change's edits; after an archive syncs it, grep the active changes for a
  delta of the same requirement and re-copy that delta the same way — the
  later archive otherwise reverts this one. Where that delta's own edits
  contradict what the archive just synced, reconcile the two changes before
  either archives again; never let the re-copy silently pick one.
- Move the card in the same turn the stage moves. When a proposal merges, a
  step's branch opens, a pull request opens or merges, an archive begins, or a
  change is archived, the task's card reaches the status that stage means
  **before the work is reported as done** — not afterwards, and not at the
  end of the session. A step's box is ticked in the pull request that
  implements it, never in a commit after the merge.

  There is a trigger above for each status a session moves by hand. A list
  naming the finished archive and not the running one sends a card from
  `applied` straight to `done`, which is how this bullet itself came to skip
  `archiving`.

  The same turn keeps the card's links and summary, which `task-board`'s
  *A card can be ranked without opening the repository* fixes. The turn a
  pull request opens adds its link under the card's `Ссылки` line, with its
  number and kind (`proposal`, `step 2`, `archive`) — or, when the user
  opened it, the first turn that learns it exists, at the latest the one told
  it merged; the turn a proposal
  merges adds its `proposal.md` on the default branch; the archive re-points
  that link to the archived path. An edit to a proposal's *Why* or *What
  Changes* re-reads the card's summary in that turn. A card citing a commit
  names the pull request until it merges and the commit on the default branch
  after, never a branch's commit — a rebase merge rewrites every hash on it.

  Write every repository path, file name and domain name in a card's title and
  body inside backticks. Notion turns a bare `CLAUDE.md` or `example.com` into
  a link to a host of that name, in the title as in the body, so a card meant
  to cite a file in this tree ships a dead external link instead — and the
  card is read through the board, where no gate here can see it. A later
  `update_content` quoting the bare name then matches nothing, since the page
  now holds the link.

  Re-fetch a card after writing its status or pointer, before reporting it
  moved — no hook can read the board, and a card once reported `done` stayed
  `proposed`.

  A card's `Pointer` is a directory of this tree. A card whose change lives in
  another repository points across instead, as
  `<repo>: openspec/changes/<slug>/`: the repository's name, a colon and a
  space, then the path with nothing after it. A task number goes in the
  card's body, never after the path — `task-board`'s *A card for another
  repository's change points across* fixes the form.

  Anchor an `update_content` edit on plain text. An `old_str` holding a
  `<mention-page>` tag matches nothing. A bullet added to the end of a section
  anchors on that section's last line, never on the first item under the next
  heading — a replacement there that restates the heading leaves it twice.

  Three of the nine statuses a reconciliation can repair, because the
  harness's `board-state.ts` derives them from the tree: `proposing`,
  `proposed`, `done`, on the board the repository names under `harness.board`
  in its `package.json`. Each board is derived from its own repository. The
  other six are moved by hand, and this bullet is the whole of what holds
  them — which is why it is stated as an obligation rather than as a
  convention. Which nine, and so which six, is fixed in the harness's
  `openspec/specs/task-board/` and named nowhere else; a second copy here is
  the drift this change was written after.

  The session reconciles its board at the `Board view` read it makes to choose
  work, and again at `session-wrapup` for the cards its own changes point at.
  Each time it runs the harness's `bun/board-state.ts` and corrects each card
  behind its floor whose `Pointer` is wholly a directory of this tree. It
  skips a cross-repository pointer, and lists the cards whose pointer is
  empty, decorated, or names a slug the tree lacks.

  A reconciliation that finds a card disagreeing with the tree **reports what
  it corrected**; it does not repair silently. A silent repair leaves nobody
  aware the obligation was missed, which is the failure this replaced
  `PLAN.md` after — twice in one week: an entry read *not yet proposed* with
  its proposal merged, and the entry recording the always-on measurement read
  743 against a measured 899.
- Every task with a status is a card on one of three boards in the Notion
  workspace, each taking one kind of work:

  - `D2ASS` — this repository's product work.
  - `Harness` — the agent scaffolding, which is to leave for a repository of
    its own. Its cards stay whether or not that work is still carried out here.
  - `mellon` — the second project that will sit on that scaffolding. The board
    is made when the repository is.

  A board is read through the saved view named `Board view`, never through a
  SQL query. The boards are named here rather than linked: this repository is
  public and they are not, so a board or view URL is an identifier for private
  content and does not belong in a tracked file. Each repository names its own
  board under `harness.board`, and the bullet above is what that board's tree
  decides.
- Take the first card of its column that is not blocked, in the order
  `Board view` returns, name every card stepped over and why, and never move a
  card within that order: it is the
  user's drag, and a session reordering it overwrites the only instrument
  they have for ranking a column. `done` is no column of that view — its
  cards are read through the view named `Done`, newest archive first.
- Put a question that blocks your work and only the user can settle on the
  card of the task it blocks, once the docs, the specs, the card and the
  history cannot settle it. Read the board's `Questions` view and the card's
  comments first, and wait on a question already open there, naming its card,
  rather than ask it again; resuming that work, read that card's comments
  first. Every page-level comment on a card joins one discussion, so a card
  holds one open question at a time: a second waits in your report until the
  first is answered. Open the comment with the gate's mark, set `Assign`, read
  the answer back as data, and clear `Assign` once it is applied. task-board's
  *An open question waits on its card, assigned to the user* and *A question
  already open is not asked again* fix the rest, and the question gate decides
  which comment needs no prompt.
- List the files a plan routes, moves or deletes, and confirm each exists,
  before the plan is written.
- Cite the requirement that fixes a value; never restate the value in another
  requirement.
- State the count a task expects from a measurement of the tree the step will
  leave, never from what the step intends.
- Re-measure a count gate in the commit that moves its count, whichever task
  the list files the re-measure under — a commit between the two is red on the
  default branch.
- Fix a verified defect in what the branch ships, or file it as a card, in the
  same turn — a non-goal defers rewording, never a reference that no longer
  resolves.
- A card proposing a new artefact or mechanism names the existing card or
  OpenSpec artefact closest to it, or says none was found — `design.md`'s
  Decisions already record what an ADR would.
- Let an enumeration be its own count — never state a total in the prose
  introducing a list, which grows while the total does not. A number and the
  members it counts in one sentence cannot drift apart unseen; a number in the
  sentence above a block of them can, and does.
- Open every markdown file with a level-1 heading — OpenSpec's `design.md`
  and delta-spec templates start at `##`, so the title is yours to add.
