# Full tide prototype experiment report — 14 locations

Eight prototypes were generated independently from empty starters, with the same ordinary product request and supplied 14-location fixture. All eight final artifacts pass technical admission. Both JudgmentKit conditions have actual accepted implementation receipts. Both Impeccable conditions have a ship verdict and synchronized design documentation. The gallery embeds every app and pairs GPT and Claude by resource.

This is an exploratory comparison with one generation per model/resource condition, followed by required repairs. It is **not a low-token benchmark**: every condition exceeded its approximately 6,000 processed-token soft target. Medium effort is a configuration label for each vendor; it does not establish equal compute.

## Eight final conditions

| Model | Reasoning | Design resource | Final outcome | Evidence |
| --- | --- | --- | --- | --- |
| GPT-6.1 Sol | Medium | No design resource | Complete; 112 cases pass | [Run](evidence/gpt-d/run.html) · [QA](evidence/gpt-d/evidence/functional.json) |
| Claude Opus 5.5 | Medium | No design resource | Complete; 112 cases pass | [Run](evidence/opus-d/run.html) · [QA](evidence/opus-d/evidence/parent/matrix.json) |
| GPT-6.1 Sol | Medium | JudgmentKit | Complete; 112 cases pass; accepted by actual local review | [Run](evidence/gpt-a/run.html) · [QA](evidence/gpt-a/evidence/full-qa.json) · [Final gate](evidence/gpt-a/evidence/17-review-3.json) |
| Claude Opus 5.5 | Medium | JudgmentKit | Complete; 112 cases pass; accepted by actual local review | [Run](evidence/opus-a/run.html) · [QA](evidence/opus-a/evidence/qa-full.json) · [Final gate](evidence/opus-a/repair-cycle-2/jk3/R2-impl-review.json) |
| GPT-6.1 Sol | Medium | NN/g UX | Complete; 112 cases pass | [Run](evidence/gpt-c/run.html) · [QA](evidence/gpt-c/evidence/functional-qa.json) |
| Claude Opus 5.5 | Medium | NN/g UX | Complete; 112 cases pass | [Run](evidence/opus-c/run.html) · [QA](evidence/opus-c/evidence/parent/matrix.json) |
| GPT-6.1 Sol | Medium | Impeccable | Complete; 112 cases pass; ship verdict and design docs | [Run](evidence/gpt-b/run.html) · [QA](evidence/gpt-b/evidence/data-qa.json) · [Final gate](evidence/gpt-b/evidence/finish-verdict.md) |
| Claude Opus 5.5 | Medium | Impeccable | Complete; 112 cases pass; ship verdict and design docs | [Run](evidence/opus-b/run.html) · [QA](evidence/opus-b/evidence/qa/qa-matrix.json) · [Final gate](evidence/opus-b/.impeccable/finish/verdict-3.md) |

GPT Impeccable's final receipt counts 116 checks: the 112 selection cases plus four keyboard/focus checks. Claude baseline and NN/g initially tested 56 combinations; independent parent scripts expanded each to all 112, including both transport/viewport cross-pairs. The original receipts remain preserved.

## Shared product request and scope

Every run received this exact brief:

> Build a simple responsive tide app. Let me choose a coastal location and day, see the tide height and whether it is rising or falling, the next high and low tides, and a readable 24-hour tide chart. Use the supplied data.

The request was not enhanced separately for a resource. Identical [technical constraints](evidence/experiment/TECHNICAL.txt), [runner policy](evidence/experiment/POLICY.txt), [persistent user answer](evidence/experiment/USER_ANSWER.txt) and fixture accompanied it. The user had already answered **“Proceed as inferred”**: a person checking tides for a general coastal outing, with no activity prioritized and delegated visual decisions. That real answer was reused; no new interview answer or user concept approval was invented.

Compared with the earlier two-location trial, the common technical input now requires all 14 locations. Existing approved presentation constraints remain: light only, no system theme switching, no demo-data banners, local/system fonts, no live API, metres, Pacific time, and selected-day noon readings. Requirements for each resource's workflow were separate from the product brief and confined to that resource.

## Locations and fixture

Half Moon Bay and Monterey are retained. The 12 additions are **San Francisco, Santa Cruz, Sausalito, Point Reyes, Bodega Bay, Fort Bragg, Crescent City, Morro Bay, Avila Beach, Santa Barbara, Los Angeles and San Diego**.

