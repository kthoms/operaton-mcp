# Story 4.1: Query User Tasks

Status: ready-for-dev

## Story

As an operator using operaton-mcp,
I want to query user tasks with rich filters,
so that I can identify task backlogs, overdue items, and unassigned work through AI without opening Tasklist.

## Acceptance Criteria

1. **Given** the task manifest group is populated with real BPM-domain descriptions and `frMapping` for FR-11 to FR-16, and `npm run generate` is run **When** `tools/list` is called **Then** task tools appear in the list with descriptions ≤ 200 chars using BPM-domain terminology appropriate for an operator audience; `frMapping` covers FR-11 through FR-16.

2. **Given** a query is made with no filters (FR-11) **When** the tool call completes **Then** all user tasks are returned; each result includes task ID, name, assignee, candidate groups, priority, due date, and process instance ID.

3. **Given** a query is filtered by assignee, candidate group, process instance ID, task definition key, and due date **When** the tool call completes **Then** only tasks matching all supplied filters are returned.

4. **Given** the integration test for FR-11 runs **When** `npm run test:integration` executes **Then** the test passes.

## Tasks / Subtasks

- [ ] Populate `config/tool-manifest.json` — task group (AC: 1)
  - [ ] Cover all task operationIds from spec (~22 operations)
  - [ ] FR-11 (`getTasks`): name `task_list`, BPM-domain description, `frMapping: ["FR-11"]`
  - [ ] FR-12 (`claim`): name `task_claim`, `frMapping: ["FR-12"]`
  - [ ] FR-13 (`unclaim`): name `task_unclaim`, `frMapping: ["FR-13"]`
  - [ ] FR-14 (`complete`): name `task_complete`, `frMapping: ["FR-14"]`
  - [ ] FR-15 (`delegate`): name `task_delegate`, `frMapping: ["FR-15"]`
  - [ ] FR-16 (`createTask`, `setTaskVariables`): name `task_setVariables`, `frMapping: ["FR-16"]`
  - [ ] Non-FR task ops: `frMapping: []`
  - [ ] All descriptions ≤ 200 chars; operator-level BPM language
  - [ ] Run `npm run generate`
- [ ] Verify `task_list` generated handler (AC: 2, 3)
  - [ ] Calls `GET /engine/{engineName}/task` with query params
  - [ ] Zod input schema includes all key filter params:
    - `assignee?: string`
    - `candidateGroup?: string`
    - `processInstanceId?: string`
    - `taskDefinitionKey?: string`
    - `dueBefore?: string` (ISO 8601 date)
    - `dueAfter?: string` (ISO 8601 date)
    - `priority?: number`
    - `unassigned?: boolean`
    - `firstResult?: number`, `maxResults?: number` (pagination)
  - [ ] Response: array with `{ id, name, assignee, candidateGroups, priority, due, processInstanceId }` per task
- [ ] Create integration test `test/integration/task.test.ts` (AC: 4)
  - [ ] `beforeEach`: deploy BPMN with user task + start process instance to create tasks
  - [ ] Test: list with no filters → at least the created task is returned; result has `id`, `name`, `processInstanceId`
  - [ ] Test: list filtered by `processInstanceId` → only tasks for that instance
  - [ ] Test: list filtered by `assignee` → only tasks assigned to that user (may require claiming first)
  - [ ] `afterEach`: complete or delete created tasks (via instance deletion) + delete definition

## Dev Notes

### Operaton Task Query Endpoint

`GET /engine/{engineName}/task` — returns task list. Key query params:
- `assignee` — exact assignee user ID
- `candidateGroup` — group name (tasks in candidate groups)
- `processInstanceId` — filter by owning process instance
- `taskDefinitionKey` — filter by task definition (BPMN task ID)
- `due` — due date filter (exact, before, after)
- `priority` — numeric priority filter
- `unassigned` — `true` for tasks with no assignee

**POST variant:** `POST /engine/{engineName}/task` with JSON body — some filter combinations require the POST body form. Check the OpenAPI spec for which filters require POST.

### Required Response Fields (FR-11)

Per FR-11: `task ID`, `name`, `assignee`, `candidate groups`, `priority`, `due date`, `process instance ID`. All are top-level fields in Operaton's task response object. Return full JSON in MVP.

### Integration Test Setup

Use a BPMN with a user task assigned to a candidate group:
```xml
<bpmn:userTask id="approval" name="Approval Task">
  <bpmn:extensionElements>
    <camunda:candidateGroups>testGroup</camunda:candidateGroups>
  </bpmn:extensionElements>
</bpmn:userTask>
```

Starting this process creates a task in the `testGroup` candidate group.

### Anti-Patterns to Avoid

- ❌ Do NOT assume global task list is empty — filter by `processInstanceId` to isolate test tasks
- ❌ Do NOT hardcode task IDs — discover them via list query in `beforeEach`

### Key File Locations

- `config/tool-manifest.json` — add task group
- `src/generated/task/` — generated (do not edit)
- `test/integration/task.test.ts` — new integration test file

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 4.1`
- PRD FR-11

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
