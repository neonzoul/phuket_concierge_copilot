# Phuket Concierge Copilot
## Architecture Approval & Multi-Agent Implementation Directive v1.0

**Status:** Approved with amendments  
**Audience:** Senior Engineer Agent, Agent Engineer, Backend Engineer, Frontend Engineer  
**Project Owner:** ANANT AGENT  
**Product:** Phuket Concierge Copilot  
**Purpose:** ใช้เป็นเอกสารอนุมัติ Architecture และข้อกำหนดเพิ่มเติมก่อนเริ่ม scaffold/build

---

# 1. Executive Decision

Architecture proposal เดิมได้รับการอนุมัติในหลักการ โดยให้ดำเนินการต่อภายใต้ข้อกำหนดและ amendments ในเอกสารนี้

เป้าหมายคือสร้างระบบที่:

- เป็น Demo ที่พิสูจน์ Product Behavior ได้จริง
- รองรับการนำไปทำ Pilot กับลูกค้าจริงภายหลัง
- เปลี่ยน property context ได้ง่าย
- เพิ่ม/ลด sub-agent ได้ง่าย
- เปลี่ยน model ของแต่ละ agent ได้โดยไม่แตะ orchestration หลัก
- ป้องกัน code coupling และ spaghetti code
- ทำให้ทุก agent มีหน้าที่, input, output, tool, permission และ model ที่ตรวจสอบได้จากจุดเดียว

---

# 2. Product Ownership Clarification

## Approved

- **ANANT AGENT** คือ Product Owner และผู้ว่าจ้างสร้าง Demo
- **Nai Harn Wellness Hideaway** คือ fictional demo property
- **Emma Williams** คือ fictional demo guest
- Real hotel/property จะเข้ามาภายหลังผ่าน Client Pilot Discovery

## Required Change

ห้ามตีความว่า ANANT AGENT คือโรงแรมหรือ property client

ใช้ข้อความนี้ในระบบและเอกสาร:

> ANANT AGENT is the product owner commissioning the Phuket Concierge Copilot demo.  
> Nai Harn Wellness Hideaway and Emma Williams are approved fictional fixtures for the Demo Build.

---

# 3. Approved Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- App Router
- Server Components where appropriate
- Client Components only where interaction requires it

## Backend

- Node.js
- TypeScript
- Fastify
- Zod for input/output validation
- OpenAPI generated from route schemas where possible

## Database / Auth

- Supabase Postgres
- Supabase Auth
- Row-level security prepared but may remain minimal for Demo
- Append-only event log for AI and human actions

## Hosting

- Vercel: frontend
- Railway: backend/orchestration service
- Supabase: database/auth/storage
- Infrastructure accounts owned by ANANT AGENT

## LLM

- Anthropic Claude as initial provider
- Must be accessed through provider abstraction
- No business logic may import Anthropic SDK directly outside provider adapter

## Notification

- Slack mock/demo adapter
- Dashboard remains the source of truth
- Notification adapters must be swappable

---

# 4. Multi-Agent Architecture — Required from Day One

ระบบต้องรองรับหลาย sub-agent แม้ Demo แรกจะใช้เพียงบาง agent

แนวคิดหลัก:

> One orchestration layer coordinates small, specialized agents.  
> Each agent does one job clearly and returns a typed result.

Agent แต่ละตัวต้อง:

- มีหน้าที่เดียวหรือขอบเขตแคบ
- มี input schema
- มี output schema
- มี model config
- มี prompt/version
- มี tool permissions
- มี timeout / retry policy
- มี fallback behavior
- มี observability/logging
- ไม่มีสิทธิ์เขียนข้อมูลใด ๆ นอกเหนือจากที่ระบุ

ห้ามสร้าง “God Agent” ที่ classify, retrieve, answer, write request, create handoff, summarize และ report ใน prompt เดียว

---

# 5. Initial Agent Set

## 5.1 Safety Guard Agent

