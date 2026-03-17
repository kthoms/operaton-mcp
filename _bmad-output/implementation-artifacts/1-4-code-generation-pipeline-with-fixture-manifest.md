# Story 1.4: Code Generation Pipeline with Fixture Manifest

Status: ready-for-dev

## Story

As a developer maintaining operaton-mcp,
I want a build-time generation script that reads `config/tool-manifest.fixture.json` and produces correctly structured TypeScript files in `src/generated/`,
so that the generation pipeline is TDD-validated before full manifest population and generated code is never manually edited.

## Acceptance Criteria

1. **Given** `config/tool-manifest.fixture.json` exists with 10–15 operations across 2–3 groups, with real BPM-domain descriptions and `frMapping` entries for any FR-mapped operations **When** `npm run generate` is executed **Then** `src/generated/{group}/{operationId}.ts` files are emitted for all fixture operations; each exports the handler function and Zod input/response schemas; group barrel `src/generated/{group}/index.ts` and top-level `src/generated/index.ts` with `registerAllTools(server, client)` are emitted.

2. **Given** `resources/operaton-rest-api.json` is present and the coverage audit step runs **When** a manifest entry references an operationId not found in the spec **Then** the build fails with a descriptive error identifying the unknown operationId.

3. **Given** a manifest entry's `description` exceeds ~200 characters or an `examples` entry exceeds ~100 characters **When** the pipeline runs **Then** a warning is printed to stderr; build continues.

4. **Given** a manifest entry is missing the `frMapping` key entirely (not `frMapping: []` — absent) **When** the pipeline runs **Then** a warning is printed to stderr identifying the operationId.

5. **Given** unit tests for generation correctness are run **When** `npm test` executes **Then** tests pass covering: correct tool name from manifest, correct Zod param structure, correct auth header in generated handler, `frMapping` presence for FR-mapped entries.

## Tasks / Subtasks

- [ ] Create `config/tool-manifest.fixture.json` (AC: 1)
  - [ ] 10–15 operations spanning 2–3 groups (suggested: processDefinition + task + incident)
  - [ ] Use real BPM-domain descriptions, not generic REST descriptions
  - [ ] Include `frMapping` for operations that correspond to PRD FRs (e.g., FR-01, FR-02, FR-11)
  - [ ] Use `frMapping: []` for operations without a direct FR reference
  - [ ] Sample entries to include: `getProcessDefinitions` (FR-02), `deployProcessDefinition` (FR-01), `getTasks` (FR-11), `getIncidents` (FR-22)
  - [ ] Manifest entry schema per operation:
    ```json
    {
      "name": "{groupName}_{verbNoun}",
      "description": "~200 chars max, BPM-domain operator language",
      "expose": true,
      "tags": ["processDefinition"],
      "frMapping": ["FR-02"],
      "examples": ["optional ~100 chars max, max 2 entries"]
    }
    ```
- [ ] Create `scripts/generate.ts` — generation pipeline (AC: 1, 2, 3, 4)
  - [ ] **Step 1 — Parse spec:** Load `resources/operaton-rest-api.json`, build operationId → path/method map; count total paths (assert ~305)
  - [ ] **Step 2 — Spec diff:** Compare against `resources/operaton-rest-api.prev.json` if it exists; log changes to stderr; write current spec as `.prev.json` for next run
  - [ ] **Step 3 — Load manifest:** Load `config/tool-manifest.json` (fall back to `config/tool-manifest.fixture.json` if full manifest not yet present)
  - [ ] **Step 4 — Validate params:** For each manifest entry, verify the operationId exists in spec; fail with descriptive error if not (AC: 2)
  - [ ] **Step 5 — Coverage audit:** Log count of manifest entries vs spec paths
  - [ ] **Step 6 — Length check:** Warn (stderr) if `description` > 200 chars or any `example` > 100 chars (AC: 3)
  - [ ] **Step 7 — frMapping check:** Warn (stderr) for any entry missing `frMapping` key entirely (AC: 4)
  - [ ] **Step 8 — Emit files:**
    - Per-operation: `src/generated/{group}/{operationId}.ts` with handler + Zod schemas
    - Group barrel: `src/generated/{group}/index.ts` exporting all operations in group
    - Top-level barrel: `src/generated/index.ts` exporting `registerAllTools(server, client)` that registers all tools
  - [ ] Use `tsx scripts/generate.ts` in `package.json` `generate` script
