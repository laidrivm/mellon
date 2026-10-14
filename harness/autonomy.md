# Autonomy

Indexed from `CLAUDE.md`, which holds the rule quality bar and the
single-source rule this file inherits.

This file covers what a session does at a step that waits on the user, asks
the user, or hands an act to the user, when nobody is at the terminal to
answer.

## Unattended or attended

A session is unattended only when the prompt or brief that started it holds
this line, word for word and on a line of its own:

```text
This session runs unattended.
```

The session looks for that exact line and for nothing else.

- **Declared.** A runner starts a session with `/opsx:apply <slug>` followed
  by the line. At the step "Wait for the user's go-ahead", the session reads
  the step's `agent` marker and opens the pull request itself.
- **Not declared.** The prompt reads "Apply it overnight, I'm asleep". The
  line is missing, so the session is attended, whatever the wording suggests.
  At the same step it offers the pull request and waits.

An attended session follows every step as it is written, and the markers
change nothing for it. A missing line leads to a stall, never to an act the
user did not want. An orchestrator copies the line into each worker's brief,
because a worker cannot see its parent's prompt.

## The classes

A step names its class inline, in the form shown here:
"(unattended: card — hand the question on)". The class follows the colon.
After the dash comes what an unattended session does at that particular
step, and that text is never empty. A step that waits, asks or confirms
without a marker is `card`, whether it sits in this harness's prose, in a
vendored skill or in an OpenSpec command.

A prompt or brief that names a stage is the request that the stage's own
command waits for. `/opsx:explore` waits for confirmation before it captures
a change, and `/opsx:propose` waits for a description of the change. Both are
answered by a brief that says to explore and propose.

### `agent`

The session takes the step itself, and records in its report or in the pull
request's body what it did in the user's stead. It opens a pull request when
every gate line reads `PASS`, with two exceptions:

- `CODERABBIT-LOCAL` reading `OPEN` only over a 🟠 Major or 🔴 Critical
  dismissal it proposes;
- `CODERABBIT-LOCAL` reading `BLOCKED` only over a 🟠 Major or 🔴 Critical
  that the third pass left unresolved.

Any other gate line short of `PASS` holds the pull request back. In
particular, a `TRIAGE` or `ZOMBIES` line reading `BLOCKED` over a question
handed on stops the pull request until the answer comes, as `card` says.

The body lists each Major or Critical the local review left open, whether
dismissal is proposed or it is unresolved after the third pass. Each entry
gives the finding's severity, its file and line, and what it says. For a
proposed dismissal it adds the reason dismissal is proposed; for an
unresolved finding, that it is still open. A bare count does not do. The
gate lines stay as the review set them, and the merge stays with the user.

### `card`

The session hands the question on as `task-board` fixes in *An open
question waits on its card, assigned to the user* and *A question already
open is not asked again*. The work that waits on the answer stops, and other
work goes on. Handing a question on never answers
it: the session does not proceed on its own recommendation.

### `user`

The session neither takes the step nor asks for it on a card, because a yes
there would not let it take the step. It stops the work that needs the step
and reports `BLOCKED`, naming the step, and the user takes it in a session of
their own.