**Purpose:**  
ตรวจจับ medical, legal, safety, security, refund, payment dispute, emergency, severe complaint และ high-risk topics ก่อนเข้า LLM workflow อื่น

**Input:**
- guest message
- conversation context
- property handoff rules

**Output:**
- matched: boolean
- risk_category
- risk_level
- behavior_state
- priority
- handoff_team
- reason

**Preferred implementation:**
- deterministic rules first
- optional lightweight LLM classification for ambiguous cases

**Hard rule:**
- HUMAN overrides all other states
- emergency urgency is separate from HUMAN state

## 5.2 Intent & Behavior Classifier Agent

**Purpose:**  
จัด message เป็น:

- ANSWER
- CONFIRM
- HUMAN
- UNKNOWN

**Input:**
- normalized guest message
- safety guard result
- retrieved knowledge metadata
- active request context

**Output:**
- behavior_state
- intent
- confidence
- reason
- required_next_action
- missing_fields

**Hard rule:**
- must not generate guest-facing final answer

## 5.3 Knowledge Retrieval Agent

**Purpose:**  
ค้นข้อมูลจาก verified demo/property sources

**Input:**
- guest message
- classified intent
- property_id
- language
- context filters

**Output:**
- matched knowledge items
- source ids
- source owner
- freshness/verification status
- retrieval confidence

**Hard rule:**
- only `status = VERIFIED`
- only `can_ai_answer = true` for direct answering
- never invent missing facts

## 5.4 Guest Response Agent

**Purpose:**  
สร้างคำตอบให้แขกจาก verified evidence เท่านั้น

**Input:**
- message
- behavior state
- verified knowledge items
- property tone
- conversation context
- response policy

**Output:**
- guest-facing response
- cited knowledge ids
- claims list
- suggested next step

**Hard rule:**
- no unsupported factual claim
- no final confirmation unless human confirmation event exists
- no medical/legal advice

## 5.5 Response Verification Agent

**Purpose:**  
ตรวจคำตอบก่อนส่ง

**Input:**
- generated response
- cited knowledge items
- behavior state
- forbidden-claim rules

**Output:**
- pass/fail
- unsupported claims
- prohibited phrasing
- corrected state if needed
- fallback instruction

**Implementation policy:**
- deterministic checks always
- LLM verifier only when needed
- exact FAQ answers should not require a third LLM call by default

## 5.6 Request Capture Agent

**Purpose:**  
เปลี่ยน guest conversation เป็น structured request

**Input:**
- conversation context
- request type
- service definition
- collected fields

**Output:**
- request object
- missing fields
- status
- assigned team
- confirmation requirement

**Hard rule:**
- cannot confirm booking
- cannot set final availability
- must preserve source message ids

## 5.7 Human Handoff Agent

**Purpose:**  
สร้าง handoff ที่พร้อมให้ staff รับช่วงต่อ

**Input:**
- guest
- conversation
- risk/safety result
- related request
- routing rules

**Output:**
- handoff summary
- reason
- priority
- assigned team
- required action
- due/acknowledgement target

**Hard rule:**
- handoff must contain prepared context, not only raw chat

## 5.8 Mitri Guest Brief Agent

**Purpose:**  
สร้าง staff-ready guest brief ที่อ่านได้ใน 15–20 วินาที

**Input:**
- guest
- stay
- preferences
- active requests
- open/resolved handoffs
- approved staff notes

**Output:**
- one-page structured brief
- pending items
- sensitive items
- recommended human actions
- source event ids

**Regeneration events only:**
- preference changed
- request created/updated
- handoff created/resolved
- stay details changed
- approved staff note changed

## 5.9 Owner Insight Agent

**Purpose:**  
สร้าง owner-level report ที่อ่านจบในไม่เกิน 3 นาที

**Input:**
- event logs
- request outcomes
- handoff outcomes
- unknown questions
- knowledge gaps
- service opportunity tags

