---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-e-01-discovery
  - step-e-02-review
  - step-e-03-edit
inputDocuments: []
workflowType: 'prd'
classification:
  projectType: developer_tool
  domain: general
  complexity: medium
  projectContext: greenfield
date: '2026-03-16'
lastEdited: '2026-03-17'
editHistory:
  - date: '2026-03-17'
    changes: 'Added FR section (individual-operation level), NFR section, Setup Requirements section; fixed Success Criteria measurability; added Out of Scope; labeled Journey 3 as Growth-phase'
---

# Product Requirements Document - operaton-mcp

**Author:** Karsten
**Date:** 2026-03-16

## Executive Summary

operaton-mcp is an MCP (Model Context Protocol) server that exposes the complete Operaton REST API as AI-callable tools. It enables AI assistants and agents to perform the full range of Operaton engine operations — process deployment, instance management, task interaction, incident handling, job control, user/group administration, and historical data queries — without restriction. The target users are engineers and operations teams who run Operaton-powered workflow automation and want to manage, monitor, and evolve their process landscapes through AI tooling rather than partial web UIs or manual API calls.

The two primary use cases are: (1) **Operations** — querying live state, claiming and completing tasks, managing incidents, resuming suspended jobs, detecting bottlenecks; and (2) **Authoring** — describing a process in natural language, having AI generate and deploy the BPMN, then iterating on it. Together, they make Operaton fully controllable through conversational AI.

### What Makes This Special

Operaton's REST API is comprehensive and well-documented, but no existing tool exposes it fully. Cockpit, Tasklist, and similar UIs offer curated, partial windows into the engine. operaton-mcp removes that ceiling entirely: every API capability is accessible, with AI handling the translation from user intent to precise API calls. The core insight is that the capability gap isn't in the engine — it's in accessibility. MCP closes that gap. This also positions operaton-mcp as a first-mover in an unclaimed space: AI-native BPM tooling via the MCP ecosystem.

## Project Classification

- **Project Type:** Developer Tool (MCP server)
- **Domain:** Enterprise BPM / Workflow Automation
- **Complexity:** Medium
- **Project Context:** Greenfield

## Success Criteria

### User Success

- Any Operaton operation achievable via the REST API is achievable via an AI tool — zero capability gaps between the API and what MCP exposes
- Users accomplish complex multi-step operations (e.g., locate a failing process, inspect its incident, resolve and resume it) through natural language without consulting API docs
- AI surfaces operational insights on demand (MVP): bottlenecks, suspended jobs, anomalous process durations, task pile-ups — returned in response to user queries; autonomous proactive monitoring is a Growth feature
- The BPMN authoring loop works end-to-end: describe process in natural language → AI generates valid BPMN → deploys to engine → process is executable (Growth feature)

### Business Success

- Full adoption pathway for the Operaton open-source community: discoverable, installable, and usable by any Operaton user without special setup
- 100% of public Operaton REST API endpoints exposed as MCP tools (measurable, binary)
- Becomes the reference MCP integration for Operaton; referenced in official Operaton documentation or community resources

### Technical Success

- **Write/mutating operations:** Zero silent failures — all mutating tool calls return explicit success confirmation or a structured error message; inputs validated before execution; no partial state corruption
- **Read operations:** Data is current and accurate; minor edge cases (e.g., eventual consistency windows) are acceptable, but stale or incorrect data in normal operation is not
- Compatible with major MCP-capable AI clients (Claude Desktop, Copilot, etc.)
- No user-specific session state stored between requests; each tool call is self-contained using only the configured Operaton connection

### Measurable Outcomes

- API coverage: 100% of Operaton REST endpoints mapped to MCP tools at launch
- Write operation reliability: zero silent failures; all errors surfaced with actionable messages
- Community signal: Stars, issues, and community PRs within 90 days of release indicate real adoption

## Product Scope

### MVP — Minimum Viable Product

