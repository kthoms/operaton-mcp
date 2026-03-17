# Story 2.3: Delete Process Definitions

Status: ready-for-dev

## Story

As an operator using operaton-mcp,
I want to delete a process definition by ID and receive explicit confirmation or a clear error if deletion is blocked,
so that I can clean up unused definitions safely through AI without silent partial operations.

## Acceptance Criteria

1. **Given** a delete call is made for a process definition with no active instances (FR-04) **When** the tool call completes **Then** the response confirms successful deletion.

2. **Given** a delete call is made for a process definition with active instances **When** the tool call completes **Then** `isError: true` is returned with an error message identifying that active instances exist and suggesting resolution steps.

3. **Given** a delete call is made for a non-existent definition ID **When** the tool call completes **Then** `isError: true` is returned with a structured not-found error.

4. **Given** the integration test for FR-04 runs **When** `npm run test:integration` executes **Then** the test passes; any created artifacts are cleaned up in `afterEach`.

## Tasks / Subtasks

- [ ] Verify `processDefinition_delete` manifest entry (AC: 1)
  - [ ] `frMapping: ["FR-04"]`
  - [ ] Zod input schema: `{ id: string, cascade?: boolean, skipCustomListeners?: boolean, skipIoMappings?: boolean }`
  - [ ] BPM-domain description mentioning "active instances" risk
  - [ ] Run `npm run generate` to regenerate if manifest changed
- [ ] Verify delete handler behavior (AC: 1, 2, 3)
  - [ ] Calls `DELETE /engine/{engineName}/process-definition/{id}`
  - [ ] Success: 204 no content → return `{ content: [{ type: "text", text: "Process definition {id} deleted successfully." }] }`
  - [ ] Active instances error: Operaton returns error type like `"ProcessDefinitionNotFoundException"` or custom deletion error → `normalize()` maps to structured error with hint "Suspend or delete all active process instances for this definition before deleting."
  - [ ] Not found: `"NotFoundException"` → structured not-found error
- [ ] Extend integration test `test/integration/processDefinition.test.ts` (AC: 4)
  - [ ] `beforeEach`: deploy a test BPMN definition (clean fixture)
  - [ ] Test: delete with no active instances → confirm success
  - [ ] Test: delete non-existent ID → `isError: true`, not-found error
  - [ ] Test (optional): deploy + start instance + attempt delete → `isError: true` with active-instances error
  - [ ] `afterEach`: attempt cleanup of any remaining artifacts (defensive — main test already deletes)
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### Operaton Delete Endpoint

`DELETE /engine/{engineName}/process-definition/{id}` with optional query params:
- `cascade=true` — also deletes process instances (use with caution)
- `skipCustomListeners=true` — skip custom deletion listeners
- `skipIoMappings=true` — skip I/O mapping

Default behavior (no `cascade`) will fail if active instances exist — this is the expected behavior for AC2.

### Error Map Entry

Add to `src/http/errors.ts` if not already present:
- `"DeletionFailedException"` or equivalent → hint: "Suspend or delete all active process instances for this definition first. Use processInstance_delete or processInstance_suspend."

### NFR-01 Compliance

Per NFR-01 (zero silent failures): the delete operation MUST return either explicit success confirmation OR a structured error. The current `normalize()` infrastructure handles the error path. For the success path (HTTP 204), the generated handler should construct a confirmation message.

### Anti-Patterns to Avoid

- ❌ Do NOT return an empty response on 204 success — always return human-readable confirmation
- ❌ Do NOT silently swallow deletion errors
- ❌ Integration tests must NOT leave orphaned definitions — `afterEach` cleanup is mandatory

### Key File Locations

- `config/tool-manifest.json` — processDefinition group (already exists from Story 2.1)
- `src/generated/processDefinition/` — generated (do not edit)
- `src/http/errors.ts` — add deletion error type if missing
- `test/integration/processDefinition.test.ts` — extend with delete tests

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#Format Patterns` (success/error response shapes)
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 2.3`
- PRD FR-04, NFR-01

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