**Output:**
- metrics
- notable patterns
- knowledge gaps
- operational observations
- recommendations
- demo-data label

**P0 rule:**
- generate on demand
- no scheduler required before real pilot

---

# 6. Agent Registry — Single Source of Truth

ต้องมีไฟล์ registry/config จุดเดียวที่บอกว่า agent แต่ละตัว:

- ทำหน้าที่อะไร
- ใช้ model อะไร
- ใช้ prompt ไหน
- มี input/output schema อะไร
- ใช้ tool อะไรได้
- timeout เท่าไร
- retry กี่ครั้ง
- fallback เป็นอะไร
- เปิด/ปิดอยู่หรือไม่
- version ใด

## Suggested file

```text
config/agents.registry.ts
```

## Example

```ts
export const agentRegistry = {
  safetyGuard: {
    id: "safety-guard",
    enabled: true,
    purpose: "Detect high-risk and human-required topics before other agents run.",
    provider: "anthropic",
    model: "claude-sonnet",
    temperature: 0,
    maxTokens: 500,
    timeoutMs: 5000,
    retries: 1,
    promptPath: "prompts/safety-guard/v1.md",
    inputSchema: "SafetyGuardInput",
    outputSchema: "SafetyGuardOutput",
    tools: [],
    fallback: "force-human",
    version: "1.0.0"
  },

  classifier: {
    id: "behavior-classifier",
    enabled: true,
    purpose: "Classify guest messages into ANSWER, CONFIRM, HUMAN, or UNKNOWN.",
    provider: "anthropic",
    model: "claude-haiku",
    temperature: 0,
    maxTokens: 600,
    timeoutMs: 5000,
    retries: 1,
    promptPath: "prompts/classifier/v1.md",
    inputSchema: "ClassifierInput",
    outputSchema: "ClassifierOutput",
    tools: ["knowledge-metadata-reader"],
    fallback: "UNKNOWN",
    version: "1.0.0"
  },

  responder: {
    id: "guest-response",
    enabled: true,
    purpose: "Generate guest-facing responses from verified evidence only.",
    provider: "anthropic",
    model: "claude-sonnet",
    temperature: 0.2,
    maxTokens: 1000,
    timeoutMs: 8000,
    retries: 1,
    promptPath: "prompts/guest-response/v1.md",
    inputSchema: "GuestResponseInput",
    outputSchema: "GuestResponseOutput",
    tools: [],
    fallback: "safe-unknown-response",
    version: "1.0.0"
  }
} as const;
```

## Required Rule

ห้าม hardcode model name, prompt path, timeout, temperature หรือ retry ใน agent implementation file

ทุกค่าเหล่านี้ต้องมาจาก registry/config

---

# 7. Provider Abstraction

LLM provider ต้องเปลี่ยนได้ง่าย

## Required interface

```ts
export interface LLMProvider {
  generate<TInput, TOutput>(
    config: AgentRuntimeConfig,
    input: TInput
  ): Promise<TOutput>;
}
```

## Required adapters

```text
src/llm/providers/
├── anthropic.provider.ts
├── openai.provider.ts
├── mock.provider.ts
└── index.ts
```

P0 ใช้ Anthropic จริง และ Mock Provider สำหรับ test/demo deterministic runs

## Hard Rule

Business logic เรียกใช้:

```ts
llmProvider.generate(...)
```

ไม่เรียก Anthropic SDK โดยตรง

---

# 8. Agent Runtime Interface

Agent ทุกตัวต้อง implement interface เดียวกัน

```ts
export interface Agent<TInput, TOutput> {
  id: string;
  execute(input: TInput, context: AgentExecutionContext): Promise<TOutput>;
}
```

## Execution Context

```ts
export interface AgentExecutionContext {
  traceId: string;
  conversationId?: string;
  guestId?: string;
  propertyId: string;
  actorType: "guest" | "staff" | "system";
  agentConfigVersion: string;
  promptVersion: string;
  startedAt: string;
}
```

