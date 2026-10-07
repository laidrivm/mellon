# Verification

Indexed from `CLAUDE.md`, which holds the rule quality bar, the single-source
rule and the fix & capture routing this file inherits. A rule here is added,
tightened or deleted by the same loop, and must clear the same bar: checkable
from a diff, one line, imperative, non-duplicate.

What counts as evidence for a claim, and what a claim may rest on.

## Rules

- Name the environment a verification claim ran in — viewport, browser,
  data — not the one it targeted.
- Measure a claim about the repository against the version it pins, never the
  one the machine happens to run — the pin is what CI and every clone use,
  and a tool's surface differs between them.
- Verify an external contract against its machine-readable artefact —
  schema, reference page, `--help` — never against a prose summary of it or a
  type declaration of it: exercise the call.
- Exercise a documented capability on every path the project runs it —
  documentation describes one implementation, and a bundler and a dev server
  are two.
- Verify an external recommendation, or a tool mechanism a plan prescribes,
  before writing it into an artefact — a plan is not an implementation, so a
  mechanism named from priors reads exactly like one that was tried; report
  which parts failed verification and what replaces them.
- Never infer a permission outcome from a command that succeeded, and never
  report what a prompt did — report what the call returned; an approved prompt
  and an unprompted call are indistinguishable from inside the session.
- Read a permission outcome from the whole precedence chain — deny, then ask,
  then allow, across every scope — never from one grant or one entry.
- Verify a permissions change only in a session started after it — a session
  holds the permission set it loaded at startup, while a hook is re-read from
  the settings file per tool call and is observable at once.
- Probe a gate by refusing it, with an input the session has not already
  cleared — an approval and an absent prompt reach you as the same successful
  result, and an approval outlives the mode that granted it.
- Record the cause a measurement establishes, not the one it merely permits —
  name the alternatives ruled out.
- Name what a measurement was taken over beside its number, and cite it for
  nothing else.
- Re-run the failure probe that justified an assertion after rewriting it.
- Re-run the older probe before overwriting a recorded measurement your new
  one contradicts.
- Verify what a thing does against the thing, never against what governs it —
  a git hook is what `.git/hooks/` holds, not what `package.json` declares,
  and a module checks what its code checks, not what its specification
  requires of it. Cite the file and line when an artefact states what existing
  code does.
- Read a command's exit status from the command, not from a pipeline or a
  loop that continued past its failure, and read a gating check's output
  before running what it gates rather than chaining the two with `&&`.
- Pass the directory to a search rather than changing into it — a shell's
  working directory outlives the command that set it, and a scan run from the
  wrong one answers with a plausible subset instead of an error.
- Probe a signal with the event that must leave it unchanged, not only with
  the event that must move it.
- Exercise a compatibility statement against the state it was written for,
  never only the state it is a no-op in.
- Exercise a pre-written decision rule, or a condition you have written, only
  against a case that could have produced the opposite outcome — for a
  condition, name that case before writing it.
- Before editing an artefact to match an observed state, confirm the state is
  the intended one.
- Probe one mutation of shared state per run, never a sequence of them.
- Take a move's evidence from the suite that needs its service, never from the
  offline run alone.
- Assert which rule refused, not that one did, wherever more than one rule can
  refuse the same input.
- Pin the environment a case needs in order to discriminate, and assert the pin
  took — a case that fails only under some clocks or locales passes under the
  one CI runs.
- Run a case about a UTC reading in a non-UTC zone, set before the code under
  test reads one — in UTC a local calendar and the UTC timeline answer alike.
- Read a listing to its end before concluding a row is absent — a window
  bounded by `head`, `tail` or a line range and a row that is not there print
  the same nothing.
- Treat an empty result as evidence of absence only when the same query, over
  the same scope and asking for something known to be there, finds it —
  `openspec/changes/**` included. A query never run, a misspelled pathspec and
  a true absence all print the same nothing, and git exits zero for all three.
- Take a count of a file the edit writing it changes after that edit, never
  before.
- Take a count from the authoritative list — found by the token every member
  must carry, never one they merely tend to share — and reconcile it against
  any count the source states itself.
- Measure the mechanism an option rests on before putting the option to the
  user.
- Re-measure a figure at the moment it enters an artefact, never copy it from
  earlier output.
- Read a streamed gate's verdict from its terminal event, never from the
  findings that reached you before it — a run that died mid-stream has
  reported findings and reached no conclusion.
- Confirm which commits a merge landed before building the next branch on the
  base — a merge can stop short of the branch's tip, and the next branch
  inherits the gap in silence.
- Quote a commit hash from `git log` output in the same turn, never from
  memory — a hash shaped like a real one reads as checked.
