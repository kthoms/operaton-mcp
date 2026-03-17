# Story 5.2: Suspend, Resume, and Retry Jobs

Status: review

## Story

As an operator using operaton-mcp,
I want to suspend jobs to prevent further execution, resume them when ready, and adjust retry counts on failed jobs,
so that I can contain and recover from job failures through AI conversation during production incidents.

## Acceptance Criteria

1. **Given** a suspend call is made for a job by job ID (FR-19) **When** the tool call completes **Then** the response confirms the job is suspended.

2. **Given** a suspend call is made targeting all jobs for a job definition by job definition ID (FR-19) **When** the tool call completes **Then** the response confirms all matching jobs are suspended.

3. **Given** a resume call is made for a suspended job by job ID (FR-20) **When** the tool call completes **Then** the response confirms the job is resumed.

4. **Given** a set-retries call is made for a job ID with a specific retry count (FR-21) **When** the tool call completes **Then** the response confirms the retry count is updated.

5. **Given** a set-retries call targets a non-existent job ID **When** the tool call completes **Then** `isError: true` is returned with a structured not-found error.

6. **Given** the integration tests for FR-19, FR-20, and FR-21 run **When** `npm run test:integration` executes **Then** all tests pass; `afterEach` resumes any suspended jobs, restores original retry counts, and deletes any job definitions created during the test — no suspended or modified jobs remain after the suite.

## Tasks / Subtasks

- [ ] Verify `job_suspend`, `job_resume`, `job_setRetries` manifest entries (AC: 1, 3, 4)
  - [ ] `job_suspend`: `PUT /engine/{engineName}/job/{id}/suspended` body `{ "suspended": true }`; Zod: `{ id: string }`
  - [ ] `job_resume`: `PUT /engine/{engineName}/job/{id}/suspended` body `{ "suspended": false }`; Zod: `{ id: string }`
  - [ ] `job_setRetries`: `PUT /engine/{engineName}/job/{id}/retries` body `{ "retries": number }`; Zod: `{ id: string, retries: number }`
  - [ ] All return 204 → confirmation messages
  - [ ] Run `npm run generate`
- [ ] Verify `jobDefinition_suspendAll` and `jobDefinition_resumeAll` manifest entries (AC: 2)
  - [ ] `jobDefinition_suspendAll`: `PUT /engine/{engineName}/job-definition/{id}/suspended` body `{ "suspended": true, "includeJobs": true }`; Zod: `{ id: string, includeJobs?: boolean }`
  - [ ] `jobDefinition_resumeAll`: same endpoint with `"suspended": false`
- [ ] Verify error handling for not-found on set-retries (AC: 5)
  - [ ] `normalize()` maps `"NotFoundException"` → structured not-found error
- [ ] Extend integration test `test/integration/job.test.ts` (AC: 6)
  - [ ] `beforeEach`: deploy BPMN with async job + start instance; get job ID
  - [ ] Test: suspend job by ID → confirm; verify job is suspended (list with `suspended=true`)
  - [ ] Test: resume suspended job by ID → confirm
  - [ ] Test: set retries to 3 → confirm; verify retries field updated
  - [ ] Test: set retries on non-existent job ID → `isError: true`
  - [ ] Test: suspend all jobs for a job definition → confirm
  - [ ] `afterEach` CRITICAL:
    1. Resume any suspended jobs (try/catch all)
    2. Restore original retry counts if changed
    3. Delete created process instances
    4. Delete deployed definition
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### Operaton Job Suspend/Resume

Same endpoint for suspend and resume:
- `PUT /engine/{engineName}/job/{id}/suspended` body `{ "suspended": true/false }`

Job definition bulk suspend/resume:
- `PUT /engine/{engineName}/job-definition/{id}/suspended` body `{ "suspended": true/false, "includeJobs": true }`

### Retry Count Reset

`PUT /engine/{engineName}/job/{id}/retries` body `{ "retries": N }`

Common use case: job failed (retries = 0), operator investigates, fixes the cause, resets retries to 3. This re-queues the job for execution.

### Critical afterEach Cleanup

```typescript
afterEach(async () => {
  // 1. Resume any suspended jobs
  for (const jobId of suspendedJobIds) {
    try { await client.put(`/engine/default/job/${jobId}/suspended`, { suspended: false }); } catch {}
  }
  // 2. Restore retry counts if modified
  for (const { jobId, originalRetries } of modifiedRetries) {
    try { await client.put(`/engine/default/job/${jobId}/retries`, { retries: originalRetries }); } catch {}
  }
  // 3. Delete instances and definition
  for (const instanceId of createdInstanceIds) {
    try { await client.delete(`/engine/default/process-instance/${instanceId}`); } catch {}
  }
  try { await client.delete(`/engine/default/process-definition/${definitionId}?cascade=true`); } catch {}
});
```

### Anti-Patterns to Avoid

- ❌ Do NOT leave jobs in suspended state after tests — pollutes engine state for subsequent tests
- ❌ Do NOT forget to record original retry counts before modifying them

### Key File Locations

- `config/tool-manifest.json` — job, jobDefinition groups (from Story 5.1)
- `src/generated/job/`, `src/generated/jobDefinition/` — generated (do not edit)
- `test/integration/job.test.ts` — extend

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 5.2`
- PRD FR-19, FR-20, FR-21
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Testing Patterns`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