---

# 9. Orchestrator Design

Orchestrator มีหน้าที่:

- เรียก agent ตาม flow
- ส่ง input/output ระหว่าง agent
- enforce timeout/retry/fallback
- บันทึก event log
- ไม่ทำ business reasoning เอง
- ไม่เขียน prompt
- ไม่สร้างคำตอบ guest-facing

## Recommended flow

```text
Incoming Message
    ↓
Normalize Input
    ↓
Safety Guard Agent
    ├── HUMAN → Human Handoff Agent → Guest Safe Response
    └── Continue
          ↓
Knowledge Retrieval Agent
          ↓
Intent & Behavior Classifier Agent
          ├── UNKNOWN → Safe Unknown Response
          ├── CONFIRM → Request Capture Agent
          ├── HUMAN → Human Handoff Agent
          └── ANSWER → Guest Response Agent
                           ↓
                    Verification Checks
                           ↓
                    Send Final Response
                           ↓
                    Event Log
                           ↓
           Relevant context change?
             ├── Yes → Mitri Guest Brief Agent
             └── No
```

---

# 10. Tool Permission Model

Agent แต่ละตัวต้องมี tool allowlist

| Agent | Read KB | Write Request | Write Handoff | Read Guest | Write Guest Brief | Send Notification |
|---|---:|---:|---:|---:|---:|---:|
| Safety Guard | No | No | No | No | No | No |
| Classifier | Metadata only | No | No | No | No | No |
| Retrieval | Yes | No | No | No | No | No |
| Response | Supplied evidence only | No | No | Context only | No | No |
| Request Capture | Service definitions | Yes | No | Yes | No | No |
| Handoff | Routing rules | No | Yes | Yes | No | Yes |
| Mitri Brief | Yes | Read only | Read only | Yes | Yes | No |
| Owner Insight | Aggregate only | No | No | Anonymized/aggregate | No | No |

ห้ามให้ทุก agent มี database client ที่เขียนได้ทุก table

---

# 11. Suggested Repository Structure

```text
phuket-concierge-copilot/
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── agents/
│   │   ├── safety-guard/
│   │   ├── classifier/
│   │   ├── retrieval/
│   │   ├── guest-response/
│   │   ├── verifier/
│   │   ├── request-capture/
│   │   ├── human-handoff/
│   │   ├── mitri-guest-brief/
│   │   └── owner-insight/
│   │
│   ├── orchestration/
│   ├── agent-runtime/
│   ├── llm-providers/
│   ├── schemas/
│   ├── database/
│   ├── event-log/
│   ├── notifications/
│   ├── property-context/
│   └── ui/
│
├── config/
│   ├── agents.registry.ts
│   ├── models.config.ts
│   ├── tools.registry.ts
│   └── environments/
│
├── prompts/
│   ├── safety-guard/v1.md
│   ├── classifier/v1.md
│   ├── guest-response/v1.md
│   ├── verifier/v1.md
│   ├── mitri-guest-brief/v1.md
│   └── owner-insight/v1.md
│
├── contexts/
│   ├── demo/
│   │   └── nai-harn-wellness-hideaway/
│   └── templates/
│       └── property-context-template/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── agent-contract/
│   ├── regression/
│   └── fixtures/
│
└── docs/
    ├── architecture/
    ├── product/
    └── operations/
```

---

# 12. Property Context Architecture

ระบบต้องเปลี่ยนบริบท property โดยไม่แก้ core code

## Required directory pattern

```text
contexts/{property_slug}/
├── property.config.json
├── brand_voice.json
├── knowledge_base.json
├── service_menu.json
├── handoff_rules.json
├── staff_roles.json
├── response_policies.json
├── demo_guests.json
└── manifest.json
```

## Required behavior

เมื่อเปลี่ยน property:

