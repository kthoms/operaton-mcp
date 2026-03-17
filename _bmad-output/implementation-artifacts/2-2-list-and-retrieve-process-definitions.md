# Story 2.2: List and Retrieve Process Definitions

Status: ready-for-dev

## Story

As an operator using operaton-mcp,
I want to list deployed process definitions with optional filters and retrieve the full BPMN XML of any definition,
so that I can audit what is deployed and inspect process logic without navigating Cockpit.

## Acceptance Criteria

1. **Given** a list query is made with no filters (FR-02) **When** the tool call completes **Then** all deployed definitions are returned; each result includes definition ID, key, name, version, and deployment ID.

2. **Given** a list query is made filtered by key and version **When** the tool call completes **Then** only matching definitions are returned.

3. **Given** a get-by-ID or get-by-key call is made for an existing definition (FR-03) **When** the tool call completes **Then** the response includes definition metadata and the BPMN/DMN XML.

4. **Given** a get call is made for a non-existent definition ID **When** the tool call completes **Then** `isError: true` is returned with a structured not-found error.

5. **Given** the integration tests for FR-02 and FR-03 run **When** `npm run test:integration` executes **Then** all tests pass.

## Tasks / Subtasks

- [ ] Verify manifest entries for list/get operations (AC: 1, 2, 3)
  - [ ] `processDefinition_list` (FR-02): Zod schema includes optional filter params: `key`, `name`, `version`, `versionTag`, `tenantId`, `deploymentId`
  - [ ] `processDefinition_getById` (FR-03): Zod schema requires `id: string`
  - [ ] `processDefinition_getByKey` (FR-03): Zod schema requires `key: string`, optional `version`, `tenantId`
  - [ ] `processDefinition_getXmlById` or similar: retrieves BPMN/DMN XML by definition ID
  - [ ] Run `npm run generate` to ensure generated handlers include all filter params
- [ ] Verify list handler returns required fields (AC: 1)
  - [ ] Response maps Operaton list endpoint output: `{ id, key, name, version, deploymentId }` per definition
  - [ ] No field stripping in MVP — return full Operaton JSON as MCP content
- [ ] Verify get-XML handler returns BPMN/DMN XML (AC: 3)
  - [ ] Calls `GET /engine/{engineName}/process-definition/{id}/xml`
  - [ ] Returns `{ id, bpmn20Xml }` — the full XML string
- [ ] Verify error handling for not-found (AC: 4)
  - [ ] `normalize()` maps `NotFoundException` → structured MCP error with not-found hint
  - [ ] `isError: true` returned with type + cause + corrective action
- [ ] Extend integration test `test/integration/processDefinition.test.ts` (AC: 5)
  - [ ] `beforeEach`: deploy a test BPMN fixture
  - [ ] Test: list with no filters → returns at least the deployed definition; each result has `id`, `key`, `name`, `version`, `deploymentId`
  - [ ] Test: list filtered by key → returns only definitions matching the key
  - [ ] Test: get by ID → returns definition metadata + BPMN XML
  - [ ] Test: get by non-existent ID → `isError: true`, structured not-found error
  - [ ] `afterEach`: delete deployed definition

## Dev Notes

### Prerequisite

Story 2.1 must be complete (manifest populated, generation run, integration test infrastructure set up).

### Operaton List Endpoint

`GET /engine/{engineName}/process-definition` with query params:
- `key`, `name`, `version`, `versionTag`, `tenantId`, `deploymentId`, `active`, `suspended`, etc.

The Zod schema for the list tool should make all filter params optional. The generated handler passes them as query parameters.

### Get XML Endpoint

`GET /engine/{engineName}/process-definition/{id}/xml` → `{ id: string, bpmn20Xml: string }`

This is a separate tool from `processDefinition_getById`. Both should be exposed in the manifest with FR-03 `frMapping`.

### Response Field Requirements

Per FR-02: each result MUST include `id`, `key`, `name`, `version`, `deploymentId`. Operaton returns these as top-level fields. The generated handler passes the full JSON — no field stripping needed in MVP.

### Error Map Entries (from Story 1.3)

- `"NotFoundException"` → hint: "Check the process definition ID or key is correct and the definition is deployed."

### Anti-Patterns to Avoid

- ❌ Do NOT hand-write the list/get handlers — generate from manifest
- ❌ Do NOT strip response fields — return full Operaton JSON
- ❌ Integration tests must NOT assume pre-existing definitions — deploy in `beforeEach`

### Key File Locations

- `config/tool-manifest.json` — processDefinition group (already populated in Story 2.1)
- `src/generated/processDefinition/` — generated handlers (do not edit)
- `test/integration/processDefinition.test.ts` — extend from Story 2.1

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns`
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 2.2`
- PRD FR-02, FR-03

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
