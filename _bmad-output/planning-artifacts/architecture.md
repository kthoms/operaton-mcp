---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-17'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - 'resources/operaton-rest-api.json'
workflowType: 'architecture'
project_name: 'operaton-mcp'
user_name: 'Karsten'
date: '2026-03-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
35 individual-operation FRs across 8 MVP capability domains (Process Definitions, Process Instances, Tasks, Jobs & Job Definitions, Incidents, Users & Groups, Historic Data, Decisions & DMN). Each FR specifies actor, operation, and measurable acceptance criteria (success confirmation or structured error). Write FRs (W) require NFR-01 compliance; read FRs (R) require NFR-02 compliance.

The Operaton REST API spec (OpenAPI 3.0.2, 305 paths, 52 operation groups) is the authoritative source for tool generation. The PRD success criterion "100% of REST endpoints exposed at launch" means the architecture must accommodate all 305 paths. The PRD's 8 domains are semantic groupings, not an exhaustive list.

**Non-Functional Requirements:**
- NFR-01: Zero silent failures — all write operations return explicit confirmation or structured error (type, cause, corrective action)
- NFR-02: Read accuracy — current engine state within normal consistency window
- NFR-03: MCP protocol compliance — verified against Claude Desktop and GitHub Copilot Chat
- NFR-04: Stateless — no session state between tool calls; connection config only
- NFR-05: Error message quality — type + cause + recommended action per operation
- NFR-06: Fully configurable via env vars — no hardcoded endpoints or credentials

**Scale & Complexity:**
- Primary domain: API bridge / MCP server / developer tool
- Complexity level: Medium (lean stateless architecture, high implementation volume)
- API surface: 305 paths, 52 groups — high regularity enabling code generation
- No UI, no database, no persistent state
- Estimated architectural components: 6–8 focused modules

### Framework Landscape & Build Decision Context

A mature ecosystem of OpenAPI→MCP tools exists. The key options for a TypeScript/npm project are:

- **`@ivotoby/openapi-mcp-server`** — runtime proxy, npx-runnable, METHOD-path tool naming (not operationId-based). Zero-install option; insufficient curation quality for production.
- **`openapi-mcp-generator`** — generates a TypeScript project with Zod validation from OpenAPI spec, uses operationId for tool naming, supports x-mcp vendor extension for selective exposure. Best candidate for generated scaffolding.
- **FastMCP (Python)** / **AWS Labs (Python)** — Python ecosystem; not aligned with npm publishing goal.

**Key insight (from FastMCP documentation):** "LLMs achieve significantly better performance with well-designed and curated MCP servers than with auto-converted OpenAPI servers." Generic proxy tools solve the volume problem but not the quality problem.

**Build decision context:** operaton-mcp's value-add is Operaton-specific curation on top of generated scaffolding — optimized tool names, BPM-domain descriptions guiding correct usage, structured error mapping, and pre-wired Basic Auth. A pure proxy (`@ivotoby`) satisfies 100% coverage but not quality NFRs. The recommended approach is: generate scaffolding from the OpenAPI spec, then apply Operaton-specific curation as a build-time layer.

### Technical Constraints & Dependencies

- MCP protocol: TypeScript SDK (`@modelcontextprotocol/sdk`) — official, actively maintained, npm-native
- OpenAPI 3.0.2 spec available at build time at `resources/operaton-rest-api.json`
- Single external dependency: Operaton REST API over HTTP/HTTPS with Basic Auth
- Authentication: HTTP Basic (OPERATON_USERNAME + OPERATON_PASSWORD env vars)
- Node.js runtime — aligns with npm publishing target
- Distribution: `npm publish` → `npx operaton-mcp` in Claude Desktop config
- Integration tests require live Operaton instance (NFR-01/02; mocks insufficient)
- Tool name length: MCP clients impose practical limits (~64 chars); operationId slugification must stay within bounds

### Cross-Cutting Concerns Identified

