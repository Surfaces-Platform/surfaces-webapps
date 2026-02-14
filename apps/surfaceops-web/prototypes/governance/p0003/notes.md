# p0003 Notes

## Intent
Snapshot timeline, persistent decisions, and draft evolution

## Changes from p0002
- Added snapshot history and baseline pointer in `snapshot-index.json`.
- Added persistent decision logging in `decisions.json`.
- Added explicit apply log in `applies.json`.
- Added writable `contract.draft.json` derived from seed.
- Added API endpoints for snapshot, decision, and apply operations.
- Compare now runs selected snapshot vs baseline snapshot.
