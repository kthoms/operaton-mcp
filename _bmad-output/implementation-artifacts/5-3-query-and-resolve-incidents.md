# Story 5.3: Query and Resolve Incidents

Status: review

## Story

As an operator using operaton-mcp,
I want to query incidents with filters and resolve specific incidents by ID,
so that I can identify and clear blocking incidents through AI without navigating Cockpit's incident management screens.

## Acceptance Criteria

1. **Given** a query-incidents call is made with no filters (FR-22) **When** the tool call completes **Then** all incidents are returned; each result includes incident ID, type, message, activity ID, and affected process instance ID.

2. **Given** a query-incidents call is filtered by process instance ID, incident type, and activity ID **When** the tool call completes **Then** only incidents matching all supplied filters are returned.

3. **Given** a resolve call is made for a valid incident ID (FR-23) **When** the tool call completes **Then** the response confirms the incident is resolved.

4. **Given** a resolve call is made for an incident that cannot be resolved in its current state **When** the tool call completes **Then** `isError: true` is returned with a structured error describing the constraint.

5. **Given** the integration tests for FR-22 and FR-23 run **When** `npm run test:integration` executes **Then** all tests pass; created incidents are cleaned up in `afterEach`.

## Tasks / Subtasks

- [ ] Populate `config/tool-manifest.json` — incident group (AC: 1)
  - [ ] FR-22 (`getIncidents`): name `incident_list`, `frMapping: ["FR-22"]`
  - [ ] FR-23 (`resolveIncident`): name `incident_resolve`, `frMapping: ["FR-23"]`
  - [ ] Non-FR incident ops: `frMapping: []`
  - [ ] Run `npm run generate`
- [ ] Verify `incident_list` generated handler (AC: 1, 2)
  - [ ] Calls `GET /engine/{engineName}/incident` with query params
  - [ ] Zod input: `{ processInstanceId?: string, incidentType?: string, activityId?: string, rootCauseIncidentId?: string, incidentId?: string }`
  - [ ] Response: array of `{ id, incidentType, incidentMessage, activityId, processInstanceId }` per incident
- [ ] Verify `incident_resolve` generated handler (AC: 3, 4)
  - [ ] Calls `DELETE /engine/{engineName}/incident/{id}`
  - [ ] Success: HTTP 204 → confirm `"Incident {id} resolved successfully."`
  - [ ] Cannot resolve: Operaton returns error → `normalize()` with hint about incident state
- [ ] Create integration test `test/integration/incident.test.ts` (AC: 5)
  - [ ] Incidents are created by failed jobs (job throws exception, retries exhausted = 0)
  - [ ] `beforeEach`: deploy BPMN with a service task that throws → start instance → set job retries to 0 → execute job → verify incident created
  - [ ] Test: list incidents with no filters → find the test incident; verify `id`, `incidentType`, `activityId`, `processInstanceId`
  - [ ] Test: list filtered by `processInstanceId` → only incidents for that instance
  - [ ] Test: resolve incident → confirm resolved
  - [ ] `afterEach`: delete process instances + definition (incidents are deleted with instances)
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### Incident Creation for Testing

Incidents in Operaton are created when:
1. A job fails and its retries reach 0
2. An external task times out (lock expiry)

For integration tests, use option 1: a service task with a delegate that throws an exception.

BPMN with failing service task:
```xml
<bpmn:serviceTask id="failingTask"
                  camunda:class="org.operaton.bpm.engine.test.delegates.FailingDelegate">
```
Process: start → run failingTask → job created (async) → trigger job → fails → retries countdown → retries=0 → incident created.

Alternatively: deploy a simple timer + service task BPMN, start instance, set job retries to 0, trigger execution → incident.

### Operaton Incidents API

**List:** `GET /engine/{engineName}/incident` with filters
**Resolve:** `DELETE /engine/{engineName}/incident/{id}` — marks incident as resolved

Note: resolving an incident does NOT automatically re-execute the failed job. It only clears the incident flag. The operator typically needs to fix the root cause and set job retries > 0.

### Required Response Fields (FR-22)

Per FR-22: `incident ID`, `type`, `message`, `activity ID`, `affected process instance ID`. All are top-level fields in Operaton's incident response:
- `id`, `incidentType`, `incidentMessage`, `activityId`, `processInstanceId`

### Error Map Entry

Add if not present:
- Incident not found or already resolved → `"NotFoundException"` → standard not-found hint

### Anti-Patterns to Avoid

- ❌ Do NOT assume incidents exist without deliberately creating them
- ❌ Do NOT resolve an incident and assume the job will retry — they are decoupled
- ❌ `afterEach` must delete instances (incidents are cleaned up automatically with the instance)

### Key File Locations

- `config/tool-manifest.json` — incident group
- `src/generated/incident/` — generated (do not edit)
- `test/integration/incident.test.ts` — new integration test file

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 5.3`
- PRD FR-22, FR-23

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
