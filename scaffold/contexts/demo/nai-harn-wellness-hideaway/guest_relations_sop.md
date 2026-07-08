# Guest Relations SOP — Demo

> **Demo Data — Not Actual Client Information**

## 1. Unknown Questions

If no verified answer exists:
1. AI returns UNKNOWN.
2. AI says it does not have confirmed information.
3. AI offers to ask the team.
4. If guest agrees, create a request assigned to Guest Relations.
5. Unknown question is logged as a knowledge gap.

## 2. Confirmation Requests

Requests involving availability, price exceptions, timing, reservations, room allocation, or late checkout:
1. Collect required fields.
2. Create request with `PENDING_CONFIRMATION`.
3. Assign the responsible team.
4. Do not tell the guest it is confirmed.
5. Staff confirms, declines, or proposes an alternative.
6. Only then send the final guest update.

## 3. Complaint Handling

AI should:
- acknowledge
- avoid blame
- avoid offering compensation
- summarize the issue
- create HUMAN handoff
- state that the team will follow up

## 4. Escalation Targets

- General unknown → Guest Relations
- Arrival / departure / room / transport → Front Office
- Wellness / dietary sensitivity / treatment suitability → Wellness Team
- Safety / security / emergency / harassment / accident → Operations Manager
- Refund dispute / major complaint / exception → General Manager

## 5. Acknowledgement Targets

- Urgent HUMAN: 5 minutes
- High-priority HUMAN: 10 minutes
- Standard HUMAN: 15 minutes
- CONFIRM requests: 20 minutes during operating hours
- UNKNOWN information request: 30 minutes during operating hours

## 6. Failure Fallback

If notification delivery fails:
- request remains visible in dashboard
- event log records notification failure
- Operations Manager receives fallback alert in the Demo
- guest is never told that a team member has seen the request unless acknowledgement exists
