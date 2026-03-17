# Story 7.1: Query Historic Process and Activity Instances

Status: ready-for-dev

## Story

As an operator using operaton-mcp,
I want to query completed and running process instances from history and retrieve their activity instance detail,
so that I can diagnose past failures and audit process execution paths through AI.

## Acceptance Criteria

1. **Given** the history manifest group is populated with real BPM-domain descriptions and `frMapping` for FR-30 to FR-33, and `npm run generate` is run **When** `tools/list` is called **Then** history tools appear in the list with descriptions ≤ 200 chars using BPM-domain terminology appropriate for an operator/analyst audience; `frMapping` covers FR-30 through FR-33.

2. **Given** a query-historic-instances call is made filtered by process definition key, business key, and start/end date range (FR-30) **When** the tool call completes **Then** matching historic instances are returned; each includes instance ID, definition key, business key, start time, end time, duration, and state.

3. **Given** a query-historic-instances call is filtered by completion state **When** the tool call completes **Then** only instances in the specified state (completed, active, etc.) are returned.

4. **Given** a query-activity-instances call is made for a process instance ID (FR-31) **When** the tool call completes **Then** all activity instances are returned; each includes activity ID, name, type, start time, end time, assignee (for user tasks), and duration.

5. **Given** the integration tests for FR-30 and FR-31 run **When** `npm run test:integration` executes **Then** all tests pass.

## Tasks / Subtasks

- [ ] Populate `config/tool-manifest.json` — history group (AC: 1)
  - [ ] FR-30 (`getHistoricProcessInstances`): name `history_listProcessInstances`, `frMapping: ["FR-30"]`
  - [ ] FR-31 (`getHistoricActivityInstances`): name `history_listActivityInstances`, `frMapping: ["FR-31"]`
  - [ ] FR-32 (`getHistoricTaskInstances`): name `history_listTaskInstances`, `frMapping: ["FR-32"]`
  - [ ] FR-33 (`getHistoricVariableInstances`): name `history_listVariableInstances`, `frMapping: ["FR-33"]`
  - [ ] Non-FR history ops: `frMapping: []`
  - [ ] All descriptions ≤ 200 chars; analyst/operator audit language
  - [ ] Run `npm run generate`
- [ ] Verify `history_listProcessInstances` handler (AC: 2, 3)
  - [ ] Calls `GET /engine/{engineName}/history/process-instance` with query params
  - [ ] Zod input: `{ processDefinitionKey?: string, businessKey?: string, startedBefore?: string, startedAfter?: string, finishedBefore?: string, finishedAfter?: string, completed?: boolean, active?: boolean }`
  - [ ] Response: array of `{ id, processDefinitionKey, businessKey, startTime, endTime, durationInMillis, state }` per historic instance
- [ ] Verify `history_listActivityInstances` handler (AC: 4)
  - [ ] Calls `GET /engine/{engineName}/history/activity-instance` with `processInstanceId` filter
  - [ ] Zod input: `{ processInstanceId: string, activityType?: string, activityName?: string, finished?: boolean }`
  - [ ] Response: array of `{ id, activityId, activityName, activityType, startTime, endTime, durationInMillis, assignee }` per activity
- [ ] Create integration test `test/integration/history.test.ts` (AC: 5)
  - [ ] `beforeEach`: deploy BPMN + start and complete a process instance
  - [ ] Test: query historic instances by definition key → find completed test instance; verify all required fields
  - [ ] Test: query filtered by `completed: true` → only completed instances
  - [ ] Test: query activity instances for process instance ID → list of activity instances; verify `activityId`, `activityType`, `startTime`
  - [ ] `afterEach`: no cleanup needed (history is read-only)
  - [ ] But still delete live artifacts: deployed definition (cleanup of any live instances if creation failed midway)
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### Operaton History API

**Historic process instances:** `GET /engine/{engineName}/history/process-instance`
Key filter params: `processDefinitionKey`, `businessKey`, `startedBefore`, `startedAfter`, `finishedBefore`, `finishedAfter`, `completed`, `active`, `unfinished`

Response fields per FR-30: `id`, `processDefinitionKey`, `businessKey`, `startTime`, `endTime`, `durationInMillis`, `state`.

**Historic activity instances:** `GET /engine/{engineName}/history/activity-instance`
Key filter params: `processInstanceId`, `activityType`, `activityName`, `finished`, `unfinished`

Response fields per FR-31: `id`, `activityId`, `activityName`, `activityType`, `startTime`, `endTime`, `durationInMillis`, `assignee` (for user tasks).

### Integration Test Setup

Use a simple BPMN with a service task (no user interaction needed). Start the instance, the service task runs automatically (or use a no-op delegate), process completes. The history API immediately shows the completed instance.

If using async service tasks, trigger the job before asserting on history.

### Read-Only Domain

All history operations are read-only. No write operations, no `afterEach` cleanup of history records needed. Only clean up the process definition itself.

### Anti-Patterns to Avoid

- ❌ Do NOT test against live production history records — filter by `processDefinitionKey` of the test definition
- ❌ Do NOT assert exact counts in history queries — other tests may have run and left history records

### Key File Locations

- `config/tool-manifest.json` — add history group
- `src/generated/history/` — generated (do not edit)
- `test/integration/history.test.ts` — new integration test file

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 7.1`
- PRD FR-30, FR-31

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