1. **Tool organization & LLM discoverability** — 305 paths as 305 flat tools risks LLM confusion; grouping by operationId prefix (matching Operaton's API groups) balances coverage and navigability
2. **Error normalization** — Operaton REST errors (HTTP 4xx/5xx + JSON body) must map consistently to structured MCP error responses with BPM-domain corrective guidance (NFR-01, NFR-05)
3. **Auth injection** — every HTTP request needs Basic Auth from env config; must fail fast and diagnose clearly on misconfiguration (NFR-06)
4. **Input validation** — validate tool inputs before calling Operaton to prevent partial-failure states; Zod schemas derivable from OpenAPI spec
5. **Response formatting** — raw Operaton JSON formatted for LLM readability; field selection and naming clarity matter for downstream reasoning quality
6. **Code generation pipeline** — regularity of 305 API operations strongly favors generation over manual authoring; `openapi-mcp-generator` or custom script from `resources/operaton-rest-api.json`
7. **npm publishing** — package.json `bin` entry for npx execution; semantic versioning aligned with Operaton API versions

## Starter Template Evaluation

### Primary Technology Domain

**API/Backend — MCP Server** based on project requirements analysis. operaton-mcp is a Node.js process that speaks the MCP protocol over stdio, proxies calls to the Operaton REST API, and is distributed as an npm package. No UI, no database, no web server.

### Starter Options Considered

| Option | Approach | Coverage | Curation Quality | npm-native |
|---|---|---|---|---|
| `@ivotoby/openapi-mcp-server` | Runtime proxy | 305 paths (auto) | Low — METHOD-path naming | ✅ |
| `openapi-mcp-generator` | Code generation | 305 paths (generated) | Medium — operationId-based | ✅ |
| `@modelcontextprotocol/create-typescript-server` | Project shell only | n/a (shell) | High — manual only | ✅ |
| **Hybrid (selected)** | Shell + generator + manifest | 305 paths (generated + curated) | High | ✅ |

Pure proxy (`@ivotoby`) solves coverage but not quality — LLM tool descriptions and names are inadequate for production use. Custom scaffold from scratch sacrifices MCP SDK conformance guarantees. The hybrid approach achieves both.

### Selected Starter: Hybrid — MCP scaffold + openapi-mcp-generator + manifest-driven curation

**Rationale for Selection:**
- `@modelcontextprotocol/create-typescript-server` provides MCP SDK version conformance and correct stdio transport wiring — the most error-prone setup concern
- `openapi-mcp-generator` solves the 305-path Zod schema derivation problem without reinventing OpenAPI→TypeScript type generation
- A project-internal manifest (`config/tool-manifest.json`) drives curation decisions (tool names, descriptions, expose flags) without modifying the source OpenAPI spec or hand-patching generated files
- Generated code is treated as an intermediate build artifact — never manually edited; curation is configuration, not code

**Initialization Command:**

```bash
npx @modelcontextprotocol/create-typescript-server operaton-mcp
```

Followed by adding `openapi-mcp-generator` as a dev dependency and writing `scripts/generate.ts`.

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript 5.x, ESM (`"type": "module"`), Node.js 22 LTS. Strict TypeScript configuration. `tsx` or `ts-node` for script execution during build.

**MCP SDK:**
`@modelcontextprotocol/sdk ^1.27.1` — pinned to match scaffold output. stdio transport (required for Claude Desktop and npx execution). `console.log()` is forbidden in tool handlers — corrupts JSON-RPC stream; use `console.error()` only.

**Build Tooling:**
TypeScript compiler (`tsc`) for production build to `dist/`. `scripts/generate.ts` runs at build time before `tsc`, producing `src/generated/` from `resources/operaton-rest-api.json` + `config/tool-manifest.json`. Coverage audit step asserts all 305 paths are represented.

**Validation:**
Zod `^3.x` for input schema validation, schemas derived from OpenAPI spec via `openapi-mcp-generator`. Validation runs before any HTTP call to Operaton to prevent partial-failure states (NFR-01).

**Code Organization:**
```
src/
  index.ts          — MCP server entry point, tool registration
  generated/        — build artifact (gitignored), never manually edited
  tools/            — curated tool wrappers (thin, call generated handlers)
  http/             — Operaton HTTP client, auth injection, error normalization
  config.ts         — env var loading, fail-fast on missing required vars
config/
  tool-manifest.json — curation: name, description, expose flag per operationId
resources/
  operaton-rest-api.json — authoritative OpenAPI spec
scripts/
  generate.ts       — build-time generation + coverage audit
```

**Development Experience:**
- `npm run generate` — runs generation pipeline
- `npm run build` — generate + tsc
- `npm run dev` — tsx watch mode for local iteration
- `npm run test` — unit tests (generation correctness, error normalization); integration tests require `OPERATON_BASE_URL` to be set

**Distribution:**
`package.json` `bin` entry pointing to `dist/index.js` for `npx operaton-mcp` execution. Published to npm registry.

**Note:** Project initialization (`npx @modelcontextprotocol/create-typescript-server operaton-mcp`) followed by generation pipeline setup should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- MCP tool organization: group-by-domain-prefix naming via manifest with FR traceability; unknown tool names return structured error listing available groups
- HTTP client: native `fetch` with `createOperatonClient` factory; engine name injected at call time
- Error normalization: structured MCP errors with BPM-domain corrective hints, static map + fallback
- Code generation pipeline: manifest-driven, manifest-validated, coverage-audited; `src/generated/` gitignored; `prepare` script ensures cold-start works

**Important Decisions (Shape Architecture):**
- Testing: Vitest, unit + smoke (fetch-level mock) + integration (write-state tests clean up in `afterEach`); test files mirror source structure
- Configuration: 4 env vars, fail-fast on config errors, warn-and-continue on connectivity failures
- Curation is core product value — descriptions live in manifest from day 1 with enforced length guidelines

**Deferred Decisions (Post-MVP):**
- Retry/backoff logic
- Tool pagination / lazy-loading
- Multi-engine support

### MCP Tool Organization

Group-by-domain-prefix naming via `config/tool-manifest.json`. All operations exposed; `expose: false` + `reason` for intentional exclusions. Curation is the primary product differentiator.

**Unknown tool name handling:** Tool dispatch returns: `"Unknown tool: {name}. Available groups: processDefinition, task, incident, ..."` — enables LLM self-correction.

**Description length guidelines:** `description` ~200 chars max; `examples` ~100 chars each, max 2. Generation warns on exceed.

### Authentication & Security

`createOperatonClient(config)` resolves `OPERATON_ENGINE` into path templates at call time. Startup: config fail-fast (`process.exit(1)`) → connectivity warning with `curl -u $OPERATON_USERNAME:$OPERATON_PASSWORD $OPERATON_BASE_URL/engine` diagnostic hint and continue.

### API & Communication Patterns

- **Transport:** stdio only. `console.log()` forbidden; use `console.error()`.
- **HTTP client:** Node.js 22 built-in `fetch`. Engine name resolved at call time. No retry in MVP.
- **Error normalization:** Static map keyed by Operaton error type → structured MCP error + BPM-domain hint. Fallback: unknown types → generic error preserving raw Operaton body.
- **Response formatting:** Full Operaton JSON as MCP content; no field stripping in MVP.

### Code Generation Pipeline

`scripts/generate.ts`: parse spec (operation count denominator) → spec diff (gitignored `.prev.json`, local convenience; authoritative change record is git history) → load manifest → validate params (path/query/body separately) → coverage audit → length check (warn) → emit `src/generated/{group}/{operationId}.ts` + group barrels + top-level barrel.

**`package.json`:** `prepare` script runs generation after `npm install`; `"bin": { "operaton-mcp": "./dist/index.js" }`.

**`src/index.ts`:** must include `#!/usr/bin/env node` shebang for cross-platform `npx` execution.

**`tsconfig.json`:** path alias `@generated/*` → `src/generated/*` keeps import paths clean.

**Manifest schema** (`config/tool-manifest.json`):
```json
{
  "[operationId]": {
    "name": "string",
    "description": "string — ~200 chars max",
    "expose": "boolean",
    "reason": "string — required if expose: false",
    "tags": ["string"],
    "frMapping": ["FR-07"],
    "parameterOverrides": { "[originalParam]": "renamedParam" },
    "responseShape": ["fieldToHighlight"],
    "examples": ["string — ~100 chars max, max 2"]
  }
}
```

`frMapping: []` valid for operations without a direct PRD FR reference. Only the 35 named FRs require explicit mapping.

**Development fixture:** `config/tool-manifest.fixture.json` — 10–15 operations, 2–3 groups, real BPM-domain descriptions + `frMapping` entries. Used for TDD on the generator before full manifest population.

### Testing Strategy

| Layer | Scope | Notes |
|---|---|---|
| Unit — generation | Manifest → correct tool name, params, auth header, frMapping | `test/unit/generated/{group}/{operationId}.test.ts` mirrors source |
| Unit — error normalization | Error type → MCP error + hint; unknown → fallback | Vitest |
| MCP smoke | `tools/list` (count ≥ 1) + `tools/call` round-trip; HTTP mocked at `fetch` level (fetchMock/undici MockAgent, minimal valid Operaton shape) — validates MCP framing only | Vitest + child_process |
| Integration | Live Operaton; NFR-01/02; **write-state tests clean up in `afterEach`** | Skipped if `OPERATON_BASE_URL` unset |

### Infrastructure & Deployment

- `npm publish` + `bin` → `npx operaton-mcp`; `prepare` script for cold-start
- Node.js 22 LTS; semver aligned with Operaton API version
- CI: build + unit + smoke on every push; integration gated on `OPERATON_BASE_URL` secret
- Gitignored: `src/generated/`, `resources/operaton-rest-api.prev.json`

### Decision Impact Analysis

**Implementation Sequence:**
1. Scaffold + `prepare` script + `.gitignore` + `tsconfig.json` aliases + shebang
2. Config module + startup (fail-fast + connectivity warning with curl hint)
3. HTTP client factory (auth + engine name resolution at call time) + error normalization (static map + fallback) + unknown-tool handler
4. Seed fixture manifest with real BPM-domain descriptions + `frMapping` (2–3 groups, 10–15 ops)
5. Generation pipeline TDD (parse → diff → validate → audit → length check → emit per-operation files)
6. Full manifest population (all operationIds, real descriptions, frMapping for all 35 FRs, `frMapping: []` for remainder)
7. Tool registration in `src/index.ts`
8. Test suite (unit mirroring source structure + smoke with fetch-level mock + integration with cleanup pattern)
9. npm publish config

**Cross-Component Dependencies:**
- Engine name resolved at call time — generated files contain path templates, not hardcoded strings
- `src/generated/` gitignored — `prepare` script bridges cold-start gap for all contributors
- `frMapping` enables auditable FR→tool traceability across all 35 PRD FRs
- Unknown tool handler gives LLMs available group names for self-correction
- Integration test `afterEach` cleanup prevents cascading failures from stale engine state
- Shebang in `src/index.ts` required for cross-platform `npx` execution

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

11 areas where AI agents could make divergent choices without explicit rules.

### Naming Patterns

**Tool Names (manifest-controlled):**
- Format: `{groupName}_{verbNoun}` camelCase — e.g. `processDefinition_getById`, `task_complete`, `incident_resolve`
- Group names match Operaton API operationId prefixes
- Verb first within suffix: `getById` not `byIdGet`; `listAll` not `allList`
- Max total length: 64 chars

**TypeScript — Files:**
- Source files: `camelCase.ts`; generated files: match operationId exactly
- Test files: `{sourceFileName}.test.ts`; config files: `kebab-case.json`

**TypeScript — Code:**
- Functions/variables: `camelCase`; Types/interfaces: `PascalCase`; Constants: `UPPER_SNAKE_CASE`
- No `any` — use `unknown` + type guard or `z.infer<typeof schema>`
- No hand-written Operaton response interfaces — response types come from `z.infer<typeof responseSchema>` where schemas are generated

**Error Type Identifiers:**
- Keys are exact Operaton `type` field strings. Fallback key: `"__unknown__"`

### Structure Patterns

**File Organization:**
```
src/
  index.ts              — entry point: config, connectivity check, client init,
                          registerAllTools(); stays under 50 lines
  config.ts             — env var loading + validation; exported as singleton
  generated/            — GITIGNORED; exports registerAllTools(server, client)
  http/
    client.ts           — createOperatonClient factory + OperatonClient type
    errors.ts           — error normalization map + normalize() function
  tools/                — hand-written wrappers only; call generated handlers, never copy them
config/
  tool-manifest.json
  tool-manifest.fixture.json
resources/
  operaton-rest-api.json
scripts/
  generate.ts
test/
  unit/generated/       — mirrors src/generated/
  unit/http/            — mirrors src/http/
  smoke/
    mcp-protocol.test.ts — single file: tools/list + tools/call round-trip
  integration/
```

**Import Rules:**
- Use `@generated/*` path alias — never relative paths to `src/generated/`
- `src/index.ts` calls `registerAllTools(server, client)` from `@generated/index` — no per-tool imports in entry point
- All relative TypeScript imports use `.js` extension (`import { normalize } from './errors.js'`) — required by Node.js ESM resolution. Path alias imports (`@generated/*`) are exempt.

### Format Patterns

**MCP Tool Response (success):**
```typescript
return { content: [{ type: "text", text: JSON.stringify(operatonResponse, null, 2) }] };
```

**MCP Tool Response (error):**
```typescript
return {
  isError: true,
  content: [{ type: "text", text: `[${errorType}] ${message} — Suggested action: ${hint}` }]
};
```

**Unknown tool error:** `Unknown tool: {name}. Available groups: processDefinition, task, ...`

**Log messages** (all via `console.error()`): `[operaton-mcp] {level}: {message}`
- Config failure: `[operaton-mcp] Missing required env var: {VAR_NAME}`
- Connectivity warning: `[operaton-mcp] Warning: Cannot reach Operaton at {url}. Verify with: curl -u $OPERATON_USERNAME:$OPERATON_PASSWORD $OPERATON_BASE_URL/engine`

### Process Patterns

**Client Initialization & Registration:**
```typescript
// src/index.ts — stays under 50 lines
const config = loadConfig();
await checkConnectivity(config);
const client = createOperatonClient(config);
const server = new McpServer({ name: "operaton-mcp", version: "..." });
registerAllTools(server, client);  // generated; registers all 305 tools
await server.connect(new StdioServerTransport());
```

`registerAllTools(server, client)` is emitted by `scripts/generate.ts` into `src/generated/index.ts`.

**Tool Handler Pattern:**
```typescript
export async function {operationId}(
  input: z.infer<typeof {operationId}InputSchema>,
  client: OperatonClient
): Promise<McpToolResult> {
  const validated = {operationId}InputSchema.parse(input);
  const response = await client.{method}(path, validated);
  return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
}
export type {operationId}Response = z.infer<typeof {operationId}ResponseSchema>;
```

**TypeScript Strict Mode:** `tsconfig.json` strict settings are frozen. No story implementation may disable individual flags. Use type assertions with explanatory comments over tsconfig changes:
```typescript
// Operaton returns mixed numeric/string IDs in this endpoint; safe cast verified against spec
const id = rawId as string;
```

**HTTP Client Usage:** All HTTP via `createOperatonClient` — never raw `fetch()`.

**Async Pattern:** `async/await` throughout — no `.then()/.catch()` chains.

**Validation:** Zod `.parse()` at handler entry before any I/O — not `.safeParse()`.

### Testing Patterns

**Smoke test:** Single file `test/smoke/mcp-protocol.test.ts` covering `tools/list` + `tools/call` round-trip with fetch-level mock (fetchMock/undici MockAgent).

**Integration Test Setup:**
- Read-state tests — no setup required
- Write-state tests — `beforeEach` creates own fixtures; `afterEach` tears down; no assumed pre-existing engine state; no test order dependencies

### Enforcement Guidelines

**All AI Agents MUST:**
- Use `@generated/*` alias — never relative paths to `src/generated/`
- Never edit `src/generated/**` — modify manifest and regenerate
- Never copy generated files to hand-edit — write a thin wrapper in `src/tools/`
- Route all HTTP through `createOperatonClient` — never raw `fetch()`
- Use `console.error()` exclusively — never `console.log()`
- Use `[operaton-mcp] {level}: {message}` log format
- Use Zod `.parse()` not `.safeParse()` in tool handlers
- Use `z.infer<typeof schema>` for response types — no hand-written Operaton interfaces
- Keep `src/index.ts` under 50 lines — all tool registration via `registerAllTools()`
- Keep `tsconfig.json` strict settings frozen
- Use `.js` extension on all relative TypeScript imports
- Mirror source structure in test file paths
- Write-state integration tests: `beforeEach` fixture creation + `afterEach` cleanup
- Maintain `frMapping` for manifest entries corresponding to PRD FRs

**Anti-Patterns:**
- ❌ Relative imports to `src/generated/` without `@generated/*` alias
- ❌ Relative imports missing `.js` extension in ESM source files
- ❌ Raw `fetch()` calls
- ❌ `console.log()` anywhere in server code
- ❌ Manual edits to `src/generated/**`
- ❌ Copying generated files to hand-edit
- ❌ Hardcoding engine name
- ❌ `safeParse` in tool handlers
- ❌ Hand-written `interface OperatonXxx { ... }` response types
- ❌ Individual `server.tool()` calls in `src/index.ts`
- ❌ Disabling `tsconfig.json` strict flags
- ❌ Integration write tests assuming pre-existing engine state

## Project Structure & Boundaries

### Complete Project Directory Structure

```
operaton-mcp/
├── .github/
│   └── workflows/
│       ├── ci.yml                    — build + unit + smoke on every push (all PRs)
│       └── integration.yml           — integration tests; push to main only; uses OPERATON_BASE_URL secret
├── .gitignore                        — includes: dist/, src/generated/, resources/*.prev.json
├── config/
│   ├── tool-manifest.json            — source of truth: all operationIds with curation
│   └── tool-manifest.fixture.json    — TDD fixture: 10-15 ops, 2-3 groups, real descriptions
├── dist/                             — tsc output (gitignored; included in npm package via files field)
├── resources/
│   └── operaton-rest-api.json        — authoritative OpenAPI 3.0.2 spec (never modified)
├── scripts/
│   └── generate.ts                   — build-time generation pipeline
├── src/
│   ├── index.ts                      — #!/usr/bin/env node; entry point (<50 lines)
│   ├── config.ts                     — env var loading + validation; singleton export
│   ├── generated/                    — GITIGNORED; build artifact
│   │   ├── index.ts                  — registerAllTools(server, client) + barrel exports
│   │   ├── processDefinition/
│   │   │   ├── index.ts              — group barrel
│   │   │   ├── getProcessDefinitionById.ts
│   │   │   ├── getProcessDefinitions.ts
│   │   │   └── ... (46 operations)
│   │   ├── processInstance/
│   │   │   ├── index.ts
│   │   │   └── ... (25 operations)
│   │   ├── task/
│   │   │   ├── index.ts
│   │   │   └── ... (22 operations)
│   │   ├── job/
│   │   ├── jobDefinition/
│   │   ├── incident/
│   │   ├── user/
│   │   ├── group/
│   │   ├── decision/
│   │   ├── decisionRequirements/
│   │   ├── history/
│   │   ├── externalTask/
│   │   └── ... (all 52 groups)
│   ├── http/
│   │   ├── client.ts                 — createOperatonClient factory + OperatonClient type
│   │   └── errors.ts                 — Operaton error type map + normalize() + fallback
│   └── tools/                        — EMPTY at project init; hand-written wrappers added only per story
├── test/
│   ├── unit/
│   │   ├── generated/                — mirrors src/generated/ structure
│   │   │   ├── processDefinition/
│   │   │   │   └── getProcessDefinitionById.test.ts
│   │   │   └── ...
│   │   └── http/
│   │       ├── client.test.ts
│   │       └── errors.test.ts
│   ├── smoke/
│   │   └── mcp-protocol.test.ts      — tools/list + tools/call; OPERATON_SKIP_HEALTH_CHECK=true
│   └── integration/
│       ├── processDefinition.test.ts — FR-01 to FR-05
│       ├── processInstance.test.ts   — FR-06 to FR-10
│       ├── task.test.ts              — FR-11 to FR-15
│       ├── job.test.ts               — FR-16 to FR-20
│       ├── incident.test.ts          — FR-21 to FR-23
│       ├── userGroup.test.ts         — FR-24 to FR-27 (known future split: user.test.ts + group.test.ts)
│       ├── history.test.ts           — FR-28 to FR-32
│       └── decision.test.ts          — FR-33 to FR-35
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### Key Configuration Files

**`package.json`:**
```json
{
  "type": "module",
  "bin": { "operaton-mcp": "./dist/index.js" },
  "files": ["dist/", "README.md"],
  "scripts": {
    "prepare": "npm run generate",
    "generate": "tsx scripts/generate.ts",
    "build": "npm run generate && tsc && tsc-alias",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "test:integration": "OPERATON_BASE_URL=... vitest run test/integration"
  }
}
```

`dist/` is gitignored but included in the published npm package via `files`. `src/`, `test/`, `scripts/`, `config/`, `resources/` are excluded from npm publish.

**`vitest.config.ts`:**
```typescript
export default defineConfig({
  test: {
    projects: [
      { name: 'unit',        include: ['test/unit/**/*.test.ts'] },
      { name: 'smoke',       include: ['test/smoke/**/*.test.ts'] },
      { name: 'integration', include: ['test/integration/**/*.test.ts'],
        enabled: !!process.env.OPERATON_BASE_URL }
    ]
  }
});
```

**`tsconfig.json`:** `strict: true`, `paths: { "@generated/*": ["src/generated/*"] }`, `outDir: "dist/"`.

**`tsc-alias`** dev dependency — rewrites `@generated/*` path aliases in `dist/` post-compilation. Without it, `npx operaton-mcp` fails at runtime with `Cannot find module '@generated/index'`.

### Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPERATON_BASE_URL` | ✅ | — | Base URL of Operaton REST API |
| `OPERATON_USERNAME` | ✅ | — | Basic auth username |
| `OPERATON_PASSWORD` | ✅ | — | Basic auth password |
| `OPERATON_ENGINE` | ❌ | `default` | Engine name path segment |
| `OPERATON_SKIP_HEALTH_CHECK` | ❌ | `false` | Skip startup connectivity check — **dev/test only** |

### Architectural Boundaries

**External — MCP Protocol:**
Entry via stdio JSON-RPC → `src/index.ts` → `registerAllTools()` → tool handlers → `src/http/client.ts` → Operaton REST API.

**External — Operaton REST API:**
All outbound HTTP exclusively through `src/http/client.ts`. Error normalization at this boundary in `src/http/errors.ts`.

**Internal — Generated vs. Handwritten:**
`src/generated/` is machine-owned. `src/tools/` is the safe zone for hand-written behavior. The manifest is the control plane.

**Configuration Boundary:**
`src/config.ts` is the only file reading `process.env`. All other modules receive config as parameters.

### Requirements to Structure Mapping

| FR Domain | PRD FRs | Integration Test |
|---|---|---|
| Process Definitions | FR-01 to FR-05 | `test/integration/processDefinition.test.ts` |
| Process Instances | FR-06 to FR-10 | `test/integration/processInstance.test.ts` |
| Tasks | FR-11 to FR-15 | `test/integration/task.test.ts` |
| Jobs & Job Definitions | FR-16 to FR-20 | `test/integration/job.test.ts` |
| Incidents | FR-21 to FR-23 | `test/integration/incident.test.ts` |
| Users & Groups | FR-24 to FR-27 | `test/integration/userGroup.test.ts` |
| Historic Data | FR-28 to FR-32 | `test/integration/history.test.ts` |
| Decisions & DMN | FR-33 to FR-35 | `test/integration/decision.test.ts` |

### Data Flow

```
MCP JSON-RPC tools/call
  → MCP SDK parse + route
  → Zod .parse(input)                    — throws ZodError on invalid
  → client.{method}(path, params)        — auth + engine name injected
  → Operaton HTTP response
  → normalize(response)                  — error map or success pass-through
  → JSON.stringify → MCP content response
```

### README.md Required Sections

1. **Install & Run** — `npx operaton-mcp`
2. **Environment Variables** — table (all 5 vars including `OPERATON_SKIP_HEALTH_CHECK` dev/test note)
3. **MCP Client Configuration** — Claude Desktop `claude_desktop_config.json` example with env vars
4. **Available Tool Groups** — list of all 52 group prefixes
5. **Development** — `npm install`, `npm run dev`, `npm test`

### CI Workflow Boundaries

- **`ci.yml`** — runs on all pushes and PRs; executes build + unit + smoke; no secrets required
- **`integration.yml`** — runs on push to `main` only; uses `OPERATON_BASE_URL` repository secret; prevents fork PR failures

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible: TypeScript 5.x + ESM + Node.js 22 LTS is a well-established combination. `@modelcontextprotocol/sdk ^1.27.1` with stdio transport is the correct pairing for Claude Desktop/npx deployment. Zod `^3.x` integrates natively with TypeScript's type system. `tsc-alias` resolves the path alias gap between TypeScript compilation and Node.js ESM runtime. `vitest` works with ESM without configuration friction. No version conflicts identified.

**Pattern Consistency:**
All patterns are traceable to specific decisions: `createOperatonClient` enforces auth injection; `registerAllTools()` enforces single registration surface; `.parse()` over `.safeParse()` enforces NFR-01; `@generated/*` alias enforces gitignored generated code boundary.

**Structure Alignment:**
`src/http/` houses client/error boundary; `src/generated/` is build artifact zone; `config/tool-manifest.json` is control plane; `test/{unit,smoke,integration}/` maps to three test layers. `tsc-alias` + `prepare` script + `.gitignore` form a coherent cold-start story.

### Requirements Coverage Validation ✅

**Functional Requirements (35 FRs):**
All 35 FRs covered via `frMapping` in manifest. Write FRs covered by error normalization + NFR-01 enforcement. Read FRs covered by stateless pass-through. PRD "100% endpoints" criterion covered by build-time coverage audit.

**Non-Functional Requirements:**

| NFR | Architectural Coverage |
|---|---|
| NFR-01: Zero silent failures | Zod `.parse()` throws; error map + fallback; `isError: true` |
| NFR-02: Read accuracy | Stateless pass-through to live Operaton; no caching |
| NFR-03: MCP protocol compliance | Official MCP SDK; smoke test; **manual release gate in Claude Desktop + Copilot Chat** |
| NFR-04: Stateless | Single client instance; env-var-only config; no session state |
| NFR-05: Error message quality | BPM-domain hints in error map; fallback preserves raw body |
| NFR-06: Env-var configurable | 5 vars in `src/config.ts`; fail-fast on missing required vars |

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical decisions documented with versions. Rationale documented. 25+ issues resolved across Party Mode rounds.

**Structure Completeness:** Complete file tree with 100% of files named. All configuration files specified with content examples. No placeholders.

**Pattern Completeness:** 11 conflict points resolved. 14 mandatory rules. 12 anti-patterns. Code examples for every major pattern.

### Gap Analysis Results

**Critical Gaps:** None.

**Deferred by Design (Post-MVP):** Retry/backoff · Multi-engine · Response field filtering.

**Nice-to-Have:** `CHANGELOG.md` maintenance pattern · Semantic release automation.

### Architecture Completeness Checklist

**✅ Requirements Analysis** — 35 FRs + 6 NFRs + 7 cross-cutting concerns mapped

**✅ Starter Template** — Hybrid approach; all versions specified; cold-start designed

**✅ Core Architectural Decisions** — 9 decisions; 3 explicitly deferred; 17 Party Mode improvements

**✅ Implementation Patterns** — 11 conflict points; 14 rules; 12 anti-patterns; ESM-specific rules

**✅ Project Structure** — Complete file tree; 8 FR domains mapped; CI boundaries defined; npm vs. git publish separation

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- Manifest-driven curation cleanly separates what exists (spec), how to expose it (manifest), and implementation (generated code)
- All NFRs are mechanically enforced by architecture, not just documented
- `frMapping` enables auditable FR traceability across all 35 requirements
- Build pipeline fully specified end-to-end with no ambiguous steps
- 25+ issues surfaced and resolved through Party Mode scrutiny

**Areas for Future Enhancement (Post-MVP):**
- Response field selection via `responseShape` manifest field (hook exists)
- BPM-domain error hint expansion as new Operaton error types are encountered
- Tool description quality iteration based on LLM usage patterns
- Split `userGroup.test.ts` if either domain grows

### Implementation Handoff

**Daily Reference Sections for AI Agents (re-read before every story):**
1. **Core Architectural Decisions** — what was decided and why
2. **Implementation Patterns & Consistency Rules** — how to write every line
3. **Project Structure & Boundaries** — where everything goes

**First Implementation Story:**
Run scaffold in a temp directory, cherry-pick files into existing repo (do not run inside existing repo root):
```bash
cd /tmp && npx @modelcontextprotocol/create-typescript-server operaton-mcp
# then merge package.json, tsconfig.json, src/index.ts skeleton into existing repo
```
Add `tsc-alias` dev dependency. Configure `prepare` script. Add `.gitignore` entries. Add `#!/usr/bin/env node` shebang.

**NFR-03 Release Gate (before first `npm publish`):**
Manual verification in Claude Desktop — `tools/list` + one `tools/call` per FR domain (8 calls). Repeat `tools/list` in GitHub Copilot Chat. Verify `isError: true` renders correctly in both clients.

**`frMapping` Enforcement Rule:**
Generation pipeline warns when a manifest entry has no `frMapping` key (absent = warning). `frMapping: []` (explicit empty array) is valid and suppresses warning. Every manifest entry must have an explicit `frMapping` key.