Full Operaton REST API surface as MCP tools, organized by domain:
- Process definitions & deployments (deploy, list, get, delete)
- Process instances (start, query, suspend, resume, delete, variables)
- Tasks (query, claim, unclaim, complete, delegate, set variables)
- Jobs & job definitions (query, execute, suspend, resume, set retries)
- Incidents (query, resolve)
- Users & groups (create, update, delete, query, membership)
- Historic data (process instances, activity instances, task history, variable history)
- Decisions & DMN (deploy, evaluate)

### Out of Scope (MVP)

The following are explicitly deferred to Growth or Vision phases and are not part of the MVP delivery:

- Autonomous/proactive process monitoring and alerting (AI-initiated, not user-initiated)
- BPMN generation and natural language → BPMN authoring
- Multi-engine support (connecting to multiple Operaton instances simultaneously)
- Prompt templates and guided scenario workflows
- Process optimization recommendations
- Any UI, dashboard, or web interface

### Growth Features (Post-MVP)

- Intelligence layer: bottleneck detection, anomaly surfacing, process duration analysis
- BPMN authoring: natural language → BPMN generation → deploy workflow
- Multi-engine support (connect to multiple Operaton instances)
- Prompt templates / guided workflows for common operational scenarios

### Vision (Future)

- Autonomous monitoring: AI watches process health, alerts proactively, suggests remediations
- Process optimization recommendations based on historic patterns
- Full round-trip: AI-designed, AI-deployed, AI-monitored process automation

## User Journeys

### Journey 1: Marcus — The Process Operator (Routine Oversight)

**Persona:** Marcus is a process operations specialist at a mid-sized logistics company running Operaton to automate shipment tracking and exception handling. He's responsible for keeping dozens of active process definitions healthy across hundreds of concurrent instances.

**Opening Scene:** Marcus starts his morning with a familiar ritual — opening Cockpit, navigating to the process list, clicking into each active process, checking for incidents, then switching to Tasklist to eyeball the task queues. It takes 20 minutes and he's never confident he hasn't missed something buried three clicks deep.

**Rising Action:** With operaton-mcp, Marcus opens his AI assistant and asks: *"What needs my attention today?"* The AI queries active instances, incident counts, overdue tasks, and suspended jobs simultaneously — returning a prioritised summary. Three incidents on the shipment-delay process, one job stuck with retries exhausted, and a task queue growing unusually fast on the returns workflow.

**Climax:** Marcus says: *"Resolve the incidents on the shipment-delay process and retry the failed job."* The AI confirms the actions, executes them via the API, and reports back. What used to require navigating four screens and recalling the right API sequence takes one exchange.

**Resolution:** Marcus's oversight routine shrinks from 20 minutes to 5. More importantly, the AI's summary catches anomalies (the growing returns queue) that his manual scan would have missed. He now spends his morning on the exception that actually needs judgement, not on gathering data.

*Reveals requirements for: process/instance query tools, incident resolution, job retry, task queue summary, multi-resource queries in a single call.*

---

### Journey 2: Marcus — Production Incident (Edge Case / Firefighting)

**Opening Scene:** Mid-afternoon, Marcus gets a Slack alert: the order-fulfilment process is failing for a subset of orders. No UI tells him why — just error counts climbing.

**Rising Action:** Marcus asks the AI: *"Find stuck or failed order-fulfilment instances from the last two hours."* The AI queries historic and active instances, filters by error state, and returns the affected instances with their incident messages. All are failing at the same service task — an external payment gateway call returning 503s.

**Climax:** Marcus asks the AI to *"suspend all active order-fulfilment instances and set the failed jobs to zero retries until I confirm the gateway is back."* The AI executes the suspensions and job updates, preventing further failures from accumulating. When the gateway recovers, Marcus says: *"Resume the suspended instances and retry the jobs."* Done.

**Resolution:** The incident is contained and recovered through a conversation. Marcus never had to look up endpoint signatures, construct payloads manually, or risk typos in a curl command during a production incident.

*Reveals requirements for: filtered instance queries, bulk suspend/resume, job retry management, incident detail retrieval, error-safe mutating operations.*

---

### Journey 3: Sofia — The Business Analyst (Process Authoring) *(Growth Feature)*

