# Working Demo Spec

## Demo Goal
Show that the system can:
- answer verified routine questions,
- turn requests into structured work,
- stop on sensitive content,
- create a Guest Brief,
- and produce owner evidence.

## Demo Narrative
Primary guest: Emma Williams.

Flow:
1. Emma asks breakfast time.
2. Emma requests airport pickup.
3. Emma shares quiet-room and gluten-free preferences.
4. Emma requests a massage at 6 PM.
5. Emma asks whether detox is safe with high blood pressure.
6. Staff opens the dashboard.
7. Staff opens the Mitri Guest Brief.
8. Owner opens Weekly Insight.

## Expected Demo Proof
- Breakfast time is answered from verified knowledge.
- Airport transfer becomes a structured request.
- Preferences are captured without a false guarantee.
- Massage stays pending until staff confirmation.
- Medical question becomes human handoff.
- Staff sees request ownership and next action.
- Guest Brief is one-page and staff-ready.
- Weekly Insight shows measurable pilot evidence.

## Required Demo Screens
- Guest chat
- Staff inbox
- Guest Brief
- Knowledge view
- Owner insight view
- Demo reset / seed controls

## Determinism Requirements
- Demo data must be seeded.
- Demo state must reset cleanly.
- No core demo step should depend on a live external integration.
- All demo events must be recorded.

