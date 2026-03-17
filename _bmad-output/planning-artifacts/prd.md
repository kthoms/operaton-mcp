---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
inputDocuments: []
workflowType: 'prd'
classification:
  projectType: developer_tool
  domain: general
  complexity: medium
  projectContext: greenfield
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
- AI proactively surfaces operational insights: bottlenecks, suspended jobs, anomalous process durations, task pile-ups — without requiring explicit queries
- The BPMN authoring loop works end-to-end: describe process in natural language → AI generates valid BPMN → deploys to engine → process is executable

### Business Success

- Full adoption pathway for the Operaton open-source community: discoverable, installable, and usable by any Operaton user without special setup
- 100% of public Operaton REST API endpoints exposed as MCP tools (measurable, binary)
- Becomes the reference MCP integration for Operaton; referenced in official Operaton documentation or community resources

### Technical Success

- **Write/mutating operations:** Maximum reliability — validate inputs before execution, surface clear errors on failure, no silent failures or partial state corruption
- **Read operations:** Data is current and accurate; minor edge cases (e.g., eventual consistency windows) are acceptable, but stale or incorrect data in normal operation is not
- Compatible with major MCP-capable AI clients (Claude Desktop, Copilot, etc.)
- Stateless server design — no persistent state required beyond Operaton engine connection config

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

### Journey 3: Sofia — The Business Analyst (Process Authoring)

**Persona:** Sofia is a business analyst at an insurance company. She designs and owns the claims-processing workflow — she understands the business logic deeply but relies on a developer to translate her flowcharts into BPMN and deploy them to Operaton. The iteration cycle takes days.

**Opening Scene:** Sofia needs to add a new fast-track approval path for low-value claims. She's drawn the flow in a diagram, but the developer queue is long and every change means another ticket, another review, another wait.

**Rising Action:** Sofia opens her AI assistant and describes the new path: *"For claims under €500, skip the manual review step and go directly to automatic approval, then notify the customer via the existing email service task."* She pastes in the current BPMN XML from the repository. The AI analyses the existing process, proposes the modification, and shows her the updated BPMN with the new gateway and routing logic.

**Climax:** Sofia reviews the proposed BPMN — she doesn't read XML fluently, but the AI also provides a plain-language summary of what it changed and why. She asks for one adjustment: *"Add a variable to flag these as auto-approved for reporting."* The AI updates the BPMN. She says: *"Deploy this to the test engine."* Deployed.

**Resolution:** Sofia tests the new path immediately in Tasklist, confirms it routes correctly, and asks the AI to deploy to production. The entire cycle — design, implement, deploy — takes 30 minutes instead of 3 days. She no longer depends on a developer for process changes she fully understands herself.

*Reveals requirements for: BPMN generation/modification tools, deployment tools, natural language process description intake, plain-language BPMN explanation, test vs. production engine targeting.*

---

### Journey 4: Alex — The Engineer/Integrator (First-Time Setup)

**Persona:** Alex is a backend engineer who maintains the Operaton infrastructure at a SaaS company. His team has started using Claude Desktop heavily and he wants to give them — and himself — MCP access to Operaton.

**Opening Scene:** Alex has heard about operaton-mcp. He needs to install it, connect it to their Operaton instance, and verify it works before rolling it out to the team.

**Rising Action:** Alex installs operaton-mcp via the standard package manager, provides the Operaton base URL and credentials via environment config, and registers the server with Claude Desktop. He asks the AI: *"List the currently deployed process definitions."* The AI returns the list — connection confirmed.

**Climax:** Alex runs a quick validation: he starts a test process instance, queries its state, completes the first user task, and checks the historic data — all via AI tools. Everything behaves as expected. He documents the config for his team in 10 minutes.

**Resolution:** Alex rolls out operaton-mcp to his team with a one-page setup guide. The team can now use their AI assistant for operational tasks without needing to know the Operaton API. Alex becomes the person who enabled it, not the person who has to handle every ad-hoc query.

*Reveals requirements for: simple connection configuration, clear error messages on misconfiguration, stable tool naming/discoverability, predictable behaviour for validation workflows.*

---

### Journey Requirements Summary

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