Both dates are October 6 and 7, 2026. Each location/date has 25 hourly samples from hour 0 through 24, a noon height and direction, the next high and low after noon, and four events. Original Half Moon Bay/Monterey records match the earlier fixture exactly. The additions are deterministic synthetic prototype fixtures derived from varied mean/amplitude/phase; they are not real tide predictions. This qualification is recorded here while the apps follow the requested removal of banners.

Every source and shipping fixture has SHA-256:

`6e8804d88335cdf2ad2a968b61edfd53b9f4792102f482459fa9500d9d741d5f`

[Dataset provenance](evidence/experiment/dataset-provenance.json) records the derivation. Crescent City on October 7 exercises a 3.90 m peak, a 0.24 m low, and a rising noon reading of 2.07 m. Other additions exercise changing ranges, rising/falling directions and midnight rollover. The fixture's supplied direction is displayed as supplied, including Point Reyes's noon-low “Rising” case.

## Isolation and execution parameters

The four GPT generators were fresh desktop agents with no inherited conversation, configured **gpt-6.1-sol / medium**. The four Claude generators were fresh CLI sessions configured **claude-opus-5-5 / medium**, with no fallback. Each read only its own empty React 19.2.6/esbuild 0.28.1 starter, shared inputs and assigned resource. No old app design/source or sibling output was supplied. Read-only package/browser infrastructure was shared.

Claude used strict per-run MCP configuration, disabled slash commands, no session persistence, no Chrome integration, cleared setting sources/hooks, disabled global project memory, and an unchanged default system prompt plus an isolation appendix. Baseline used file/shell tools and common verification infrastructure with no design skill, MCP, plugin or role agent. JudgmentKit used only its assigned local server; NN/g only its local corpus server. Impeccable alone had its prescribed finish-reviewer and documenter roles.

Claude's per-session CLI cap remained $3. Own-run continuations completed blocked/partial workflows rather than silently increasing that cap or importing sibling context. GPT retained its configured effort across its continuation. Parent orchestration, admission audit and gallery integration could inspect all outputs after generation; they were not fed back as competing design examples.

[Runtime metadata](evidence/experiment/GPT-PUBLIC-RUNTIME-METADATA.json) verifies actual GPT turn configurations and public tool names. [Claude public usage](evidence/experiment/CLAUDE-PUBLIC-USAGE.json) records every CLI invocation's reported model, usage and tool counts. These are sanitized metadata, not model reasoning transcripts. Different desktop/CLI harnesses, context overhead, continuation counts and vendor effort semantics remain comparison limits.

## Latest Impeccable and independent directions

