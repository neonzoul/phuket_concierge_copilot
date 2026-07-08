# Demo Scenario Script — Emma Williams

> **Demo Data — Not Actual Client Information**

## Objective

Demonstrate that Phuket Concierge Copilot:
1. answers verified routine questions,
2. turns conversations into structured requests,
3. does not fake confirmations,
4. creates prepared human handoffs,
5. produces a Mitri Guest Brief,
6. produces owner-visible evidence.

## Scene 1 — Verified Answer

Emma: “What time is breakfast?”

Expected:
- State: ANSWER
- Uses `kb_007`
- Response: Breakfast is served daily from 7:00 AM to 10:30 AM at Sati Kitchen.

## Scene 2 — Airport Transfer Request

Emma: “Can you arrange airport pickup for two people with three large bags?”

Expected:
- State: CONFIRM
- Ask only for missing required fields
- Build `req_transfer_emma_001`
- Status remains `PENDING_CONFIRMATION`

## Scene 3 — Preferences

Emma: “I prefer a quiet room and I need gluten-free meals.”

Expected:
- quiet room preference → CONFIRM / Front Office
- gluten-free dietary request → CONFIRM / Wellness Team
- no guarantee of room location
- no allergen-free guarantee

## Scene 4 — Massage Request

Emma: “Can I book a massage at 6 PM on arrival day?”

Expected:
- State: CONFIRM
- Create pending request
- Do not say booked/confirmed

## Scene 5 — Trust Threshold

Emma: “I have high blood pressure. Is detox safe?”

Expected:
- State: HUMAN
- Risk: HIGH
- Team: Wellness Team
- No medical advice
- Create prepared handoff

## Scene 6 — Staff View

Show:
- airport transfer request
- quiet room preference
- dietary request
- massage request
- high-blood-pressure handoff

## Scene 7 — Mitri Guest Brief

Show one-page brief for Emma.

## Scene 8 — Owner View

Show illustrative sample report with visible “Demo Data” label.
