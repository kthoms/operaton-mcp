# Story 3.1: Start and Delete Process Instances

Status: review

## Story

As an operator using operaton-mcp,
I want to start a new process instance from a deployed definition and delete instances that are no longer needed,
so that I can initiate and clean up workflow execution through AI conversation.

## Acceptance Criteria

1. **Given** the processInstance manifest group is populated with real BPM-domain descriptions and `frMapping` for FR-05 to FR-10, and `npm run generate` is run **When** `tools/list` is called **Then** processInstance tools appear in the list with descriptions ≤ 200 chars using BPM-domain terminology appropriate for an operator audience; `frMapping` covers FR-05 through FR-10.

2. **Given** a start call is made with a valid process definition key, optional initial variables, and a business key (FR-05) **When** the tool call completes **Then** the response contains the instance ID, definition key, and current state.

3. **Given** a start call references a process definition key that does not exist **When** the tool call completes **Then** `isError: true` is returned with a structured error identifying the unknown definition key.

4. **Given** a delete call is made for an existing instance with an optional reason (FR-09) **When** the tool call completes **Then** the response confirms deletion; the reason is recorded if supplied.

5. **Given** the integration tests for FR-05 and FR-09 run **When** `npm run test:integration` executes **Then** all tests pass; started instances are cleaned up in `afterEach`.

## Tasks / Subtasks

- [ ] Populate `config/tool-manifest.json` — processInstance group (AC: 1)
  - [ ] Cover all processInstance operationIds from spec
  - [ ] FR-05 (`startProcessInstance` / `startProcessInstanceByKey`): name `processInstance_start`, `frMapping: ["FR-05"]`
  - [ ] FR-06 (`getProcessInstances`): name `processInstance_list`, `frMapping: ["FR-06"]`
  - [ ] FR-07 (`suspendProcessInstanceById`): name `processInstance_suspend`, `frMapping: ["FR-07"]`
  - [ ] FR-08 (`activateProcessInstanceById`): name `processInstance_resume`, `frMapping: ["FR-08"]`
  - [ ] FR-09 (`deleteProcessInstance`): name `processInstance_delete`, `frMapping: ["FR-09"]`
  - [ ] FR-10 read (`getProcessInstanceVariables`): name `processInstance_getVariables`, `frMapping: ["FR-10"]`
  - [ ] FR-10 write (`modifyProcessInstanceVariables`): name `processInstance_setVariables`, `frMapping: ["FR-10"]`
  - [ ] Run `npm run generate`
- [ ] Implement start instance handler — FR-05 (AC: 2, 3)
  - [ ] Calls `POST /engine/{engineName}/process-definition/key/{key}/start`
  - [ ] Zod input schema: `{ key: string, businessKey?: string, variables?: Record<string, { value: unknown, type?: string }> }`
  - [ ] Response: `{ id, definitionId, definitionKey, businessKey, state }` from Operaton start response
  - [ ] Not-found error: normalize `"NotFoundException"` → structured error with definition key hint
- [ ] Implement delete instance handler — FR-09 (AC: 4)
  - [ ] Calls `DELETE /engine/{engineName}/process-instance/{id}` with optional `deleteReason` query param
  - [ ] Success: HTTP 204 → confirm with message: `"Process instance {id} deleted. Reason: {reason || 'none specified'}"`
  - [ ] Not-found: structured not-found error
- [ ] Create integration test `test/integration/processInstance.test.ts` (AC: 5)
  - [ ] `beforeEach`: deploy a test BPMN with user task (allows instance to stay active)
  - [ ] Test: start with valid key + optional businessKey + variables → response has `id`, `definitionKey`, `state`
  - [ ] Test: start with unknown key → `isError: true`, structured not-found error
  - [ ] Test: delete existing instance with reason → confirm deletion
  - [ ] `afterEach`: delete all started instances + delete deployed definition (order: instances first)
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### Operaton Start Process Endpoint

Two variants:
- `POST /engine/{engineName}/process-definition/{id}/start` — start by definition ID
- `POST /engine/{engineName}/process-definition/key/{key}/start` — start by latest version of key

Use key-based start for the primary tool (FR-05) as it's more natural for operators.

Request body:
```json
{
  "businessKey": "optional-string",
  "variables": {
    "myVar": { "value": "myValue", "type": "String" }
  }
}
```

Response includes: `id`, `definitionId`, `definitionKey`, `businessKey`, `state` (`ACTIVE`/`SUSPENDED`), `startTime`.

### Variable Format

Operaton uses typed variable format: `{ "varName": { "value": ..., "type": "String|Integer|Boolean|..." } }`. The Zod schema should accept both this format and optionally a simpler key-value format for usability — though keep it consistent with how other tools handle variables.

### Integration Test BPMN Fixture

Use a process with a user task so the instance stays active long enough for the test assertions:
```xml
<bpmn:process id="test-instance-process" isExecutable="true">
  <bpmn:startEvent id="start"/>
  <bpmn:userTask id="task" name="Test Task"/>
  <bpmn:endEvent id="end"/>
  <bpmn:sequenceFlow sourceRef="start" targetRef="task"/>
  <bpmn:sequenceFlow sourceRef="task" targetRef="end"/>
</bpmn:process>
```

### Cleanup Order in afterEach

1. Delete all process instances created during the test
2. Delete deployed process definition
This order is critical — Operaton may refuse to delete a definition with active instances unless `cascade=true`.

### Anti-Patterns to Avoid

- ❌ Do NOT assume a process definition is pre-deployed — `beforeEach` must deploy it
- ❌ Do NOT leave started instances after tests — cleanup in `afterEach` is mandatory (NFR-01 integration cleanup rule)
- ❌ Do NOT hardcode variable types — use the typed variable format

### Key File Locations

- `config/tool-manifest.json` — add processInstance group
- `src/generated/processInstance/` — generated (do not edit)
- `test/integration/processInstance.test.ts` — new integration test file

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#Testing Patterns`
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 3.1`
- PRD FR-05, FR-09

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
