# Story 1.1: Project Scaffold & TypeScript Configuration

Status: review

## Story

As an engineer integrating operaton-mcp,
I want a properly initialized TypeScript project with MCP SDK wiring and correct ESM configuration,
so that the project compiles cleanly, runs via `npx operaton-mcp`, and other contributors can cold-start with `npm install`.

## Acceptance Criteria

1. **Given** the repository is freshly cloned and `npm install` is run **When** the `prepare` script executes automatically post-install **Then** no errors are produced and the project is ready to build.

2. **Given** `npm run build` is executed **When** TypeScript compiles with `strict: true` and `tsc-alias` rewrites path aliases **Then** `dist/index.js` is produced with `#!/usr/bin/env node` shebang; `@generated/*` aliases resolve correctly at runtime.

3. **Given** `src/index.ts` is inspected **When** checking line count and logging practices **Then** it is under 50 lines; `console.log()` is absent throughout the codebase; `console.error()` is the only stdout channel.

4. **Given** `.gitignore` is reviewed **When** checking excluded paths **Then** `src/generated/`, `resources/*.prev.json`, and `dist/` are all listed.

5. **Given** `tsconfig.json` is reviewed **When** checking configuration **Then** `"type": "module"`, `strict: true`, `paths: { "@generated/*": ["src/generated/*"] }`, `outDir: "dist/"` are all present and frozen.

## Tasks / Subtasks

- [x] Initialize MCP server scaffold (AC: 1, 2)
  - [x] Run `npx @modelcontextprotocol/create-typescript-server operaton-mcp` in a **temp dir outside the repo** and merge output into the repo root — do NOT run inside existing repo root
  - [x] Add `@modelcontextprotocol/sdk ^1.27.1` to `dependencies` if not already present from scaffold
  - [x] Add `tsc-alias` to `devDependencies`
- [x] Configure `package.json` (AC: 2)
  - [x] Set `"type": "module"` for ESM
  - [x] Add `"prepare": "npm run generate && tsc && tsc-alias"` script (generation before compile, alias rewrite after)
  - [x] Add `"build": "npm run generate && tsc && tsc-alias"` script
  - [x] Add `"bin": { "operaton-mcp": "./dist/index.js" }` entry
  - [x] Add `"files": ["dist/", "README.md"]` to exclude src/test/scripts/config/resources from npm package
  - [x] Node.js 22 LTS engine constraint: `"engines": { "node": ">=22" }`
- [x] Configure `tsconfig.json` (AC: 5)
  - [x] Set `"strict": true` — frozen, never disable individual flags
  - [x] Set `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`
  - [x] Set `"outDir": "dist/"`
  - [x] Add `"paths": { "@generated/*": ["src/generated/*"] }` path alias
  - [x] Set `"target": "ES2022"` or later
- [x] Configure `src/index.ts` entry point (AC: 3)
  - [x] Add `#!/usr/bin/env node` shebang as first line
  - [x] Keep file under 50 lines
  - [x] Use `console.error()` exclusively — `console.log()` is FORBIDDEN (corrupts JSON-RPC stdio stream)
  - [x] Stub out `registerAllTools` call (can be no-op barrel until Story 1.4 generates real code)
- [x] Configure `.gitignore` (AC: 4)
  - [x] Add `src/generated/` — build artifact, never committed
  - [x] Add `resources/*.prev.json` — spec diff convenience file
  - [x] Add `dist/` — compiled output (included in npm via `files` field, not in git)
- [x] Create `vitest.config.ts` for test framework setup
  - [x] Configure test file patterns for `test/unit/**`, `test/smoke/**`, `test/integration/**`
  - [x] Integration tests should be skipped by default when `OPERATON_BASE_URL` is unset
- [x] Create placeholder directory structure (AC: 2)
  - [x] `src/http/` (empty placeholder for Story 1.3)
  - [x] `src/tools/` (empty; hand-written wrappers added per domain story)
  - [x] `config/` directory for manifests (Story 1.4)
  - [x] `resources/` with `operaton-rest-api.json` OpenAPI spec
  - [x] `scripts/` for `generate.ts` (Story 1.4)
  - [x] `test/unit/`, `test/smoke/`, `test/integration/` directories
- [x] Verify cold-start works (AC: 1)
  - [x] `npm install` → `prepare` runs without errors
  - [x] `npm run build` completes with `dist/index.js` present

## Dev Notes

### Critical Architecture Rules

