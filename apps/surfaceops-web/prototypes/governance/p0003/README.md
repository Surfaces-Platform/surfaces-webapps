# p0003 - Persistent Governance Workflow

Derived from p0002.

Adds persistent governance workflow artifacts:

- `contract.draft.json`: writable draft derived from `contract.seed.json`.
- `snapshots/*.extraction.json`: timestamped extraction history.
- `snapshot-index.json`: snapshot ordering plus baseline/latest pointers.
- `decisions.json`: append-only accept/reject/evolve records.
- `applies.json`: append-only apply mutation records.

Route:

- `/contracts/governance?prototype=p0003`
