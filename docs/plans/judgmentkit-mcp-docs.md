# Feature Plan

## Summary
Add a top-level MCP documentation section to surfaces.dev for JudgmentKit MCP usage across Generation time, CI/CD time, and Runtime (edge).
The page explains how JudgmentKit review artifacts become generation guidance, pinned CI references, and edge-bundled runtime guidance while judgmentkit.ai remains the system of record for endpoint, install, examples, evals, reports, and release evidence.
The agent-readable route is discoverable through `/llms.txt`, `/mcp/agent.txt`, sitemap, robots, and MCP page metadata so it is not a dead page.

## Strategy alignment
This work strengthens the decision filter by documenting how external judgment artifacts become enforceable inputs before an agent proposes or renders a user experience change.
It keeps Surfaces focused on whether a change is allowed, under what conditions it may proceed, and how violations are blocked, constrained, or signaled.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
No Surfaces contract fields or schema semantics change.
The docs define JudgmentKit MCP review artifacts as external reference inputs that can support intent, invariants, allowed change surface, and contextual conditions.
The discovery routes define where agents should find MCP workflow guidance, but they do not create new enforcement semantics.

2. Enforcement timing
Generation time: JudgmentKit MCP reviews shape activity, workflow, diagnostic findings, and generation handoff before UI or agent flows are generated.
CI/CD time: pinned JudgmentKit artifacts are compared with implementation evidence before promotion.
Runtime (edge): committed or cached JudgmentKit-derived guidance is bundled with the deployment and used in request-time checks.

3. Violation handling
Generation time violations require repair before generation handoff.
CI/CD time violations fail promotion or require an explicit reviewed exception.
Runtime (edge) violations are blocked, constrained, or signaled before render.
Discovery violations are signaled by tests: missing text routes, missing sitemap/robots references, or missing metadata links fail the docs test.

## Surface impact
This affects surfaces.dev because it is the developer and agent how-to documentation surface.
It does not change surfaces.systems, surfaceops.ai, or interfacectl behavior.

## Non-goals
- No JudgmentKit MCP API change.
- No Surfaces contract schema change.
- No interfacectl behavior change.
- No migration of JudgmentKit eval reports or examples away from judgmentkit.ai.
- No live remote MCP call requirement in Runtime (edge) request paths.
- No `.well-known` route in this pass.

## Acceptance criteria
- surfaces.dev nav includes MCP.
- `/mcp` exists and describes MCP docs as developer and agent workflow documentation.
- `/mcp/judgmentkit` names Generation time, CI/CD time, and Runtime (edge).
- JudgmentKit Runtime (edge) guidance recommends committed or cached pinned artifacts in request paths.
- `/mcp/judgmentkit/agent.txt` returns `text/plain` compact lifecycle guidance.
- `/llms.txt` and `/mcp/agent.txt` expose discoverable text indexes for agents.
- `robots.ts`, `sitemap.ts`, and MCP page metadata point to the agent-readable routes.
- The docs state judgmentkit.ai remains the MCP endpoint, install, example, eval, report, release proof, and evidence system of record.
- The docs do not claim Surfaces owns JudgmentKit MCP behavior.

## Risks and drift checks
- Risk: docs drift into prompt tooling. Mitigation: tie each section to lifecycle artifacts and violation handling.
- Risk: docs imply Surfaces owns JudgmentKit evidence. Mitigation: route endpoint, install, evals, examples, and reports to judgmentkit.ai.
- Risk: Runtime (edge) guidance encourages live remote calls in critical request paths. Mitigation: prescribe committed or cached pinned artifacts and reserve live calls for audit/debug/admin flows.

## Implementation outline
- Add MCP nav and `/mcp` landing route.
- Add `/mcp/judgmentkit` page with lifecycle matrix and recipes.
- Add `/mcp/judgmentkit/agent.txt` route backed by shared content.
- Add `/llms.txt`, `/mcp/agent.txt`, sitemap, robots, and page metadata discovery.
- Add a targeted script test for source routes, lifecycle terms, content type, and ownership boundaries.