- เปลี่ยน context directory
- run schema validation
- seed database
- no change to agent source code
- no change to orchestration logic
- no change to UI component logic except property branding tokens/content

## Property Manifest Example

```json
{
  "property_id": "demo_nai_harn_wellness_hideaway",
  "property_slug": "nai-harn-wellness-hideaway",
  "name": "Nai Harn Wellness Hideaway",
  "context_version": "1.0.0",
  "knowledge_version": "1.0.0",
  "brand_version": "1.0.0",
  "default_language": "en",
  "enabled_agents": [
    "safety-guard",
    "behavior-classifier",
    "knowledge-retrieval",
    "guest-response",
    "request-capture",
    "human-handoff",
    "mitri-guest-brief",
    "owner-insight"
  ]
}
```

---

# 13. Context Customization Rules

ทุก property ต้อง custom ได้ผ่าน config/data เท่านั้นในเรื่อง:

- property identity
- brand voice
- greeting
- operating hours
- policies
- FAQ
- services
- prices
- required request fields
- handoff teams
- escalation rules
- staff roles
- sensitive categories
- language
- visual branding tokens
- enabled agents
- notification adapters

ถ้ามี requirement ใหม่ที่ใช้กับหลาย property ให้เพิ่มเป็น reusable module/agent

ถ้ามี requirement ที่เฉพาะ property ให้เพิ่มเป็น property config ก่อน ห้าม fork core code โดยไม่จำเป็น

---

# 14. Anti-Spaghetti Engineering Rules

## Required

1. One agent = one clear responsibility
2. Typed input/output for every agent
3. No hidden shared mutable state
4. No direct SDK calls outside adapters
5. No direct database writes outside repositories/services
6. No prompt embedded in TypeScript source
7. No model configuration embedded in agent code
8. No property-specific facts embedded in code
9. No route handler containing orchestration logic
10. No UI component deciding AI behavior
11. No agent calling another agent directly
12. All agent calls go through orchestrator/runtime
13. All actions emit traceable events
14. Every prompt/config/context has a version
15. Every behavior change requires regression tests

## Forbidden Examples

- `if propertyName === "Nai Harn..."` in business logic
- agent code importing Supabase and writing several tables directly
- React component calling Claude API
- one giant system prompt controlling all workflows
- hardcoded model names in many files
- Slack-specific code inside handoff business logic
- production behavior depending on UI labels/colors

---

# 15. Knowledge Status and State Models

## Knowledge Status

```text
VERIFIED
NEEDS_REVIEW
ARCHIVED
```

AI may answer only when:

```text
status = VERIFIED
can_ai_answer = true
```

## Product Behavior State

```text
ANSWER
CONFIRM
HUMAN
UNKNOWN
```

## Internal Risk

```text
LOW
MEDIUM
HIGH
```

## Priority

```text
NORMAL
HIGH
URGENT
```

`HUMAN` is not equal to `URGENT`.

---

# 16. Demo Build Decisions

## Property

**Nai Harn Wellness Hideaway**

- Boutique wellness stay
- Nai Harn / Rawai, Phuket
- 18 suites
- International guests
- Wellness, massage, yoga, dietary support, airport transfer

## Demo Guest

**Emma Williams**

- UK
- Sleep and stress recovery
- Quiet room
- Gluten-free meals
- Airport transfer
- Evening massage
- Yoga
- Sensitive question:
  - “I have high blood pressure. Is detox safe?”

## Channels

- Guest: standalone web chat
- Staff: dashboard
- Notification: Slack mock
- WhatsApp / LINE / OTA / email: source labels or simulated input only

## Language

- Guest chat: English first
- Staff dashboard: English first
- Thai localization deferred

## Auth

- Guest: no login
- Emma: pre-seeded identified session
- General guest: anonymous session allowed
- Staff: Supabase magic link or seeded demo users
- role field required, granular RBAC deferred

## Staff Roles

- Guest Relations
- Wellness Team
- Operations Manager
- General Manager

