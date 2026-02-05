# Phase 1 Question Map

Questions to answer once Phase 0 has a few real runs. Not a proposal to implement yet—a list of what to measure and when to consider Phase 1.

Each question includes: what repeated signal would justify answering it, what would validate it, and which surfaces it applies to first.

---

## Questions

### 1. Design system import drift

**Question:** When developers switch from `@surfaces/ui` to relative imports or alternative package paths, does the failure feel fair and point to the right fix?

**Repeated signal:** Multiple observation log entries with `phase0.designSystem.missing`; contributors report confusion about "why relative imports break CI."

**Validation:** Log entries with "Next action clarity: clear" and "Did it point to: code"; time-to-diagnose &lt;5 min in most cases.

**Surfaces first:** surfaces-web, surfaces-dev (highest design-system usage).

---

### 2. Auth routes drift

**Question:** When auth routes are added, removed, or moved, does validate-extracted fail clearly and point to the right surface?

**Repeated signal:** `phase0.authRoutes.missing` or `phase0.authPosture.mismatch` in log; auth refactors cause CI failures.

**Validation:** Finding code matches the actual change; "Did it point to" is code or contract (not neither).

**Surfaces first:** surfaceops-web (auth-first), surfaces-web (auth-aware).

---

### 3. Shell layout drift

**Question:** When layout structure changes (e.g. route groups, nested layouts), does the extractor still detect hasShell correctly, or do we get false negatives?

**Repeated signal:** `phase0.shell.mismatch` in log; layout refactors cause unexpected failures.

**Validation:** Extraction correctly identifies `app/layout.tsx` and `app/(shell)/layout.tsx`; no false positives/negatives in observation log.

**Surfaces first:** surfaces-web, surfaces-dev (both use shared shell).

---

### 4. Section intent (requiredSections)

**Question:** Can we reliably extract section IDs (e.g. from `data-contract-section`) so requiredSections can be validated against code?

**Repeated signal:** "Wish we could assert" entries mention section drift; requiredSections in contract feel like documentation without enforcement.

**Validation:** Phase 0 currently omits requiredSections (placeholder). Would need new extraction; measure via extraction report warnings and log entries.

**Surfaces first:** surfaces-web (has data-contract-section attributes), surfaces-dev.

---

### 5. Cross-surface consistency

**Question:** Do multiple surfaces drift in different directions for the same phase0 expectation, and does that create coordination overhead?

**Repeated signal:** Contract updates touch multiple surfaces; "Contract felt like: tax" appears for cross-surface changes.

**Validation:** Count of surfaces modified per contract change; log entries about multi-surface drift.

**Surfaces first:** All four (interfacectl-web, surfaceops-web, surfaces-web, surfaces-dev).

---

### 6. Time-to-diagnose

**Question:** Does the failure message and finding code reduce time to fix compared to "something is wrong" without structure?

**Repeated signal:** "Time to diagnose" in log is consistently &lt;5 min when "Next action clarity" is clear.

**Validation:** Observation log "Time to diagnose" field; compare to baseline (no structured failures).

**Surfaces first:** Any (aggregate across log entries).

---

## Exit criteria to start Phase 1

Do **not** start Phase 1 until:

1. **At least 3 observation log entries** from real work (PRs, refactors, dependency updates)—not just manual tests—with "Confidence in the signal: high" and "Next action clarity: clear" or "somewhat clear."

2. **The same finding code** (e.g. `phase0.designSystem.missing`) appears at least twice in the log from different triggers, indicating repeated friction rather than one-off noise.

3. **No "Did it point to: neither"** entries for real drift scenarios—when code or contract drifts, the failure must point to the right artifact (code or contract) so the next action is unambiguous.
