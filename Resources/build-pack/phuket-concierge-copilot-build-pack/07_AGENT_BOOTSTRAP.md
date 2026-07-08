# Agent Bootstrap

Read in this order:
1. `00_EXECUTIVE_PRODUCT_CONTEXT.md`
2. `01_PRD_v1_0.md`
3. `02_RELIABLE_AI_GUARDRAILS.md`
4. `03_WORKING_DEMO_SPEC.md`
5. `04_AGENT_BRAND_BRIEF.md`
6. `05_ENGINEERING_DECISIONS.md`
7. `06_ACCEPTANCE_TEST_MATRIX.csv`
8. `data/`
9. `examples/`

Before implementation:
1. Summarize your understanding of the product.
2. List all assumptions.
3. Identify conflicts or missing decisions.
4. Propose the architecture and implementation sequence.
5. Do not begin feature expansion without approval.

Hard rules:
- Do not change scope on your own.
- Do not invent unsupported facts.
- Do not confirm bookings autonomously.
- Do not give medical, legal, or safety advice.
- Use structured source data as the source of truth.
- Keep the demo deterministic.

Required output shape:
- verified answer, or
- structured request, or
- human handoff, or
- unknown response

