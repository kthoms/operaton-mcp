# Story 3.3: Suspend and Resume Process Instances

Status: ready-for-dev

## Story

As an operator using operaton-mcp,
I want to suspend active instances to pause processing and resume suspended instances to continue them,
so that I can contain production issues and recover instances through AI conversation without manual API calls.

## Acceptance Criteria

1. **Given** a suspend call is made for an active instance (FR-07) **When** the tool call completes **Then** the response confirms the instance is now suspended.

2. **Given** a suspend call is made for an instance that is already suspended or in a non-suspendable state **When** the tool call completes **Then** `isError: true` is returned with a structured error describing the state conflict.

3. **Given** a resume call is made for a suspended instance (FR-08) **When** the tool call completes **Then** the response confirms the instance is now active.

4. **Given** a resume call is made for an instance that is not suspended **When** the tool call completes **Then** `isError: true` is returned with a structured error.

5. **Given** the integration tests for FR-07 and FR-08 run **When** `npm run test:integration` executes **Then** all tests pass; `afterEach` resumes any suspended instances and deletes any instances created during the test — no suspended or orphaned instances remain after the suite.

## Tasks / Subtasks

- [ ] Verify `processInstance_suspend` and `processInstance_resume` manifest entries (AC: 1, 3)
  - [ ] Suspend: calls `PUT /engine/{engineName}/process-instance/{id}/suspended` with body `{ "suspended": true }`
  - [ ] Resume: calls `PUT /engine/{engineName}/process-instance/{id}/suspended` with body `{ "suspended": false }`
  - [ ] Zod input schema: `{ id: string }` for both
  - [ ] Success response: HTTP 204 → confirmation message `"Process instance {id} suspended/resumed successfully."`
  - [ ] Run `npm run generate` to verify generated handlers
- [ ] Verify error handling for state conflicts (AC: 2, 4)
  - [ ] Add to `src/http/errors.ts` if needed: suspension state conflict error type
  - [ ] Operaton may return `"ProcessEngineException"` or similar for state conflicts
  - [ ] Ensure `normalize()` maps to structured error with hint: "Verify instance state before suspending/resuming."
- [ ] Extend integration test `test/integration/processInstance.test.ts` (AC: 5)
  - [ ] `beforeEach`: deploy BPMN + start a test instance
  - [ ] Test: suspend active instance → confirm suspended
  - [ ] Test: suspend already-suspended instance → `isError: true`, structured error
  - [ ] Test: resume suspended instance → confirm active
  - [ ] Test: resume active instance (not suspended) → `isError: true`, structured error
  - [ ] `afterEach`: CRITICAL — resume any suspended instances, THEN delete all instances, THEN delete definition
  - [ ] Cleanup order must be: resume → delete instances → delete definition (suspended instances can be deleted but ensure no hanging state)

## Dev Notes

### Operaton Suspend/Resume Endpoint

Single endpoint for both operations:
`PUT /engine/{engineName}/process-instance/{id}/suspended`

Body:
```json
{ "suspended": true }   // to suspend
{ "suspended": false }  // to resume
```

Returns HTTP 204 on success. Returns error if:
- Instance already in the requested state
- Instance not found
- Instance is in a terminal state (completed, deleted)

### Critical afterEach Cleanup Pattern

```typescript
afterEach(async () => {
  // 1. Resume any suspended instances (defensive — may not be suspended)
  for (const instanceId of createdInstanceIds) {
    try {
      await client.put(`/engine/default/process-instance/${instanceId}/suspended`, { suspended: false });
    } catch { /* ignore — instance may already be active or deleted */ }
  }
  // 2. Delete all created instances
  for (const instanceId of createdInstanceIds) {
    try {
      await client.delete(`/engine/default/process-instance/${instanceId}`);
    } catch { /* ignore — may already be cleaned up */ }
  }
  // 3. Delete deployed definition
  await client.delete(`/engine/default/process-definition/${deploymentId}?cascade=true`);
});
```

This "resume before delete" pattern prevents cascading failures in subsequent test runs.

### Error Types for State Conflicts

Operaton uses `"ProcessEngineException"` for most engine-level conflicts. The error message will indicate the issue. Ensure `normalize()` extracts and surfaces the message clearly.

### Anti-Patterns to Avoid

- ❌ Do NOT leave suspended instances after tests — they pollute the engine state and cause cascading test failures
- ❌ Do NOT delete a suspended instance without resuming first (unless Operaton supports it — verify against spec)
- ❌ Do NOT assume the resume endpoint is separate from suspend — it's the same PUT endpoint with different body

### Key File Locations

- `config/tool-manifest.json` — processInstance group (from Story 3.1)
- `src/generated/processInstance/` — generated (do not edit)
- `src/http/errors.ts` — add state conflict error types if missing
- `test/integration/processInstance.test.ts` — extend with suspend/resume tests

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 3.3`
- PRD FR-07, FR-08
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Testing Patterns` (write-state cleanup rule)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
