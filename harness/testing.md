# Testing

Indexed from `CLAUDE.md`, which holds the rule quality bar and the
single-source rule this file inherits.

- Prefer TDD for edge cases: turn `/zombies` output into failing tests first,
  then implement.
- A unit test arranges once, acts once, then asserts — a second act or a
  second arrange means it is two tests. A `test.each` row is one such test,
  not a second act, and repeated assertions about one act are one assert step.
- Tests must assert behaviour, not mirror the implementation. A test that
  would pass against a broken implementation is not a test — before trusting
  a new test, break the code it guards and watch it fail. Break the mechanism
  the test names, not the feature it exercises: a second rule reaching the
  same result makes a passing test evidence about nothing.
- Check a shipped artefact by asserting its own values; fabricate inputs only
  for a decision rule that ships outside the test exercising it.
- Assert the attribute or call the code makes, never the behaviour a platform
  states as a hint — a conforming implementation may honour neither.
- Give a fixture for a symmetry or antisymmetry case inputs that disagree —
  two sides carrying equal counts satisfy the criterion whichever way the code
  derived them.
- Arrange the filesystem or clock state a case rests on — a shared timestamp,
  a coarse tick — rather than waiting for the machine to produce it.
- Route `/zombies` findings by layer: Zero/One/Many/Boundaries/Interface/
  Exceptions → unit or integration tests; Simple scenarios marked
  `(e2e candidate)` → the Playwright smoke suite.
- Fold every `/zombies` idea into the tasks checklist in the same turn as the
  run, rather than pausing for a selection; give it a number only alongside the
  criterion fixing the behaviour it names, and write it under an existing
  criterion when it is that criterion applied to another case.
- Where a failing test breaks a rule this rulebook already states, satisfy that
  rule; never leave the breach standing behind a fix that only stops it
  failing.
- There is no DOM test environment and no `happy-dom` dependency: pure modules
  get `bun:test`, and anything that needs a document is an e2e test.
- Scaffolding tests are welcome but mortal: you may write throwaway tests
  to verify your own work during a build (that's how you close your loop),
  but before archive only tests that trace to the `/zombies` list and obey
  the rules above survive — delete the rest, especially negative tests
  ("feature X no longer exists") and implementation-detail assertions.

## Citing the criterion a test closes

- A test cites a criterion in a `// spec:` comment directly above a `test`,
  `it` or `describe` call, separated from it by nothing but blank lines and
  comments. The identifier is `<capability>/<slug of the scenario heading>`,
  derived and never written into a spec.
- A citation may name a criterion in `openspec/specs/**` or one still in an
  active change's delta spec, which is what lets a test written during apply
  cite the criterion it is being written for. Only the first set is counted, so
  a criterion and its citation join the count together at archive.
- One comment carries any number of identifiers, whitespace-separated or one
  per continuation line, and several tests may cite one criterion.
- A citation naming no criterion fails `bun run harness:check`, and so does
  one whose slug two scenario headings share — rename a heading rather than
  guess.
- Existing tests stay uncited: the count of uncited criteria sits on a floor in
  `package.json`'s `harness.uncitedFloor`, and the floor moves only with a
  `why` carrying the reason it moved, in either direction.
