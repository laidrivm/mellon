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
  requirements, consequences of design choices, what happens on failure.
  For any endpoint, fix the exact response shape in design.md per the
  API design rules. Cheap to fix here, expensive after apply.
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
  the user vendor it in the skills repo — never install a skill yourself.
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
  artefacts. Stages 2 and 3 repeat per group, in order, until the last one
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
  archive — or an explicit user decision to skip it. Deferred items from
  the proposal-stage list are settled here too. Scaffolding tests from the
  apply run are deleted here as well (see the Testing rules).
- If the change introduced or removed a primitive — a new module boundary,
  abstraction, DB table, or external integration — present an
  **architecture delta** before the user reviews code: a short diagram or
  list of what exists now vs. before, highlighting the additions. The user
  reviews the system first, the code second.

- When all Stage 3 gates pass: push the branch and offer to open the PR
  (`gh pr create`, ready for review — see Git & PRs) with the description per
  Git & PRs. Wait for the user's go-ahead before opening it.

## Stage 4 — Archive

- After the change's last step is merged and verified, run `/opsx:verify`
  against the change's artefacts and settle what it reports, then prompt the
  user to run `/opsx:archive` so the change lands in the project history.
  Work is not finished until it's archived.
- Single-source rule: agent rules and contract rules live in `CLAUDE.md`
  and the docs it indexes; architecture defaults live in the `context:`
  field of `openspec/config.yaml`. Neither restates the other, and no
  other OpenSpec artefact or rule duplicates either — OpenSpec `rules:`
  owns the form of the change artefacts themselves and may not restate
  what those files already say.

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
  claim being replaced, never the wording replacing it, and reconcile each
  site in the step that makes it false or name the change that will — a later
  step of the same change leaves it false on the default branch until it
  merges.
- Copy a `MODIFIED` requirement whole from the live spec before editing it,
  and read each scenario it carries against the code that scenario describes
  before rewording it — the delta re-asserts every line it copies.
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
  number and kind (`proposal`, `step 2`, `archive`); the turn a proposal
  merges adds its `proposal.md` on the default branch; the archive re-points
  that link to the archived path. An edit to a proposal's *Why* or *What
  Changes* re-reads the card's summary in that turn. A card citing a commit
  names the pull request until it merges and the commit on the default branch
  after, never a branch's commit — a rebase merge rewrites every hash on it.

  Write every repository path in a card's body inside backticks. Notion turns
  a bare `CLAUDE.md` into a link to a host of that name, so a card meant to
  cite a file in this tree ships a dead external link instead — and the card
  is read through the board, where no gate here can see it.

  Three of the nine statuses a reconciliation can repair, because the
  harness's `board-state.ts` derives them from the tree: `proposing`,
  `proposed`, `done`, and only on `D2ASS`. The other six, and every card on
  `Harness` or `mellon`, are honoured rather than mechanised, and this bullet
  is the whole of what holds them — which is why it is stated as an obligation
  rather than as a convention. Which nine, and so which six, is fixed in the
  harness's `openspec/specs/task-board/` and named nowhere else; a second copy
  here is the drift this change was written after.

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
  content and does not belong in a tracked file. Which statuses the
  harness's `board-state.ts` derives, and on which board, is the bullet above.
- Take the first card of its column that is not blocked, in the order
  `Board view` returns, name every card stepped over and why, and never move a
  card within that order: it is the
  user's drag, and a session reordering it overwrites the only instrument
  they have for ranking a column. `done` is no column of that view — its
  cards are read through the view named `Done`, newest archive first.
- Let an enumeration be its own count — never state a total in the prose
  introducing a list, which grows while the total does not. A number and the
  members it counts in one sentence cannot drift apart unseen; a number in the
  sentence above a block of them can, and does.
- Open every markdown file with a level-1 heading — OpenSpec's `design.md`
  and delta-spec templates start at `##`, so the title is yours to add.
