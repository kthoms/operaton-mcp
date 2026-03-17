# Story 3.4: Read and Write Process Instance Variables

Status: review

## Story

As an operator using operaton-mcp,
I want to read the current variables of a process instance and update them when needed,
so that I can inspect and correct process state through AI without direct API calls.

## Acceptance Criteria

1. **Given** a read-variables call is made for an existing process instance (FR-10 read) **When** the tool call completes **Then** the response lists all variables with name, type, and value for each.

2. **Given** a write-variables call is made with a valid variable map for an existing instance (FR-10 write) **When** the tool call completes **Then** the response confirms the variables were set.

3. **Given** a write-variables call targets an instance that does not exist **When** the tool call completes **Then** `isError: true` is returned with a structured not-found error.

4. **Given** the integration tests for FR-10 run **When** `npm run test:integration` executes **Then** all tests pass; any variable changes are cleaned up in `afterEach`.

## Tasks / Subtasks

- [ ] Verify `processInstance_getVariables` manifest entry and generated handler (AC: 1)
  - [ ] Calls `GET /engine/{engineName}/process-instance/{id}/variables`
  - [ ] Zod input: `{ id: string, deserializeValues?: boolean }`
  - [ ] Response: `Record<string, { value: unknown, type: string, valueInfo: object }>` — name → variable descriptor map
  - [ ] Return full JSON — each variable includes `name` (key), `type`, `value`
- [ ] Verify `processInstance_setVariables` manifest entry and generated handler (AC: 2, 3)
  - [ ] Calls `POST /engine/{engineName}/process-instance/{id}/variables` with modifications body
  - [ ] Zod input: `{ id: string, modifications: Record<string, { value: unknown, type?: string }>, deletions?: string[] }`
  - [ ] Success: HTTP 204 → confirmation message `"Variables updated on process instance {id}."`
  - [ ] Not-found: normalize to structured error
- [ ] Extend integration test `test/integration/processInstance.test.ts` (AC: 4)
  - [ ] `beforeEach`: deploy BPMN + start instance with initial variables
  - [ ] Test: get variables → response includes each variable with `type` and `value`
  - [ ] Test: set new variable → confirm; then get variables → new variable present
  - [ ] Test: update existing variable → confirm; verify new value
  - [ ] Test: set on non-existent instance ID → `isError: true`, not-found error
  - [ ] `afterEach`: delete created instances + definition

## Dev Notes

### Operaton Variables API

**Read:** `GET /engine/{engineName}/process-instance/{id}/variables`
Response format:
```json
{
  "varName": { "value": "someValue", "type": "String", "valueInfo": {} },
  "numVar": { "value": 42, "type": "Integer", "valueInfo": {} }
}
```

**Write (set/update):** `POST /engine/{engineName}/process-instance/{id}/variables`
Request body uses modifications + deletions:
```json
{
  "modifications": {
    "newVar": { "value": "hello", "type": "String" }
  },
  "deletions": ["oldVar"]
}
```

**Write (single variable):** `PUT /engine/{engineName}/process-instance/{id}/variables/{varName}` — alternative for individual variable updates. Consider exposing as a separate tool or combining.

### Typed Variable Format

Operaton requires explicit `type` field for writes. Common types: `String`, `Integer`, `Long`, `Double`, `Boolean`, `Date`, `Json`. If `type` is omitted, Operaton may infer it — but explicit is safer. The Zod schema should make `type` optional and document the default inference behavior.

### Anti-Patterns to Avoid

- ❌ Do NOT strip `type` and `valueInfo` from get-variables response — operators need full context
- ❌ Do NOT assume variables exist before get-variables call — start instance with known initial vars in `beforeEach`
- ❌ Write-state tests must clean up: delete created instances in `afterEach`

### Key File Locations

- `config/tool-manifest.json` — processInstance group (from Story 3.1)
- `src/generated/processInstance/` — generated (do not edit)
- `test/integration/processInstance.test.ts` — extend

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 3.4`
- PRD FR-10

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
