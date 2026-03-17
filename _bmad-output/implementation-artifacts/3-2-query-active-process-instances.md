# Story 3.2: Query Active Process Instances

Status: ready-for-dev

## Story

As an operator using operaton-mcp,
I want to query running process instances using rich filters,
so that I can quickly identify instances matching specific criteria — such as those with incidents or in a suspended state — without navigating Cockpit.

## Acceptance Criteria

1. **Given** a query is made with no filters (FR-06) **When** the tool call completes **Then** all active instances are returned; each result includes instance ID, definition key, business key, start time, and state.

2. **Given** a query is filtered by definition key and business key **When** the tool call completes **Then** only instances matching both criteria are returned.

3. **Given** a query is filtered by incident presence (`incidentType` set) **When** the tool call completes **Then** only instances with matching incidents are returned.

4. **Given** a query is filtered by suspension state **When** the tool call completes **Then** only instances in the specified suspension state are returned.

5. **Given** the integration test for FR-06 runs **When** `npm run test:integration` executes **Then** the test passes.

## Tasks / Subtasks

- [ ] Verify `processInstance_list` manifest entry and generated handler (AC: 1, 2, 3, 4)
  - [ ] Zod input schema includes all key filter params:
    - `processDefinitionKey?: string`
    - `businessKey?: string`
    - `incidentType?: string` (filter by incident type)
    - `withIncident?: boolean` (filter instances that have incidents)
    - `suspended?: boolean` (filter by suspension state)
    - `active?: boolean` (filter by active state)
    - `variables?: Array<{ name, operator, value }>` (variable value filter)
  - [ ] Generated handler calls `GET /engine/{engineName}/process-instance` with params as query string
  - [ ] Response: array of `{ id, definitionId, definitionKey, businessKey, startTime, state }` per instance
- [ ] Extend integration test `test/integration/processInstance.test.ts` (AC: 5)
  - [ ] `beforeEach`: deploy BPMN + start 2 test instances with distinct business keys
  - [ ] Test: list with no filters → at least 2 instances returned; each has `id`, `definitionKey`, `businessKey`, `startTime`, `state`
  - [ ] Test: list filtered by `processDefinitionKey` → only instances of that definition returned
  - [ ] Test: list filtered by `businessKey` → only matching instance returned
  - [ ] Test: list filtered by `suspended: false` → only active instances returned (all test instances should be active)
  - [ ] `afterEach`: delete all started instances + deployed definition

## Dev Notes

### Operaton Query Process Instances Endpoint

`GET /engine/{engineName}/process-instance` with extensive query parameters. Key params for FR-06:
- `processDefinitionKey` — filter by definition key (most common)
- `businessKey` — exact match on business key
- `incidentType` — filter by specific incident type (e.g., "failedJob")
- `withIncident` — `true` to return only instances with at least one incident
- `suspended` — `true` for suspended instances, `false` for active
- `firstResult` / `maxResults` — pagination (include in schema for completeness)

Response is an array of process instance objects.

### Variable Filter Format

Operaton supports variable-based filtering:
```
GET /process-instance?variables=varName_eq_value
```
The complex variable filter syntax may be out of scope for MVP — include basic support but don't over-engineer.

### Required Response Fields (FR-06)

Per FR-06, each result must include: `id`, `definitionKey`, `businessKey`, `startTime`, `state`. These are all top-level fields in Operaton's response. In MVP, return the full JSON — no field stripping.

### Anti-Patterns to Avoid

- ❌ Do NOT use `null` for missing optional fields in Zod schema — use `z.string().optional()` instead
- ❌ Integration tests must NOT assume which instances exist globally — only assert on own test instances

### Key File Locations

- `config/tool-manifest.json` — processInstance group (from Story 3.1)
- `src/generated/processInstance/` — generated (do not edit)
- `test/integration/processInstance.test.ts` — extend from Story 3.1

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 3.2`
- PRD FR-06

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