- **Scaffold initialization:** Run `npx @modelcontextprotocol/create-typescript-server operaton-mcp` in a TEMP DIRECTORY outside the repo, then merge relevant files. Running inside repo root causes conflicts with existing `.git` and config files.
- **`console.log()` is FORBIDDEN** throughout the entire codebase — it corrupts the JSON-RPC stdio stream that MCP clients rely on. Only `console.error()` is permitted for logging.
- **Log format:** `[operaton-mcp] {level}: {message}` — all log messages must follow this pattern.
- **`src/generated/` must be gitignored** — it is a build artifact. The `prepare` script ensures cold-start contributors get it after `npm install`.
- **TypeScript strict settings are FROZEN** — no story may disable individual strict flags. Use type assertions with explanatory comments instead.
- **`.js` extension on all relative ESM imports:** `import { normalize } from './errors.js'` — required by Node.js ESM resolution. Path alias imports (`@generated/*`) are exempt.

### Key File Locations

- `src/index.ts` — entry point with shebang; must stay under 50 lines
- `tsconfig.json` — frozen strict config with `@generated/*` alias
- `package.json` — `prepare`, `build`, `bin`, `files` fields
- `.gitignore` — must include `src/generated/`, `resources/*.prev.json`, `dist/`
- `resources/operaton-rest-api.json` — authoritative OpenAPI 3.0.2 spec (never modify)

### `src/index.ts` Expected Structure

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { checkConnectivity } from "./http/client.js";
import { createOperatonClient } from "./http/client.js";
import { registerAllTools } from "@generated/index";

const config = loadConfig();
await checkConnectivity(config);
const client = createOperatonClient(config);
const server = new McpServer({ name: "operaton-mcp", version: "1.0.0" });
registerAllTools(server, client);
await server.connect(new StdioServerTransport());
```
(Stubs for config/client/registerAllTools are fine in this story; real implementations follow in 1.2–1.5)

### tsc-alias Setup

`tsc-alias` rewrites `@generated/*` → relative `dist/generated/*` paths in compiled output so Node.js ESM resolution works at runtime. Add to build script after `tsc`:
```json
"build": "npm run generate && tsc && tsc-alias"
```

### Testing Standards

- Framework: Vitest
- Test file locations mirror source: `test/unit/http/client.test.ts` for `src/http/client.ts`
- Smoke tests: `test/smoke/mcp-protocol.test.ts` (added in Story 1.5)
- Integration tests: `test/integration/` (skipped if `OPERATON_BASE_URL` unset)

### Project Structure Notes

This story creates the skeleton. `src/tools/` stays EMPTY — domain tool wrappers are added per story (Epics 2–8). `src/generated/` does not exist until Story 1.4 runs the generator. The `prepare` script references `npm run generate` which Story 1.4 will implement; for now it can be a stub that exits cleanly.

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules`
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 1.1`
- Additional requirements: `_bmad-output/planning-artifacts/epics.md#Additional Requirements`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `@modelcontextprotocol/create-typescript-server` package not found on npm; scaffold created manually following architecture spec.
- NodeNext ESM requires `.js` extension on imports; tsconfig paths configured as `"@generated/*.js": ["src/generated/*.ts"]` for tsc-alias compatibility.

### Completion Notes List

- Scaffold created manually (create-typescript-server package unavailable); all required files created per architecture spec.
- `package.json`: type=module, prepare/build scripts, bin entry, files field, engines node>=22.
- `tsconfig.json`: strict=true, NodeNext module, outDir=dist/, @generated path alias, baseUrl=. for alias resolution.
- `src/index.ts`: 13 lines with shebang, stubs for config/client/registerAllTools. No console.log anywhere.
- `.gitignore` updated with src/generated/, resources/*.prev.json, dist/.
- `vitest.config.ts` configured for unit/smoke/integration test patterns.
- Directory structure created: src/http/, src/tools/, src/generated/, config/, scripts/, test/{unit,smoke,integration}/.
- Unit tests added: config.test.ts (2 tests), http/errors.test.ts (6 tests). All 8 pass.
- `npm run build` produces dist/index.js with shebang. Full build chain works.

### File List

- package.json
- tsconfig.json
- vitest.config.ts
- .gitignore
- src/index.ts
- src/config.ts
- src/http/client.ts
- src/http/errors.ts
- src/generated/index.ts
- scripts/generate.ts
- test/unit/config.test.ts
- test/unit/http/errors.test.ts