The official latest releases checked for this run were **skill 4.5.0** and **engine 0.1.11**. The skill release was published October 2, 2026. Both resource trees match the exact appropriate official adapter bytes: GPT `.agents/skills/impeccable`, Claude `.claude/skills/impeccable`. The official universal ZIP digest is `a6877c158ec90c63560728553d2e737081afa8a79b86c507fa8d15a81fffd475`; the engine digest is `7427918d6e75507401a1b7b691eefe58a7c01a2fc63b712016ffc5a0ac1c05e6`. [Release proof](evidence/experiment/IMPECCABLE-RELEASE-PROOF.json) ties these to [official releases](https://github.com/pbakaus/impeccable/releases).

Both used the code build path, with no raster generation, and persisted seven own candidates before the actual assigned draw:

| Condition | Used seed | Assigned candidate | Resulting direction |
| --- | --- | --- | --- |
| GPT Impeccable | a2585d16 | 5 | Community swimming schedule; mint, white and blue |
| Claude Impeccable | b3a33188 | 7 | 1960s surf-contest screenprint poster; yellow and ultramarine |

They were deliberately independent draws, so their different appearance does not isolate a model effect. Candidate order was verified from actual public execution records and files. [GPT role/draw provenance](evidence/gpt-b/evidence/launch-provenance.json) proves fresh reviewer/documenter launches with exact model and medium configuration.

Claude accidentally invoked `concept-seed --help` twice; the CLI treated it as two unscoped draws, **aaa47392 and ee5848f7**. Both were ignored, preserved and counted in the audit. The used assigned direction was not replaced. Challenger/reference judgments used returned text; the catalog image boards were not fetched, which limits the completeness of that part of the workflow. No delegated direction was represented as a user click or concept approval.

GPT's initial finish reviewer found one mobile chart compression issue. Its continuation scored that repair resolved and returned ship; a separate fresh documenter completed the design records. The documenter mistakenly reused the first review filename; its receipt was kept separately and the actual initial reviewer text restored verbatim from the public delivered message.

Claude's initial full review found five issues. Later verdict roles scored those fixes and a scrub-label contrast regression and favicon 404; ship covered the scored fixes rather than a new exhaustive surface hunt. Final parent loaded-window QA then found a desktop-to-mobile chart-width regression. The same model/effort/resource repaired it and obtained a renewed scoped ship verdict and documentation sync; the old ship artifact and proof remain preserved. The final gate above applies to the repaired bytes.

Claude finish roles were configured with medium effort and the main exact model. Actual calls used the `opus` alias. [Claude's subagent documentation](https://code.claude.com/docs/en/sub-agents) establishes that this alias resolves to the main session's exact model when the family matches and supports the role effort field. No environment override was present. The public aggregate usage reported only claude-opus-5-5; separate per-role token/compute telemetry is unavailable.

## JudgmentKit: actual gates and repairs

Both conditions used the same canonical **0.8.0 unreleased renderer candidate** and existing locally patched stdio review policy **1.1.1**. Neither the hosted public service nor the renderer/validator source was changed during this regeneration. Acceptance therefore means **actual local patched-MCP acceptance**, not hosted-public acceptance.

The first activity review incorrectly classified the whole persistent answer paragraph as an authoritative safety boundary, combining unrelated sentences. A protocol repair split the exact answer into sentence spans with stable source references, still classified as provided artifacts. Concatenation equals every original byte; the product brief and technical input stayed unchanged. Fresh complete inferred activity reviews then returned ready. Earlier stopped receipts remain preserved. [GPT context equality proof](evidence/gpt-a/evidence/context-equality.json) records the lossless attribution.

GPT used three actual implementation reviews. Early failures included wrapper selectors for native selects and incomplete evidence. The final manifest targets the native location/day SELECT elements while declaring canonical indicator parts. Review 3 accepted; its trusted runtime receipt covers eight samples across two documents, with no findings or invalid reasons.

Claude's original cycle used three actual reviews, all failed. A separate recorded repair cycle reconsidered the low-confidence workbench recommendation as a read-only dashboard, with fresh workflow/handoff/frontend gates. The returned implementation contract remained byte-identical. Existing summary, next extremes, chart, detailed measurements and filters were mapped; no invented handoff action or new product feature was added. The tool labels this `user_selected`, but the agent selected it under delegated decisions; Mike did not explicitly select that surface.

Cycle 2 R1 accepted. Parent browser QA then measured a real mobile Noon/High label overlap of 17.37 × 9.20 px. The accepted R1 bytes were archived. A narrow chart-label repair reserved a label band, anchored edge ticks, moved low labels clear of the hour row and added a canvas halo. Measurements changed from collisions in 56/56 chart states to **0/56**, with no out-of-chart labels and at least 7.83 px noon-label clearance. The changed bytes received actual R2 acceptance. [Before proof](evidence/opus-a/evidence/parent/mobile-label-overlap-before.json) and [final label measurements](evidence/opus-a/evidence/chart-labels/after.json) are preserved.

There were **five actual Claude implementation reviews**: old cycle 3, new cycle 2. The wrapper automatically increments its counter, and the agent also manually incremented before R2. The final receipt therefore says attempt 3 and cycle 2's counter reads 3, despite only R1/R2 being submitted. This overcount is retained; no counter was lowered or third review invented.

Final trusted Claude caret review covers four samples across two documents with no findings. Both JudgmentKit apps use the canonical 48 px trailing slot, 16 px indicator/insets and 44 px control height; all selection cases check geometry. Both receipts carry a non-blocking warning that browser-painted native option text is not measured. This warning does not excuse an unmeasured caret. Accepted-artifact status is a bounded contract/reviewer result and did not prevent the later chart defect.

## NN/g and baseline resource evidence

GPT NN/g performed searches plus section/article retrieval for hierarchy and selection patterns. Claude NN/g searched/retrieved chart axes, scale honesty, glanceable typography and dropdown guidance. Their own run records distinguish corpus claims from design inferences, including the 14-option native select and two visible day choices. They did not receive an Impeccable style or JudgmentKit contract.

[GPT returned resource identities](evidence/gpt-c/resource-identities.json) and [Claude returned identities](evidence/opus-c/resource-identities.json) preserve requests, source IDs and hashes where available. Permissioned article bodies remain in the local run evidence rather than this served report. Both baselines have zero design resource calls, verified by public runtime/tool metadata.

## Verification and practical limits

Each final run covers **14 locations × 2 days × 2 viewports × 2 loading modes = 112 selection cases**: desktop 1280×800 and mobile 390×844, direct file and localhost HTTP. The matrices check displayed fixture values, direction, next extreme times/heights, range containment, selected identity, overflow and runtime errors. The four GPT checks and the parent Claude NN/g check compare every plotted point; the other Claude checks focus on range containment and events. The audit records this uneven chart-coordinate assertion strength rather than treating all custom tests as identical.

Independent source-to-build reproduction matched shipping JS/CSS bytes. Parent browser checks exercised new locations, the tallest/rising Crescent City case, native baseline keyboard selection, rendered select geometry, and loaded desktop→mobile→desktop behavior. Light-only styles remain under a dark system preference, and no demo-data banners are present. Final evidence: [admission audit](evidence/experiment/ADMISSION-AUDIT.md), [source/build hashes](evidence/experiment/FINAL-ARTIFACT-HASHES.json), [parent browser checks](evidence/experiment/parent-browser-checks.json), and [loaded resize checks](evidence/experiment/loaded-resize-checks.json).

Custom DOM/contrast tests and Chromium captures do not constitute a full WCAG audit, screen-reader study or user study. Keyboard, state and accessibility coverage varies by condition and is recorded in each run. Mobile pages scroll vertically. Dynamic axes vary by selection; the prototypes provide fixed supplied dates and noon readings rather than live tide predictions.

## Token and cost record

The soft approximately 6,000 processed-token target was exceeded in all eight conditions. Required resource preparation, acceptance/finish cycles, QA and repairs were completed rather than omitted to claim a low-token result. Agent RUN records originally said exact usage was unavailable locally; parent subsequently extracted public runtime counters.

GPT values below are cumulative request counters for each thread. Input includes cached input; the cache column is a subset. Do not add cached input a second time, infer billing, or treat cumulative repeated context as unique prompt words. No cross-thread deduplicated total or GPT cost is asserted.

| GPT thread | Input including cache | Cached input | Output | Reported total |
| --- | ---: | ---: | ---: | ---: |
| gpt_b/impeccable_documenter | 409,435 | 384,128 | 6,571 | 416,006 |
| gpt_b | 3,479,129 | 3,420,288 | 12,879 | 3,492,008 |
| gpt_d | 828,852 | 797,568 | 9,304 | 838,156 |
| gpt_c | 1,145,991 | 1,105,280 | 9,606 | 1,155,597 |
| gpt_a | 4,134,570 | 4,046,080 | 17,226 | 4,151,796 |
| gpt_b/impeccable_finish_reviewer | 404,657 | 386,048 | 2,194 | 406,851 |

Claude CLI values sum the public session counters within each condition. Cache creation/read columns are separate from the CLI input column. Every continuation is included; parent administrative audit/gallery usage is separate. Token columns follow each CLI result’s reported usage object; separate finish-role usage is unavailable, so role-token inclusion is not independently asserted. These vendor counters are not normalized to GPT's semantics.

| Claude condition | Sessions | Input | Cache creation | Cache read | Output | CLI list-rate estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| opus-d | 1 | 26 | 27,561 | 254,214 | 12,719 | $0.525815 |
| opus-a | 5 | 356 | 408,783 | 11,659,238 | 148,708 | $8.577696 |
| opus-c | 1 | 36 | 63,030 | 673,349 | 22,200 | $1.083054 |
| opus-b | 3 | 140 | 191,895 | 3,015,589 | 68,357 | $5.606778 |

Total Claude CLI reported estimate: **$15.793343**. This is a list-rate estimate, not the account's actual bill. [Sanitized per-session usage](evidence/experiment/CLAUDE-PUBLIC-USAGE.json) includes failed/stopped and successful continuations; the $3 limit was per session, not a total-condition budget.

## What this comparison supports

The eight artifacts are inspectable evidence of these specific configured workflows on this brief and fixture. They can support discussion of visible usability, craft, workflow burden and defects. They cannot establish that a skill helps/hurts frontier models generally, that one model is better, or that the resource caused the observed style. One trial per cell, independent Impeccable directions, different harnesses, unequal iteration counts and exceeded token targets limit causal and statistical conclusions.

This publication includes the eight 14-location prototypes, the full experiment report, and its linked evidence. Earlier experiments and original execution records remain in local storage.

Local runtime paths, transcript pointers, session identifiers and local corpus permission identifiers are omitted from the published evidence copies; original records remain unchanged in local storage.
