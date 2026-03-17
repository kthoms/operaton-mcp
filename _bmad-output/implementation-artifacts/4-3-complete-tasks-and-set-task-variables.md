# Story 4.3: Complete Tasks and Set Task Variables

Status: review

## Story

As an operator using operaton-mcp,
I want to complete user tasks with optional output variables and set task-local variables on in-progress tasks,
so that I can drive process execution forward through AI without manual form submission.

## Acceptance Criteria

1. **Given** a complete call is made for a valid task ID with optional completion variables (FR-14) **When** the tool call completes **Then** the response confirms completion; the process instance advances to the next step.

2. **Given** a complete call is made for a task that cannot be completed (e.g., not assigned, wrong state) **When** the tool call completes **Then** `isError: true` is returned with a structured error describing why completion failed.

3. **Given** a set-task-variables call is made with a valid variable map for an in-progress task (FR-16) **When** the tool call completes **Then** the response confirms the task-local variables were set.

4. **Given** a set-task-variables call targets a non-existent task ID **When** the tool call completes **Then** `isError: true` is returned with a structured not-found error.

5. **Given** the integration tests for FR-14 and FR-16 run **When** `npm run test:integration` executes **Then** all tests pass; completed tasks and created process instances are cleaned up in `afterEach`.

## Tasks / Subtasks

- [ ] Verify `task_complete` manifest entry and generated handler (AC: 1, 2)
  - [ ] Calls `POST /engine/{engineName}/task/{id}/complete` with optional variables body
  - [ ] Zod input: `{ id: string, variables?: Record<string, { value: unknown, type?: string }> }`
  - [ ] Success: HTTP 204 → confirmation message `"Task {id} completed successfully."`
  - [ ] Error: Operaton returns error when task not completable → `normalize()` with hint about task state
  - [ ] Run `npm run generate`
- [ ] Verify `task_setVariables` manifest entry and generated handler (AC: 3, 4)
  - [ ] Calls `POST /engine/{engineName}/task/{id}/variables` with modifications body
  - [ ] Zod input: `{ id: string, modifications: Record<string, { value: unknown, type?: string }>, deletions?: string[] }`
  - [ ] Success: HTTP 204 → confirmation message `"Task-local variables set on task {id}."`
  - [ ] Not-found: structured not-found error
- [ ] Extend integration test `test/integration/task.test.ts` (AC: 5)
  - [ ] `beforeEach`: deploy BPMN with user task + start instance
  - [ ] Test: set task-local variables → confirm; verify variable is accessible
  - [ ] Test: complete task with output variables → confirm; verify process advanced (e.g., check instance state or activity history)
  - [ ] Test: complete already-completed task → `isError: true`, appropriate error
  - [ ] Test: set variables on non-existent task ID → `isError: true`, not-found
  - [ ] `afterEach`: delete process instances (already cleaned up by task completion) + definition
  - [ ] Note: after completing a task, the process instance may have terminated — handle cleanup gracefully

## Dev Notes

### Operaton Task Complete Endpoint

`POST /engine/{engineName}/task/{id}/complete`

Request body (optional variables):
```json
{
  "variables": {
    "approved": { "value": true, "type": "Boolean" },
    "comment": { "value": "Looks good", "type": "String" }
  }
}
```

Returns HTTP 204 on success. Common errors:
- Task not found → `NotFoundException`
- Task already completed → `ProcessEngineException` or similar
- Task not assigned (when `require assignee` configured) → `ProcessEngineException`

### afterEach Cleanup Note

When a task is completed, the process instance may advance to the next step (another task) or terminate (if the user task was the last step). The `afterEach` cleanup should handle both cases:
- Try to delete the process instance by ID
- If already terminated (404), ignore the error

### Task Variables vs Process Instance Variables

**Task-local variables** (FR-16): `POST /engine/{engineName}/task/{id}/variables` — scoped to the task lifecycle only.
**Process instance variables** (FR-10): `POST /engine/{engineName}/process-instance/{id}/variables` — scoped to the entire instance.

These are different endpoints and different scoping. The task_setVariables tool sets task-local variables (FR-16).

### Anti-Patterns to Avoid

- ❌ Do NOT reuse instances across tests — each test creates its own instance in `beforeEach`
- ❌ Do NOT assume the process terminates after completing the user task — check BPMN structure

### Key File Locations

- `config/tool-manifest.json` — task group (from Story 4.1)
- `src/generated/task/` — generated (do not edit)
- `test/integration/task.test.ts` — extend

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 4.3`
- PRD FR-14, FR-16

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
