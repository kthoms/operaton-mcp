# Story 1.1: Project Scaffold & TypeScript Configuration

Status: ready-for-dev

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

- [ ] Initialize MCP server scaffold (AC: 1, 2)
  - [ ] Run `npx @modelcontextprotocol/create-typescript-server operaton-mcp` in a **temp dir outside the repo** and merge output into the repo root — do NOT run inside existing repo root
  - [ ] Add `@modelcontextprotocol/sdk ^1.27.1` to `dependencies` if not already present from scaffold
  - [ ] Add `tsc-alias` to `devDependencies`
- [ ] Configure `package.json` (AC: 2)
  - [ ] Set `"type": "module"` for ESM
  - [ ] Add `"prepare": "npm run generate && tsc && tsc-alias"` script (generation before compile, alias rewrite after)
  - [ ] Add `"build": "npm run generate && tsc && tsc-alias"` script
  - [ ] Add `"bin": { "operaton-mcp": "./dist/index.js" }` entry
  - [ ] Add `"files": ["dist/", "README.md"]` to exclude src/test/scripts/config/resources from npm package
  - [ ] Node.js 22 LTS engine constraint: `"engines": { "node": ">=22" }`
- [ ] Configure `tsconfig.json` (AC: 5)
  - [ ] Set `"strict": true` — frozen, never disable individual flags
  - [ ] Set `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`
  - [ ] Set `"outDir": "dist/"`
  - [ ] Add `"paths": { "@generated/*": ["src/generated/*"] }` path alias
  - [ ] Set `"target": "ES2022"` or later
- [ ] Configure `src/index.ts` entry point (AC: 3)
  - [ ] Add `#!/usr/bin/env node` shebang as first line
  - [ ] Keep file under 50 lines
  - [ ] Use `console.error()` exclusively — `console.log()` is FORBIDDEN (corrupts JSON-RPC stdio stream)
  - [ ] Stub out `registerAllTools` call (can be no-op barrel until Story 1.4 generates real code)
- [ ] Configure `.gitignore` (AC: 4)
  - [ ] Add `src/generated/` — build artifact, never committed
  - [ ] Add `resources/*.prev.json` — spec diff convenience file
  - [ ] Add `dist/` — compiled output (included in npm via `files` field, not in git)
- [ ] Create `vitest.config.ts` for test framework setup
  - [ ] Configure test file patterns for `test/unit/**`, `test/smoke/**`, `test/integration/**`
  - [ ] Integration tests should be skipped by default when `OPERATON_BASE_URL` is unset
- [ ] Create placeholder directory structure (AC: 2)
  - [ ] `src/http/` (empty placeholder for Story 1.3)
  - [ ] `src/tools/` (empty; hand-written wrappers added per domain story)
  - [ ] `config/` directory for manifests (Story 1.4)
  - [ ] `resources/` with `operaton-rest-api.json` OpenAPI spec
  - [ ] `scripts/` for `generate.ts` (Story 1.4)
  - [ ] `test/unit/`, `test/smoke/`, `test/integration/` directories
- [ ] Verify cold-start works (AC: 1)
  - [ ] `npm install` → `prepare` runs without errors
  - [ ] `npm run build` completes with `dist/index.js` present

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

### Completion Notes List

### File List
