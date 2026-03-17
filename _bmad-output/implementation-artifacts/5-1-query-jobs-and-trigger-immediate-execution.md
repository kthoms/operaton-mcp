# Story 5.1: Query Jobs and Trigger Immediate Execution

Status: review

## Story

As an operator using operaton-mcp,
I want to query jobs with filters and trigger immediate execution of a specific job,
so that I can inspect job state and manually force execution of stuck or scheduled jobs through AI.

## Acceptance Criteria

1. **Given** the job, jobDefinition, and incident manifest groups are populated with real BPM-domain descriptions and `frMapping` for FR-17 to FR-23, and `npm run generate` is run **When** `tools/list` is called **Then** job and incident tools appear in the list with descriptions ≤ 200 chars using BPM-domain terminology appropriate for an operator audience; `frMapping` covers FR-17 through FR-23.

2. **Given** a query-jobs call is made with no filters (FR-17) **When** the tool call completes **Then** all jobs are returned; each result includes job ID, type, retries, due date, and exception message if present.

3. **Given** a query-jobs call is filtered by process instance ID, exception presence, and retries remaining **When** the tool call completes **Then** only jobs matching all supplied filters are returned.

4. **Given** a trigger-execution call is made for a valid job ID (FR-18) **When** the tool call completes **Then** the response confirms execution triggered, or returns the exception message if the job fails during execution.

5. **Given** the integration tests for FR-17 and FR-18 run **When** `npm run test:integration` executes **Then** all tests pass; any triggered jobs are cleaned up in `afterEach`.

## Tasks / Subtasks

- [ ] Populate `config/tool-manifest.json` — job, jobDefinition, incident groups (AC: 1)
  - [ ] **job group:**
    - FR-17 (`getJobs`): name `job_list`, `frMapping: ["FR-17"]`
    - FR-18 (`executeJob`): name `job_triggerExecution`, `frMapping: ["FR-18"]`
    - FR-19 suspend by ID (`suspendJobById`): name `job_suspend`, `frMapping: ["FR-19"]`
    - FR-20 resume by ID (`activateJobById`): name `job_resume`, `frMapping: ["FR-20"]`
    - FR-21 set retries (`setJobRetries`): name `job_setRetries`, `frMapping: ["FR-21"]`
  - [ ] **jobDefinition group:**
    - FR-19 suspend by definition (`suspendJobByJobDefinitionId`): name `jobDefinition_suspendAll`, `frMapping: ["FR-19"]`
    - FR-20 resume by definition (`activateJobByJobDefinitionId`): name `jobDefinition_resumeAll`, `frMapping: ["FR-20"]`
  - [ ] **incident group:** (populated in Story 5.3 — reserve spots here)
  - [ ] All descriptions ≤ 200 chars; operator incident-response language
  - [ ] Run `npm run generate`
- [ ] Verify `job_list` generated handler (AC: 2, 3)
  - [ ] Calls `GET /engine/{engineName}/job` with query params
  - [ ] Zod input schema: `{ processInstanceId?: string, withException?: boolean, noRetriesLeft?: boolean, jobId?: string, jobDefinitionId?: string, dueBefore?: string, dueAfter?: string }`
  - [ ] Response: array of `{ id, type, retries, dueDate, exceptionMessage }` per job
- [ ] Verify `job_triggerExecution` generated handler (AC: 4)
  - [ ] Calls `POST /engine/{engineName}/job/{id}/execute`
  - [ ] Zod input: `{ id: string }`
  - [ ] Success: HTTP 204 → confirm `"Job {id} execution triggered successfully."`
  - [ ] If job fails during execution: Operaton returns exception — normalize to `isError: true` with exception message preserved
- [ ] Create integration test `test/integration/job.test.ts` (AC: 5)
  - [ ] `beforeEach`: deploy BPMN with a timer job + start instance (or use an async service task)
  - [ ] Test: list jobs → find the job for the started instance; verify `id`, `retries`, `dueDate` fields
  - [ ] Test: list filtered by `processInstanceId` → only jobs for that instance
  - [ ] Test: trigger execution on a valid job → confirm
  - [ ] `afterEach`: delete process instances + definition
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### Operaton Jobs API

**List:** `GET /engine/{engineName}/job` — returns all jobs matching filters.
**Execute:** `POST /engine/{engineName}/job/{id}/execute` — triggers immediate execution. Returns 204 on success; returns exception body if job throws.

Jobs in Operaton are created automatically for:
- Timer boundary events / intermediate catch events
- Async service tasks (`camunda:asyncBefore="true"`)
- Message correlation

For integration tests, use an async service task or timer start event to ensure a job exists.

### BPMN with Async Job for Testing

```xml
<bpmn:serviceTask id="asyncTask" camunda:asyncBefore="true"
                  camunda:class="org.operaton.bpm.engine.test.delegates.SignalThrowingDelegate">
```
Or simpler: use a BPMN with a timer start event that won't fire automatically.

### Required Response Fields (FR-17)

Per FR-17: `job ID`, `type`, `retries`, `due date`, `exception message if present`. All are top-level fields in Operaton's job response.

### Anti-Patterns to Avoid

- ❌ Do NOT assume jobs exist without starting an instance with a job-creating construct
- ❌ Trigger execution may fail if the job's service task has side effects — use a safe test delegate

### Key File Locations

- `config/tool-manifest.json` — add job, jobDefinition groups
- `src/generated/job/` — generated (do not edit)
- `src/generated/jobDefinition/` — generated (do not edit)
- `test/integration/job.test.ts` — new integration test file

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 5.1`
- PRD FR-17, FR-18

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