**Persona:** Sofia is a business analyst at an insurance company. She designs and owns the claims-processing workflow — she understands the business logic deeply but relies on a developer to translate her flowcharts into BPMN and deploy them to Operaton. The iteration cycle takes days.

**Opening Scene:** Sofia needs to add a new fast-track approval path for low-value claims. She's drawn the flow in a diagram, but the developer queue is long and every change means another ticket, another review, another wait.

**Rising Action:** Sofia opens her AI assistant and describes the new path: *"For claims under €500, skip the manual review step and go directly to automatic approval, then notify the customer via the existing email service task."* She pastes in the current BPMN XML from the repository. The AI analyses the existing process, proposes the modification, and shows her the updated BPMN with the new gateway and routing logic.

**Climax:** Sofia reviews the proposed BPMN — she doesn't read XML fluently, but the AI also provides a plain-language summary of what it changed and why. She asks for one adjustment: *"Add a variable to flag these as auto-approved for reporting."* The AI updates the BPMN. She says: *"Deploy this to the test engine."* Deployed.

**Resolution:** Sofia tests the new path immediately in Tasklist, confirms it routes correctly, and asks the AI to deploy to production. The entire cycle — design, implement, deploy — takes 30 minutes instead of 3 days. She no longer depends on a developer for process changes she fully understands herself.

*Reveals requirements for: BPMN generation/modification tools, deployment tools, natural language process description intake, plain-language BPMN explanation, test vs. production engine targeting. These capabilities are targeted for the Growth phase, not MVP.*

---

### Journey 4: Alex — The Engineer/Integrator (First-Time Setup)

**Persona:** Alex is a backend engineer who maintains the Operaton infrastructure at a SaaS company. His team has started using Claude Desktop heavily and he wants to give them — and himself — MCP access to Operaton.

**Opening Scene:** Alex has heard about operaton-mcp. He needs to install it, connect it to their Operaton instance, and verify it works before rolling it out to the team.

**Rising Action:** Alex installs operaton-mcp via the standard package manager, provides the Operaton base URL and credentials via environment config, and registers the server with Claude Desktop. He asks the AI: *"List the currently deployed process definitions."* The AI returns the list — connection confirmed.

**Climax:** Alex runs a quick validation: he starts a test process instance, queries its state, completes the first user task, and checks the historic data — all via AI tools. Everything behaves as expected. He documents the config for his team in 10 minutes.

**Resolution:** Alex rolls out operaton-mcp to his team with a one-page setup guide. The team can now use their AI assistant for operational tasks without needing to know the Operaton API. Alex becomes the person who enabled it, not the person who has to handle every ad-hoc query.

*Reveals requirements for: simple connection configuration, clear error messages on misconfiguration, stable tool naming/discoverability, predictable behaviour for validation workflows.*

---

### Journey Requirements Summary (MVP)

*Note: Journey 3 (Sofia) requirements map to Growth-phase features and are excluded from the MVP capability table below.*

| Capability Area | Revealed By |
|---|---|
| Process/instance query (filtered, multi-resource) | Marcus J1, J2 |
| Incident retrieval and resolution | Marcus J1, J2 |
| Job retry, suspend, resume (bulk-safe) | Marcus J1, J2 |
| Task queue query and management | Marcus J1 |
| Process/deployment management | Alex J4, Sofia J3 |
| BPMN generation and modification | Sofia J3 |
| Natural language → BPMN translation | Sofia J3 |
| Historic data query | Marcus J2, Alex J4 |
| Connection configuration and error clarity | Alex J4 |
| Safe mutating operations with confirmation | Marcus J2 |

## Setup Requirements

### Prerequisites

- A running Operaton REST API instance accessible over HTTP/HTTPS
- An MCP-capable AI client (Claude Desktop, GitHub Copilot Chat, or any MCP-standard client)
- Node.js runtime (version requirement defined at implementation time)

### Installation

Install via npm (or equivalent package manager):

```
npm install -g operaton-mcp
```

### Configuration

All connection parameters are supplied via environment variables; no credentials are hardcoded:

