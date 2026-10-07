# Feature Plan: Handbooks navigation

Visitors can open the published handbook collection from the top navigation on desktop or from the mobile menu. The Handbooks link goes directly to https://handbooks.surfaces.systems/ in the same tab, before JudgmentKit MCP.

The header contract allows one resource destination without changing product behavior. Generation time uses HomeHeader.tsx and the existing navigation semantics. CI/CD time uses the focused header test and the Vercel preview build to reject a missing or incorrect destination. Runtime (edge) serves the same navigation; it adds no adaptive enforcement behavior. Violations block preview acceptance and require correcting the link or responsive layout.

Acceptance requires the correct link in both layouts, mobile closure after selection, Escape focus restoration, no header overflow, and preservation of existing destinations and branding. This is a bounded navigation change on surfaces.systems. It makes the existing guidance collection reachable without introducing a new product workflow, observability feature, or orchestration path.

Validation: focused HomeHeader tests, Vercel preview build, and browser checks at desktop, mobile, and breakpoint widths. Production publication follows separate approval after preview review.
