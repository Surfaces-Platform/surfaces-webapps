# Phase 1 Proposal (Draft): Questions, Not Features

Phase 1 defines questions the system should be able to answer, not implementations.

## Open Questions Phase 1 Must Answer

1. **Section intent enforcement**
   - Does the surface render all `requiredSections` declared in the contract?
   - Can missing or duplicate sections be detected reliably?

2. **Auth posture transitions**
   - Can a surface move from `public` to `auth-aware` safely?
   - What signals indicate an incomplete transition?

3. **Cross-surface consistency**
   - Do multiple surfaces declare incompatible intents for shared sections?
   - Are calls-to-action aligned across surfaces that share a user journey?

4. **Runtime vs build-time guarantees**
   - Which expectations must be enforced at build time?
   - Which require runtime instrumentation or observation?

5. **Override semantics**
   - When is a surface allowed to diverge from shared expectations?
   - How are exceptions documented and reviewed?

## Non-Goals for Phase 1

- Full visual diffing
- Component tree validation
- CSS or token-level enforcement
- AI-driven UI correction

## Exit Criteria for Phase 1

Phase 1 is complete when:
- At least one new question above is enforced end-to-end.
- Failures explain *why* a surface violates intent, not just *that* it does.
- The contract remains the single source of declared expectations.

Phase 1 begins only after Phase 0 is stable under intentional failure.