- [ ] Define generated file template structure (AC: 1, 5)
  - [ ] Each `src/generated/{group}/{operationId}.ts` must export:
    - `{operationId}InputSchema` — Zod schema for validated input params
    - `{operationId}ResponseSchema` — Zod schema for response (can be `z.unknown()` initially)
    - `async function {operationId}(input, client): Promise<McpToolResult>` — handler
  - [ ] Handler pattern:
    ```typescript
    export async function {operationId}(
      input: z.infer<typeof {operationId}InputSchema>,
      client: OperatonClient
    ): Promise<McpToolResult> {
      const validated = {operationId}InputSchema.parse(input);
      const response = await client.{method}('{path}', validated);
      return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    }
    ```
  - [ ] `registerAllTools(server, client)` in `src/generated/index.ts` calls `server.tool(name, description, schema, handler)` for each exposed operation
- [ ] Add `npm run generate` to `package.json` scripts
  - [ ] `"generate": "tsx scripts/generate.ts"`
  - [ ] Ensure `tsx` is in devDependencies
- [ ] Write unit tests for generation output (AC: 5)
  - [ ] Run `npm run generate` in test setup, then assert on generated files
  - [ ] Test: tool name in generated file matches manifest `name` field
  - [ ] Test: Zod schema includes parameters from spec
  - [ ] Test: generated handler calls `client` (not raw `fetch`)
  - [ ] Test: `frMapping` is present in generated file comment/metadata for FR-mapped entries
  - [ ] Test: unknown operationId → build error (test the validation step directly)

## Dev Notes

### Critical Architecture Rules

- **Generated code in `src/generated/` is NEVER manually edited** — it is a build artifact. Modify `config/tool-manifest.json` and re-run generation instead. This is enforced by `.gitignore` inclusion.
- **Tool naming format:** `{groupName}_{verbNoun}` camelCase, max 64 chars. e.g., `processDefinition_getById`, `task_complete`, `incident_resolve`. Group names match Operaton API operationId prefixes.
- **`frMapping` key is REQUIRED** for all 35 PRD FRs — `frMapping: []` is valid for non-FR operations. The pipeline warns (not errors) on missing key.
- **`npm run generate` must run before `tsc`** — the `prepare` and `build` scripts already enforce this order.
- **Zod `.parse()` not `.safeParse()`** — generated handlers use `.parse()` at entry. If validation fails, the exception propagates up to MCP error handling.
- **No `any` type** — use `z.infer<typeof schema>` for response types; never hand-write Operaton response interfaces.

### Fixture Manifest Sample (processDefinition group)

```json
{
  "getProcessDefinitions": {
    "name": "processDefinition_list",
    "description": "List deployed process definitions. Filter by key, name, version, or tenant to find specific definitions.",
    "expose": true,
    "tags": ["processDefinition"],
    "frMapping": ["FR-02"],
    "examples": ["List all definitions for key 'loan-approval'"]
  },
  "deployProcessDefinition": {
    "name": "processDefinition_deploy",
    "description": "Deploy a BPMN or DMN artifact to Operaton. Returns deployment ID and process definition key on success.",
    "expose": true,
    "tags": ["processDefinition"],
    "frMapping": ["FR-01"]
  }
}
```

### Generation Pipeline Flow

```
resources/operaton-rest-api.json
    ↓ parse
operationId → {path, method, params} map
    ↓ diff vs .prev.json (log changes)
    ↓ load manifest (fixture or full)
    ↓ validate operationIds exist in spec
    ↓ coverage audit (count)
    ↓ length + frMapping warnings
    ↓ emit
src/generated/{group}/{operationId}.ts
src/generated/{group}/index.ts
src/generated/index.ts  ← registerAllTools
```

### Key File Locations

- `config/tool-manifest.fixture.json` — 10–15 ops TDD fixture
- `config/tool-manifest.json` — full manifest (populated starting Epic 2)
- `scripts/generate.ts` — generation pipeline
- `resources/operaton-rest-api.json` — authoritative OpenAPI spec (never modify)
- `src/generated/` — build output (gitignored)
- `test/unit/generated/` — tests for generated output

### Project Structure Notes

The fixture manifest is used for TDD during this story. From Epic 2 onwards, the full `config/tool-manifest.json` is populated per domain. The `generate` script should detect which manifest to use (prefer full manifest if present). The `src/generated/` directory is gitignored — contributors get it by running `npm run generate` (or automatically via `npm install` → `prepare`).

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#Code Generation Pipeline`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#MCP Tool Organization`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Naming Patterns`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Tool Handler Pattern`
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 1.4`
- Additional requirements: `_bmad-output/planning-artifacts/epics.md#Additional Requirements`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
