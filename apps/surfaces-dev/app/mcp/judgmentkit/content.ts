export type JudgmentKitLifecycleRow = {
  context: 'Generation time' | 'CI/CD time' | 'Runtime (edge)';
  purpose: string;
  artifact: string;
  violation: string;
};

export const judgmentKitLifecycleRows: JudgmentKitLifecycleRow[] = [
  {
    context: 'Generation time',
    purpose:
      'Review activity fit, workflow responsibilities, evidence adjacency, disclosure, and readiness before UI or agent flows are generated.',
    artifact:
      'Activity review, workflow review, Cognitive Dimensions review, implementation context, and generation handoff.',
    violation:
      'Repair the candidate until the handoff is ready for generation.'
  },
  {
    context: 'CI/CD time',
    purpose:
      'Gauge integration integrity by comparing generated output with pinned JudgmentKit review artifacts and Surfaces contract expectations.',
    artifact:
      'Committed or version-pinned review JSON, handoff output, UI evidence, accessibility evidence, disclosure evidence, and validation reports.',
    violation:
      'Fail the promotion gate or require an explicit reviewed exception.'
  },
  {
    context: 'Runtime (edge)',
    purpose:
      'Apply low-latency request-time checks from committed or cached JudgmentKit-derived artifacts before adaptive UI renders.',
    artifact:
      'A deployment-bundled guidance slice or cached manifest derived from pinned JudgmentKit artifacts.',
    violation:
      'Block, constrain, or signal the adaptation before the user sees it.'
  }
];

export const judgmentKitGenerationSequence = [
  {
    label: 'Create activity review.',
    text:
      'Call create_activity_model_review with the user activity, participants, objective, artifacts, domain vocabulary, and hidden machinery.'
  },
  {
    label: 'Review workflow candidate.',
    text:
      'Call review_ui_workflow_candidate to check responsibilities, sequence, user decisions, terms, and disclosure.'
  },
  {
    label: 'Run Cognitive Dimensions diagnostics.',
    text:
      'Call review_cognitive_dimensions_candidate to inspect mapping, visibility, hidden dependencies, premature commitment, progressive evaluation, viscosity, hard mental operations, and disclosure discipline.'
  },
  {
    label: 'Prepare implementation context.',
    text:
      'Attach design-system, component, accessibility, icon, token, and runtime constraints that the implementation must obey.'
  },
  {
    label: 'Create generation handoff.',
    text:
      'Call create_ui_generation_handoff. Treat repair_required or not-ready review status as a stop condition before code generation.'
  }
];

export const judgmentKitCiSequence = [
  {
    label: 'Pin the review artifact.',
    text:
      'Commit or version the relevant JudgmentKit review JSON, handoff output, and source contract revision before using them as a CI reference.'
  },
  {
    label: 'Extract implementation evidence.',
    text:
      'Capture primitives, accessibility affordances, disclosure text, icon usage, token usage, workflow responsibilities, and UI evidence from the generated app.'
  },
  {
    label: 'Compare for integration integrity.',
    text:
      'Fail CI when required responsibilities, visible evidence, confirmation paths, or disclosure limits drift from the pinned artifact.'
  },
  {
    label: 'Store the result.',
    text:
      'Keep validation output with build artifacts so reviewers can see exactly which contract or review expectation blocked promotion.'
  }
];

export const judgmentKitRuntimeSequence = [
  {
    label: 'Bundle the guidance.',
    text:
      'Ship a small committed or cached guidance slice derived from pinned JudgmentKit artifacts with the deployment.'
  },
  {
    label: 'Check adaptations before render.',
    text:
      'Use the edge handler to reject or constrain request-time adaptations that would hide evidence, skip confirmation, expose machinery, or break required workflow adjacency.'
  },
  {
    label: 'Avoid live MCP calls in the critical path.',
    text:
      'Live JudgmentKit MCP calls are appropriate for explicit audit, debug, or admin flows outside request-critical Runtime (edge) paths.'
  },
  {
    label: 'Emit violation evidence.',
    text:
      'Return or log the contract id, artifact version, rule, status, and repair instruction when a runtime check blocks or constrains an adaptation.'
  }
];

export const judgmentKitStatusMeanings = [
  {
    label: 'ready_for_review',
    text:
      'The candidate has enough evidence and no blocking diagnostic findings. It can proceed to the next review or handoff step.'
  },
  {
    label: 'repair_required',
    text:
      'The candidate violates one or more review expectations. The agent should repair before generation, promotion, or edge-bundle publication.'
  },
  {
    label: 'needs_source_context',
    text:
      'The reviewer lacks source, policy, contract, or implementation context needed for a defensible judgment.'
  }
];

export const judgmentKitAgentText = `# JudgmentKit MCP lifecycle guidance

Source of record: https://judgmentkit.ai
How-to surface: https://surfaces.dev/mcp/judgmentkit

Use JudgmentKit MCP as a judgment and contract-reference capability for governed app and agent workflows.

Lifecycle contexts:
- Generation time: review activity and workflow before UI or agent flows are generated.
- CI/CD time: compare implementation output against pinned JudgmentKit contracts, review artifacts, and handoff expectations.
- Runtime (edge): use committed or cached JudgmentKit-derived artifacts in edge request paths for low-latency integrity checks.

Generation time recipe:
1. create_activity_model_review
2. review_ui_workflow_candidate
3. review_cognitive_dimensions_candidate
4. Attach implementation, design-system, accessibility, icon, token, and runtime constraints.
5. create_ui_generation_handoff

Status handling:
- ready_for_review: continue to the next review or handoff step.
- repair_required: stop and repair before generation, promotion, or runtime publication.
- needs_source_context: collect the missing source, policy, contract, or implementation context.

CI/CD time recipe:
1. Commit or version the JudgmentKit review JSON, handoff output, and source contract revision.
2. Extract UI evidence from the generated app: primitives, accessibility, disclosure, icon usage, token usage, workflow responsibilities, and visible states.
3. Compare generated evidence against the pinned artifact.
4. Fail the promotion gate when required responsibilities, visibility, confirmation, or disclosure constraints drift.

Runtime (edge) recipe:
1. Ship a deployment-bundled guidance slice or cached manifest derived from pinned JudgmentKit artifacts.
2. Check request-time adaptations before render.
3. Block, constrain, or signal adaptations that hide evidence, skip confirmation, expose machinery, or break required workflow adjacency.
4. Do not call live remote JudgmentKit MCP in a request-critical edge path. Live calls are for explicit audit, debug, or admin flows outside the critical path.

Terminology:
- Prefer activity review, workflow review, generation handoff, repair required, ready for generation, and integration integrity.
- Treat Cognitive Dimensions as diagnostic and audit vocabulary.
- judgmentkit.ai remains the MCP endpoint, install, examples, eval reports, release proof, and generated evidence system of record.
`;