## Unknown Routing

- default → Guest Relations
- wellness / medical → Wellness Team
- safety / security / emergency → Operations Manager

## Weekly Insight

- in-dashboard
- generated on demand
- automated delivery deferred

## Sensitive Data

- store only minimal note needed for handoff
- do not create health profile
- visibly mark sensitive content
- support deletion/reset
- use fictional demo data only

---

# 17. AI Pipeline Performance Rule

Do not perform three LLM calls for every message by default.

## Approved Decision Flow

```text
Deterministic safety guard
→ deterministic/exact retrieval
→ behavior classification
→ answer generation if needed
→ deterministic verification
→ optional LLM verification only for uncertain cases
```

## Examples

- medical keyword + rule match → HUMAN without response-generation agent
- exact breakfast FAQ → ANSWER with direct templated response
- complex multi-fact response → response agent + verifier
- no verified evidence → UNKNOWN

---

# 18. Demo Data Pack Requirement

Implementation may begin with scaffold planning, but functional Demo requires approved synthetic data.

Required:

```text
contexts/demo/nai-harn-wellness-hideaway/
├── property.config.json
├── brand_voice.json
├── property_handbook.md
├── wellness_safety_policy.md
├── guest_relations_sop.md
├── knowledge_base.json
├── service_menu.json
├── handoff_rules.json
├── staff_roles.json
├── demo_guests.json
├── demo_stays.json
├── demo_conversations.json
├── owner_report_seed.json
└── manifest.json
```

All fictional data must be labeled:

> Demo Data — Not Actual Client Information

---

# 19. Build Sequence

1. Create monorepo structure
2. Define shared schemas
3. Implement agent registry
4. Implement LLM provider abstraction
5. Implement agent runtime
6. Implement property context loader
7. Implement event log
8. Seed demo property data
9. Implement Safety Guard Agent
10. Implement Retrieval Agent
11. Implement Behavior Classifier
12. Implement Response Agent
13. Implement deterministic verification
14. Implement Request Capture
15. Implement Human Handoff
16. Implement Guest Chat
17. Implement Staff Dashboard
18. Implement Mitri Guest Brief
19. Implement Owner Insight
20. Implement Slack demo adapter
21. Implement demo seed/reset
22. Run acceptance/regression suite
23. UI polish and demo walkthrough

---

# 20. Required Deliverables Before Full Build

Implementation Agent must return:

1. Updated architecture proposal
2. Repository tree
3. Agent registry draft
4. Agent runtime interfaces
5. LLM provider interface
6. Property context schema
7. ERD
8. API/OpenAPI draft
9. Agent pipeline diagram
10. State transition definitions
11. Demo screen inventory
12. Milestone estimate
13. Infrastructure cost estimate
14. Security/privacy assumptions
15. Final scaffold plan

Scaffold may begin after items 1–6 are approved.

---

# 21. Acceptance Criteria for Architecture

Architecture is accepted when:

- adding a new agent requires adding one module + registry entry
- changing an agent model requires one config change
- changing a property requires a new context pack, not code edits
- prompts are versioned and outside source code
- all agent inputs/outputs are schema validated
- orchestration is separate from agent logic
- providers are swappable
- notification adapters are swappable
- database writes are permission-scoped
- all AI/human actions are traceable
- Demo data is clearly separated from real client data
- no P0 feature implies PMS/payment/production messaging integration
- regression tests protect guardrails

---

# 22. Final Approval Instruction

Architecture is approved in principle with this directive as the current implementation authority.

Proceed with:

- updated architecture
- scaffold planning
- agent registry
- provider abstraction
- property context loader
- demo data schema

Do not proceed with unrestricted feature implementation until the updated architecture artifacts in Section 20 are returned and reviewed.

Core implementation principle:

> Build a small system that is easy to understand, easy to reconfigure, and difficult to misuse.

Product principle:

> AI handles routine. Humans handle the moments that matter.