| Variable | Required | Description |
|---|---|---|
| `OPERATON_BASE_URL` | Yes | Base URL of the Operaton REST API (e.g., `http://localhost:8080/engine-rest`) |
| `OPERATON_USERNAME` | Yes | Operaton user with API access |
| `OPERATON_PASSWORD` | Yes | Corresponding password |
| `OPERATON_ENGINE` | No | Engine name if non-default (default: `default`) |

### MCP Client Registration

Register operaton-mcp as an MCP server in your client's configuration file. Example for Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "operaton": {
      "command": "operaton-mcp",
      "env": {
        "OPERATON_BASE_URL": "http://your-operaton-host/engine-rest",
        "OPERATON_USERNAME": "your-user",
        "OPERATON_PASSWORD": "your-password"
      }
    }
  }
}
```

### Verification

After registration, ask your AI client: *"List the currently deployed process definitions."* A successful response confirms connectivity. A connection error will include the base URL attempted and a diagnosis (unreachable host, authentication failure, etc.).

## Functional Requirements

All FRs below apply to MVP scope. Write/mutating operations (marked **W**) must satisfy NFR-01 (zero silent failures). Read operations (marked **R**) must satisfy NFR-02 (current state accuracy).

### Process Definitions & Deployments

**FR-01 (W):** Users can deploy a process definition by submitting a BPMN or DMN artifact; the server returns the deployment ID and process definition key on success, or a structured error with cause on failure.

**FR-02 (R):** Users can list deployed process definitions, optionally filtered by key, name, version, or tenant; results include definition ID, key, name, version, and deployment ID.

**FR-03 (R):** Users can retrieve the metadata and BPMN/DMN XML of a specific process definition by ID or key.

**FR-04 (W):** Users can delete a process definition by ID; the server returns confirmation on success or an error if active instances exist.

### Process Instances

**FR-05 (W):** Users can start a process instance from a deployed process definition, optionally supplying initial variables and a business key; the server returns the instance ID, definition key, and current state on success.

**FR-06 (R):** Users can query active process instances, filtered by definition key, business key, variable values, incident presence, or suspension state; results include instance ID, definition key, business key, start time, and state.

**FR-07 (W):** Users can suspend an active process instance by ID; the server returns confirmation or an error if the instance is not in a suspendable state.

**FR-08 (W):** Users can resume a suspended process instance by ID; the server returns confirmation or an error if the instance is not suspended.

**FR-09 (W):** Users can delete a process instance by ID with an optional deletion reason; the server returns confirmation on success.

**FR-10 (R/W):** Users can read process instance variables by instance ID, returning name, type, and value for each variable. Users can write or update variables by instance ID; write operations return confirmation or a structured error on failure.

### Tasks

**FR-11 (R):** Users can query user tasks, filtered by assignee, candidate group, process instance ID, task definition key, or due date; results include task ID, name, assignee, candidate groups, priority, due date, and process instance ID.

**FR-12 (W):** Users can claim a task by task ID and assignee; the server returns confirmation or an error if the task is already claimed or does not exist.

**FR-13 (W):** Users can unclaim a task by task ID; the server returns confirmation.

**FR-14 (W):** Users can complete a task by task ID, optionally supplying completion variables; the server returns confirmation or an error if the task cannot be completed.

**FR-15 (W):** Users can delegate a task to another user by task ID; the server returns confirmation or an error.

**FR-16 (W):** Users can set task-local variables on a task by task ID; the server returns confirmation or a structured error on failure.

### Jobs & Job Definitions

**FR-17 (R):** Users can query jobs, filtered by process instance ID, job definition ID, exception presence, retries remaining, or due date; results include job ID, type, retries, due date, and exception message if present.

**FR-18 (W):** Users can trigger immediate execution of a job by job ID; the server returns confirmation or the exception message if the job fails during execution.

**FR-19 (W):** Users can suspend a job by job ID or all jobs for a job definition by job definition ID; the server returns confirmation.

**FR-20 (W):** Users can resume a suspended job by job ID or all suspended jobs for a job definition by job definition ID; the server returns confirmation.

**FR-21 (W):** Users can set the retry count on a job by job ID; the server returns confirmation or an error.

### Incidents

**FR-22 (R):** Users can query incidents, filtered by process instance ID, incident type, activity ID, or root cause incident ID; results include incident ID, type, message, activity ID, and affected process instance ID.

**FR-23 (W):** Users can resolve an incident by incident ID; the server returns confirmation or an error if the incident cannot be resolved.

### Users & Groups

**FR-24 (W):** Users can create an Operaton user account by supplying ID, first name, last name, email, and password; the server returns confirmation or an error if the ID already exists.

**FR-25 (W):** Users can update an existing Operaton user's profile or password by user ID; the server returns confirmation or an error.

**FR-26 (W):** Users can delete an Operaton user account by user ID; the server returns confirmation or an error if the user does not exist.

**FR-27 (R):** Users can query Operaton users, filtered by ID, first name, last name, or email; results are returned as a structured list.

**FR-28 (W):** Users can create or delete groups by group ID and name; each mutating operation returns confirmation or a structured error.

**FR-29 (W):** Users can add or remove a user from a group; each operation returns confirmation or an error if the user or group does not exist.

### Historic Data

**FR-30 (R):** Users can query historic process instances, filtered by process definition key, business key, start/end date range, or completion state; results include instance ID, definition key, business key, start time, end time, duration, and state.

**FR-31 (R):** Users can query historic activity instances for a process instance, returning activity ID, name, type, start time, end time, assignee (for user tasks), and duration.

**FR-32 (R):** Users can query historic task instances, filtered by process instance ID or task definition key; results include task name, assignee, completion time, and duration.

**FR-33 (R):** Users can query historic variable instances for a process instance, returning variable name, type, value, and the activity instance in which the variable was set.

### Decisions & DMN

**FR-34 (W):** Users can deploy a DMN decision table by submitting a DMN artifact; the server returns the decision definition key and deployment ID on success, or a structured error on failure.

**FR-35 (W/R):** Users can evaluate a deployed decision table by decision definition key, supplying input variables; the server returns the evaluation result or a structured error if evaluation fails.

## Non-Functional Requirements

**NFR-01 — Write Operation Reliability:**
All mutating tool calls (deploy, start, suspend, resume, delete, complete, claim, unclaim, retry, resolve, create, update) return either explicit success confirmation or a structured error message containing the error type, cause, and recommended corrective action where applicable. Zero silent failures permitted.
*Measurement: Integration test suite covers error paths for all 35 FRs; verified by automated test run against a live Operaton instance.*

**NFR-02 — Read Accuracy:**
Read operations return the current state of the Operaton engine at time of call. Reads during normal engine operation must not return stale or incorrect data; eventual consistency windows during high-load engine operations are acceptable edge cases, not normal behaviour.
*Measurement: Integration tests compare tool results against direct Operaton REST API responses for equivalent queries on the same instance.*

**NFR-03 — MCP Protocol Compliance:**
The server is compatible with at least Claude Desktop and GitHub Copilot Chat MCP client implementations at launch. Compatibility is verified by functional integration tests against both clients.
*Measurement: Functional test suite executed against both client implementations; all 35 FRs exercisable from each client.*

**NFR-04 — Stateless Operation:**
No user-specific session state is stored between tool calls. Each tool call is self-contained, requiring only the configured Operaton connection parameters. The server holds no in-memory user context between calls.
*Measurement: Architecture review confirms absence of session storage; verified by restarting server mid-session with no loss of Operaton state.*

**NFR-05 — Error Message Quality:**
All error responses include: error type, the specific cause (e.g., HTTP status and Operaton error message), and where applicable a recommended corrective action (e.g., "Check that the process definition key exists"). Generic "error occurred" messages are not acceptable.
*Measurement: Error response test cases cover common failure modes (not found, already exists, conflict, connection failure, authentication failure) for each FR category.*

**NFR-06 — Configurability:**
All Operaton connection parameters (base URL, credentials, engine name) are configurable via environment variables. No endpoints, credentials, or engine names are hardcoded. A misconfigured or unreachable connection produces an error that identifies the parameter causing the failure.
*Measurement: Configuration test matrix covers valid config, wrong URL, wrong credentials, and unreachable host; each produces the correct error response.*
