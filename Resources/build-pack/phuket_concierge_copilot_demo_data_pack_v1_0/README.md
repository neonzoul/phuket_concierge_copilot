# Phuket Concierge Copilot — Demo Data Pack v1.0

> **Demo Data — Not Actual Client Information**

This pack is the approved synthetic business context for building and demonstrating Phuket Concierge Copilot before a real pilot property is signed.

## What This Pack Represents

A realistic fictional 18-suite boutique wellness property:

- **Property:** Nai Harn Wellness Hideaway
- **Location:** Nai Harn / Rawai, Phuket
- **Demo guest:** Emma Williams
- **Primary use:** product demo, regression testing, UI fixtures, retrieval testing, request/handoff proof

## Important Rule

Within the Demo, `VERIFIED` means:

> Verified against the approved fictional source documents in this pack.

It does not mean the information belongs to a real hotel.

## Build Uses

The implementation team should use this pack to:

- seed the Demo property
- populate the knowledge base
- configure request types
- configure handoff routing
- create staff roles
- run the Emma demo journey
- generate Mitri Guest Brief
- generate illustrative Owner Insight
- run acceptance/regression tests

## Contents

### Property Context

`contexts/demo/nai-harn-wellness-hideaway/`

Contains:

- property identity and inventory
- brand voice
- property handbook
- wellness safety policy
- guest relations SOP
- knowledge base
- service menu
- handoff rules
- staff roles
- demo guests and stays
- demo conversations
- owner report seed
- context manifest

### Expected Outputs

`examples/`

Contains canonical expected answers, requests, handoffs, Guest Brief, and Weekly Insight.

### Tests

`tests/acceptance_test_matrix.csv`

Contains behavior and safety cases for:

- ANSWER
- CONFIRM
- UNKNOWN
- HUMAN
- hallucination traps

### Demo Story

`docs/demo_scenario_script.md`

Defines the approved Emma demo sequence.

## Non-Negotiable Behavior

- AI answers only from VERIFIED evidence.
- UNKNOWN does not guess.
- CONFIRM never means booked or final.
- HUMAN creates a prepared handoff.
- HUMAN is not automatically URGENT.
- All sample metrics must show a Demo Data label.
- No property-specific facts may be hardcoded in core application logic.
