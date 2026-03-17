# Story 4.2: Claim, Unclaim, and Delegate Tasks

Status: review

## Story

As an operator using operaton-mcp,
I want to claim tasks for a specific user, release claimed tasks, and delegate tasks to other users,
so that I can manage task assignment through AI in operational scenarios without the Tasklist UI.

## Acceptance Criteria

1. **Given** a claim call is made with a valid task ID and assignee (FR-12) **When** the tool call completes **Then** the response confirms the task is claimed by the specified assignee.

2. **Given** a claim call is made for a task that is already claimed by another user **When** the tool call completes **Then** `isError: true` is returned with a structured error identifying the conflict.

3. **Given** an unclaim call is made for a claimed task (FR-13) **When** the tool call completes **Then** the response confirms the task is unclaimed.

4. **Given** a delegate call is made to transfer a task to another user (FR-15) **When** the tool call completes **Then** the response confirms the delegation.

5. **Given** a delegate call references a non-existent task ID **When** the tool call completes **Then** `isError: true` is returned with a structured not-found error.

6. **Given** the integration tests for FR-12, FR-13, and FR-15 run **When** `npm run test:integration` executes **Then** all tests pass; task state is cleaned up in `afterEach`.

## Tasks / Subtasks

- [ ] Verify `task_claim`, `task_unclaim`, `task_delegate` manifest entries (AC: 1, 3, 4)
  - [ ] `task_claim`: calls `POST /engine/{engineName}/task/{id}/claim` with body `{ "userId": "..." }`; Zod: `{ id: string, userId: string }`
  - [ ] `task_unclaim`: calls `POST /engine/{engineName}/task/{id}/unclaim`; Zod: `{ id: string }`
  - [ ] `task_delegate`: calls `POST /engine/{engineName}/task/{id}/delegate` with body `{ "userId": "..." }`; Zod: `{ id: string, userId: string }`
  - [ ] All return HTTP 204 on success → confirmation message `"Task {id} claimed/unclaimed/delegated to {userId}."`
  - [ ] Run `npm run generate`
- [ ] Verify error handling (AC: 2, 5)
  - [ ] Claim conflict: Operaton returns `"TaskAlreadyClaimedException"` or similar → map in `src/http/errors.ts`
    - Hint: "Unclaim the task first using task_unclaim before reassigning."
  - [ ] Not-found: `"NotFoundException"` → structured not-found error
- [ ] Extend integration test `test/integration/task.test.ts` (AC: 6)
  - [ ] `beforeEach`: deploy BPMN with user task + start instance → get task ID
  - [ ] Test: claim task for user A → confirm claimed
  - [ ] Test: claim already-claimed task for user B → `isError: true`, conflict error
  - [ ] Test: unclaim claimed task → confirm unclaimed
  - [ ] Test: delegate task to user B → confirm delegation
  - [ ] Test: delegate non-existent task ID → `isError: true`, not-found error
  - [ ] `afterEach`: delete process instances + definition (task cleanup happens automatically)
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### Operaton Task Claim/Unclaim/Delegate Endpoints

All are `POST` with empty or minimal body:
- `POST /engine/{engineName}/task/{id}/claim` — body: `{ "userId": "string" }`
- `POST /engine/{engineName}/task/{id}/unclaim` — no body
- `POST /engine/{engineName}/task/{id}/delegate` — body: `{ "userId": "string" }`

Returns HTTP 204 on success, error body on failure.

### Error Type for Claim Conflict

Operaton uses `"TaskAlreadyClaimedException"` when a task is already claimed. Add this to `src/http/errors.ts`:
```typescript
"TaskAlreadyClaimedException": { hint: "Unclaim the task first with task_unclaim, then claim it for the new user." }
```

### Delegation vs Assignment

`delegate` sets the assignee and records the delegation (owner stays the same). `assign` (FR-15 alternative) just sets the assignee. Operaton has both endpoints — verify which one implements the FR-15 intent (transfer to another user). Delegation is the more formal workflow action.

### Anti-Patterns to Avoid

- ❌ Do NOT test with hardcoded user IDs — use configurable test user IDs or the Operaton built-in `demo` user if available
- ❌ `afterEach` must delete instances (not just tasks) — task deletion via instance deletion is cleaner

### Key File Locations

- `config/tool-manifest.json` — task group (from Story 4.1)
- `src/generated/task/` — generated (do not edit)
- `src/http/errors.ts` — add claim conflict error type
- `test/integration/task.test.ts` — extend

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 4.2`
- PRD FR-12, FR-13, FR-15

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
