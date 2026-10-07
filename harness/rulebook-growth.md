# Rulebook growth

Indexed from `CLAUDE.md`, which holds the rule quality bar, the single-source
rule and the fix & capture routing this file inherits. A rule here is added,
tightened or deleted by the same loop, and must clear the same bar: checkable
from a diff, one line, imperative, non-duplicate.

What to do once one of the maintenance triggers `CLAUDE.md` states has fired:
how a rule leaves a sublist, and how a section leaves an always-on file.

## A sublist past its trigger

- Propose merging or promoting stable clusters out of the sublist that fired
  into `CLAUDE.md`'s "Code style" section or the docs indexed there — the other
  two sublists are not counted against it. A Code rule also leaves by being deleted
  once the code it describes is rewritten; a Process or Safety rule leaves by
  promotion, or by the bullet below when it stops applying at all.
- If a rule stops applying (dependency removed, approach changed), propose
  deleting it — a stale rule costs trust in the whole list.

## An always-on file past its trigger

`CLAUDE.md` must stay readable in one sitting. Keep it small; do not add to it
beyond the fix & capture loop. When it outgrows itself, split by this protocol:

- **What the budget counts**: the always-on files themselves. A file indexed
  from `CLAUDE.md` under `docs/` is read when its topic comes up and does not
  count — that exclusion is what makes extraction a real remedy rather than the
  same lines under another name.
- **Move whole sections only** (e.g. "API design", "E2E") to
  `docs/<topic>.md`, leaving one line in `CLAUDE.md`: the section's scope + the
  link. Never split one topic across two homes.
- **Extraction is not the only remedy; relocation is the other**, and what
  picks between them is whether the section is read or written. Extraction
  moves what a session **reads** on demand — a rule, a contract, a protocol —
  and its new home is a file in this tree indexed from `CLAUDE.md`. Relocation
  moves what a session **writes**: a status, which no file is the right
  instrument for, because a file records it only if somebody remembers to type
  it and nothing reads it back to check. Its new home is outside the tree
  entirely — the boards `feature-workflow.md` names — and the section
  leaves rather than shrinking. Test it by asking what the section's lines are
  for: if the
  answer is *so that a later session knows where this stands*, no `docs/` file
  fixes it, and extracting it only moves the same drift one hop away.
- **`CLAUDE.md` is the only index**: every extracted doc is linked from there,
  and docs do not link to each other — everything is one hop from that file.
- **Extracted docs inherit the constitution**: the rule quality bar, the
  single-source rule, and fix & capture routing all follow a section to its new
  home.
- **Docs describe current state only** — no temporal language ("recently", "we
  migrated from X"), no changelog narration of what was done. History lives in
  git. This applies to `CLAUDE.md` too.
- **Exception — `docs/context/`**: session save-points (debug findings, library
  research, incident notes) live in `docs/context/<topic>-<yyyy-mm>.md`, written
  for an LLM reader, narrative and dated by design. They are committed but NOT
  indexed from `CLAUDE.md` and never loaded automatically — the user passes one
  in explicitly when starting a session on the same topic. A save-point is a
  snapshot, not a source of truth: it never overrides `CLAUDE.md`, config.yaml,
  or the OpenSpec archive.
