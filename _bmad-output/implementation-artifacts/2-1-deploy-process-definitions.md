# Story 2.1: Deploy Process Definitions

Status: ready-for-dev

## Story

As an engineer or operator using operaton-mcp,
I want to deploy a BPMN artifact to Operaton via AI,
so that I can publish new or updated process definitions without leaving my AI client or consulting the API docs.

## Acceptance Criteria

1. **Given** the processDefinition manifest group is populated with real BPM-domain descriptions and `frMapping` entries for FR-01 to FR-04, and `npm run generate` is run **When** `tools/list` is called **Then** processDefinition tools appear in the list; all have descriptions ≤ 200 characters using BPM-domain terminology appropriate for an operator audience (not generic REST descriptions); `frMapping` covers FR-01 through FR-04.

2. **Given** a valid BPMN file is submitted via the deploy tool (FR-01) **When** the tool call completes **Then** the response contains the deployment ID and process definition key.

3. **Given** an invalid BPMN artifact is submitted **When** the tool call completes **Then** `isError: true` is returned with a structured error containing the error type, cause, and a suggested corrective action.

4. **Given** the integration test for FR-01 runs against a live Operaton instance **When** `npm run test:integration` executes **Then** the test passes; any deployed artifacts are cleaned up in `afterEach`.

## Tasks / Subtasks

- [ ] Populate `config/tool-manifest.json` — processDefinition group (AC: 1)
  - [ ] Add entries for ALL processDefinition operationIds from `resources/operaton-rest-api.json`
  - [ ] FR-01 (`deployProcessDefinition`): name `processDefinition_deploy`, BPM-domain description, `frMapping: ["FR-01"]`
  - [ ] FR-02 (`getProcessDefinitions`): name `processDefinition_list`, BPM-domain description, `frMapping: ["FR-02"]`
  - [ ] FR-03 (`getProcessDefinitionById`, `getProcessDefinitionByKey`): names `processDefinition_getById` / `processDefinition_getByKey`, `frMapping: ["FR-03"]`
  - [ ] FR-04 (`deleteProcessDefinition`): name `processDefinition_delete`, `frMapping: ["FR-04"]`
  - [ ] Non-FR processDefinition ops: `frMapping: []`, expose per BPM-domain value
  - [ ] All descriptions ≤ 200 chars; use operator-level BPM language (not HTTP verbs)
  - [ ] Run `npm run generate` — verify `src/generated/processDefinition/` emitted with all operations
- [ ] Implement deploy tool for FR-01 (AC: 2, 3)
  - [ ] Generated handler calls `client.post('/engine/{engineName}/deployment/create', formData)`
  - [ ] Accepts: deployment name, BPMN/DMN file content (base64 or raw), optional tenant ID
  - [ ] Success response: `{ deploymentId, processDefinitionKey }` from Operaton response
  - [ ] Error handling: invalid BPMN → `normalize()` → `isError: true` with cause + corrective action
  - [ ] Zod input schema validates required fields before HTTP call
- [ ] Write integration test `test/integration/processDefinition.test.ts` (AC: 4)
  - [ ] Test: deploy valid BPMN → response contains deployment ID and definition key
  - [ ] `beforeEach`: set up test context (no pre-assumed state)
  - [ ] `afterEach`: delete deployed definition by ID — no orphaned definitions remain
  - [ ] Skip test suite if `OPERATON_BASE_URL` is unset (Vitest `skipIf`)
  - [ ] Use a minimal valid test BPMN fixture (simple process with one start event + end event)

## Dev Notes

### Prerequisite: Epic 1 Complete

This story depends on:
- Story 1.4: generation pipeline operational
- Story 1.3: `createOperatonClient` and `normalize()` available
- Story 1.2: `loadConfig()` available

### Manifest Population Strategy

This is the FIRST story to populate `config/tool-manifest.json` with real content. The processDefinition group in the Operaton REST API has ~46 operations. Not all need to be `expose: true` — focus on operations that map to FRs and those with clear operator value. Use `expose: false` with a `reason` field for operations that are redundant or internal.

### Operaton Deployment API

The deploy endpoint is a multipart form upload:
- `POST /engine/{engineName}/deployment/create`
- Part `deployment-name`: string
- Part `deployment-source`: string (optional)
- Part `{filename}.bpmn` or `{filename}.dmn`: file content
- Response: `{ id, name, deploymentTime, deployedProcessDefinitions: { [key]: { id, key, ... } } }`

The `OperatonClient` from Story 1.3 may need a `postMultipart` method for file uploads. The generated handler should use this.

### Error Types to Map (processDefinition group)

- `ParseException` → hint about BPMN/DMN syntax errors
- `DeploymentResourceNotFoundException` → hint about resource name in deployment
- `ProcessDefinitionNotFoundException` → hint about checking ID/key
- `DeletionFailedException` → hint about suspending/deleting active instances first

### Integration Test BPMN Fixture

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  targetNamespace="http://test">
  <bpmn:process id="test-process" name="Test Process" isExecutable="true">
    <bpmn:startEvent id="start"/>
    <bpmn:endEvent id="end"/>
    <bpmn:sequenceFlow sourceRef="start" targetRef="end"/>
  </bpmn:process>
</bpmn:definitions>
```

### Anti-Patterns to Avoid

- ❌ Do NOT manually edit `src/generated/processDefinition/` — modify manifest and regenerate
- ❌ Do NOT use raw `fetch()` in the handler — route through `createOperatonClient`
- ❌ Do NOT hardcode the engine name — use path template `{engineName}`
- ❌ Do NOT assume pre-existing deployed definitions in integration tests

### Key File Locations

- `config/tool-manifest.json` — add processDefinition group entries
- `src/generated/processDefinition/` — emitted by `npm run generate` (do not edit)
- `test/integration/processDefinition.test.ts` — integration tests with cleanup

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#Code Generation Pipeline`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Testing Patterns` (integration test pattern)
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 2.1`
- PRD FR-01: Deploy BPMN/DMN artifact

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
