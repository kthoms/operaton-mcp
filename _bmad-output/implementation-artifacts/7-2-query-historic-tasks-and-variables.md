# Story 7.2: Query Historic Tasks and Variables

Status: review

## Story

As an operator using operaton-mcp,
I want to query historic task instances and the variable history for a process instance,
so that I can reconstruct the complete execution record of a process through AI for audit and debugging purposes.

## Acceptance Criteria

1. **Given** a query-historic-tasks call is made filtered by process instance ID and task definition key (FR-32) **When** the tool call completes **Then** matching historic tasks are returned; each includes task name, assignee, completion time, and duration.

2. **Given** a query-historic-variables call is made for a process instance ID (FR-33) **When** the tool call completes **Then** all historic variable instances are returned; each includes variable name, type, value, and the activity instance in which it was set.

3. **Given** a historic query targets a process instance ID that has no history records **When** the tool call completes **Then** an empty list is returned (not an error).

4. **Given** the integration tests for FR-32 and FR-33 run **When** `npm run test:integration` executes **Then** all tests pass.

## Tasks / Subtasks

- [ ] Verify `history_listTaskInstances` and `history_listVariableInstances` manifest entries (manifest from Story 7.1)
  - [ ] `history_listTaskInstances`: `GET /engine/{engineName}/history/task`
    - Zod input: `{ processInstanceId?: string, taskDefinitionKey?: string, finished?: boolean, assigned?: boolean }`
    - Response: array of `{ id, name, assignee, endTime, durationInMillis, processInstanceId, taskDefinitionKey }`
  - [ ] `history_listVariableInstances`: `GET /engine/{engineName}/history/variable-instance`
    - Zod input: `{ processInstanceId?: string, variableName?: string, variableNameLike?: string }`
    - Response: array of `{ id, name, type, value, processInstanceId, activityInstanceId }`
  - [ ] Run `npm run generate` to verify
- [ ] Verify empty list behavior for no-match queries (AC: 3)
  - [ ] Operaton returns an empty array `[]` for queries with no matching records
  - [ ] The generated handler should return the empty array as-is — not convert to error
  - [ ] Zod validation should accept empty array as valid response
- [ ] Extend integration test `test/integration/history.test.ts` (AC: 4)
  - [ ] `beforeEach`: deploy BPMN with user task + variables; start instance; complete it (user task → claim → complete with variables)
  - [ ] Test: query historic tasks by `processInstanceId` → at least the user task appears; verify `name`, `assignee`, `endTime`, `durationInMillis`
  - [ ] Test: query historic variables by `processInstanceId` → find test variables; verify `name`, `type`, `value`, `activityInstanceId`
  - [ ] Test: query with non-existent processInstanceId → empty array returned (not error)
  - [ ] `afterEach`: delete process definition (history records remain but are read-only)
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### Operaton Historic Task Instances API

`GET /engine/{engineName}/history/task`
Key filters: `processInstanceId`, `taskDefinitionKey`, `taskName`, `assignee`, `finished`

Response fields per FR-32: `name`, `assignee`, `endTime` (completion time), `durationInMillis`. Also: `id`, `taskDefinitionKey`, `processInstanceId`.

### Operaton Historic Variable Instances API

`GET /engine/{engineName}/history/variable-instance`
Key filters: `processInstanceId`, `variableName`, `variableNameLike`, `executionId`, `activityInstanceId`

Response fields per FR-33: `name`, `type`, `value`, `activityInstanceId`. Also: `id`, `processInstanceId`.

Note: `value` may be null for complex object types; `type` indicates the variable type (String, Integer, etc.).

### Empty Array vs Error

A key behavioral requirement (AC3): when no history records exist for a query, Operaton returns `[]`. The handler must NOT convert an empty array to an error response. This is correct behavior — the process instance may not have run tasks or set variables.

### Integration Test Complexity

The historic task test requires:
1. A BPMN with a user task
2. Start instance → get task ID
3. Claim task (creates assignee record)
4. Complete task with variables
5. Query historic tasks → verify

This is more complex than process instance tests. Build on the task integration test patterns from Epic 4.

### Anti-Patterns to Avoid

- ❌ Do NOT return an error for empty history queries — return `[]`
- ❌ Do NOT assume variables are set unless the test explicitly sets them in `beforeEach`

### Key File Locations

- `config/tool-manifest.json` — history group (from Story 7.1)
- `src/generated/history/` — generated (do not edit)
- `test/integration/history.test.ts` — extend from Story 7.1

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 7.2`
- PRD FR-32, FR-33

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
