# Story 1.6: CI Workflows & npm Publishing Configuration

Status: ready-for-dev

## Story

As a contributor to operaton-mcp,
I want CI that runs automatically on every push and a complete npm publishing configuration,
so that quality is enforced continuously and the package is installable via `npx operaton-mcp`.

## Acceptance Criteria

1. **Given** a push is made to any branch or PR **When** `.github/workflows/ci.yml` runs **Then** it executes build + unit tests + smoke test; no secrets are required; the workflow completes without a live Operaton instance.

2. **Given** a push is made to the `main` branch **When** `.github/workflows/integration.yml` triggers **Then** integration tests run using the `OPERATON_BASE_URL` repository secret; the workflow does not trigger on fork PRs.

3. **Given** `package.json` is reviewed **When** checking the `bin`, `files`, and `scripts` fields **Then** `"bin": { "operaton-mcp": "./dist/index.js" }` is present; `"files": ["dist/", "README.md"]` excludes `src/`, `test/`, `scripts/`, `config/`, `resources/`; `"prepare"` script runs `npm run generate`.

4. **Given** `README.md` is reviewed **When** checking section coverage **Then** all 5 required sections are present: Install & Run, Environment Variables (5-var table with `OPERATON_SKIP_HEALTH_CHECK` dev/test note), MCP Client Configuration (Claude Desktop example), Available Tool Groups, Development.

5. **Given** an automated test invokes the `npx operaton-mcp` binary as a child process with `OPERATON_SKIP_HEALTH_CHECK=true` and valid env vars **When** the binary executes and an MCP `initialize` handshake is sent **Then** the server responds with a valid MCP `initialize` response and does not exit; this test is included in the CI smoke suite and requires no live Operaton instance.

## Tasks / Subtasks

- [ ] Create `.github/workflows/ci.yml` (AC: 1)
  - [ ] Triggers: `push` (all branches) + `pull_request`
  - [ ] Job: `build-and-test`
  - [ ] Steps: checkout → `node 22` setup → `npm ci` → `npm run build` → `npm test`
  - [ ] No secrets required — `OPERATON_SKIP_HEALTH_CHECK=true` env var set in workflow
  - [ ] Must pass on every PR without live Operaton
- [ ] Create `.github/workflows/integration.yml` (AC: 2)
  - [ ] Triggers: `push` to `main` branch only; NOT on pull requests; NOT on fork PRs
  - [ ] Job: `integration-tests`
  - [ ] Steps: checkout → node 22 → `npm ci` → `npm run build` → `npm run test:integration`
  - [ ] Uses `secrets.OPERATON_BASE_URL`, `secrets.OPERATON_USERNAME`, `secrets.OPERATON_PASSWORD`
  - [ ] Add `if: github.event_name == 'push' && github.repository == github.event.repository.full_name` to prevent fork execution
- [ ] Finalize `package.json` publishing configuration (AC: 3)
  - [ ] `"bin": { "operaton-mcp": "./dist/index.js" }` — enables `npx operaton-mcp`
  - [ ] `"files": ["dist/", "README.md"]` — excludes src/, test/, scripts/, config/, resources/
  - [ ] `"prepare": "npm run generate && tsc && tsc-alias"` — cold-start on `npm install`
  - [ ] `"test": "vitest run"` — unit + smoke
  - [ ] `"test:integration": "vitest run test/integration"` — integration suite (needs OPERATON_BASE_URL)
  - [ ] `"name": "operaton-mcp"`, `"version"`, `"description"`, `"license"`, `"repository"` fields complete
  - [ ] `"engines": { "node": ">=22" }`
- [ ] Create `README.md` with 5 required sections (AC: 4)
  - [ ] **Install & Run** — `npx operaton-mcp` usage + claude_desktop_config.json snippet
  - [ ] **Environment Variables** — table with all 5 vars: OPERATON_BASE_URL, OPERATON_USERNAME, OPERATON_PASSWORD, OPERATON_ENGINE (default: default), OPERATON_SKIP_HEALTH_CHECK (dev/test note)
  - [ ] **MCP Client Configuration** — Claude Desktop `claude_desktop_config.json` example with `env` block
  - [ ] **Available Tool Groups** — list of domain groups (processDefinition, processInstance, task, job, jobDefinition, incident, user, group, history, decision, decisionRequirements)
  - [ ] **Development** — `npm run generate`, `npm run build`, `npm run dev`, `npm test`, integration test instructions
- [ ] Add binary launch smoke test (AC: 5)
  - [ ] In `test/smoke/mcp-protocol.test.ts` or a new `test/smoke/binary.test.ts`
  - [ ] Spawn `node dist/index.js` as child process with `OPERATON_SKIP_HEALTH_CHECK=true` + stub env vars
  - [ ] Send MCP `initialize` request over stdio JSON-RPC
  - [ ] Assert server responds with valid `initialize` response (contains `serverInfo`, `capabilities`)
  - [ ] Assert server does not exit after handshake
  - [ ] This test runs as part of `npm test` (no secrets needed)
- [ ] Add `npm run test:integration` script
  - [ ] Skips gracefully if `OPERATON_BASE_URL` is not set (Vitest's `skipIf` or environment guard)

## Dev Notes

### Critical Architecture Rules

- **CI workflow must NOT require secrets** — the main CI workflow (`ci.yml`) runs on all branches and PRs, including from forks. No credentials in CI.
- **Integration workflow is push-to-main only** — prevents accidental secret exposure on fork PRs.
- **`prepare` script ensures cold-start for contributors** — anyone who clones the repo and runs `npm install` gets a working build without manual steps.
- **`dist/` is gitignored but included in npm package** — `"files": ["dist/"]` in package.json overrides `.gitignore` for npm publish. This is intentional.
- **`files` field excludes development artifacts** — `src/`, `test/`, `scripts/`, `config/`, `resources/` are not shipped in the npm package. Only `dist/` and `README.md`.

### CI Workflow Structure

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: ['**']
  pull_request:
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    env:
      OPERATON_SKIP_HEALTH_CHECK: 'true'
      OPERATON_BASE_URL: 'http://localhost:8080'  # stub value for config validation
      OPERATON_USERNAME: 'demo'
      OPERATON_PASSWORD: 'demo'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run build
      - run: npm test
```

### Integration Workflow Trigger Guard

```yaml
# .github/workflows/integration.yml
on:
  push:
    branches: ['main']
jobs:
  integration-tests:
    if: github.event_name == 'push' && github.repository == github.event.repository.full_name
    ...
    env:
      OPERATON_BASE_URL: ${{ secrets.OPERATON_BASE_URL }}
      OPERATON_USERNAME: ${{ secrets.OPERATON_USERNAME }}
      OPERATON_PASSWORD: ${{ secrets.OPERATON_PASSWORD }}
```

### Binary Spawn Test Pattern

```typescript
import { spawn } from 'node:child_process';

it('npx binary responds to MCP initialize', async () => {
  const proc = spawn('node', ['dist/index.js'], {
    env: { ...process.env, OPERATON_SKIP_HEALTH_CHECK: 'true', OPERATON_BASE_URL: 'http://localhost:8080', OPERATON_USERNAME: 'u', OPERATON_PASSWORD: 'p' }
  });
  // Send MCP initialize request over stdin, read response from stdout
  // Assert valid initialize response
});
```

### README Environment Variables Table

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPERATON_BASE_URL` | Yes | — | Operaton REST API base URL (e.g. `http://localhost:8080/engine-rest`) |
| `OPERATON_USERNAME` | Yes | — | Operaton user for Basic Auth |
| `OPERATON_PASSWORD` | Yes | — | Operaton password for Basic Auth |
| `OPERATON_ENGINE` | No | `default` | Operaton engine name |
| `OPERATON_SKIP_HEALTH_CHECK` | No | `false` | Skip startup connectivity check (set `true` for dev/test) |

### Key File Locations

- `.github/workflows/ci.yml` — runs on every push, no secrets
- `.github/workflows/integration.yml` — push to main only, uses secrets
- `package.json` — bin, files, prepare, scripts
- `README.md` — 5 required sections

### Project Structure Notes

This story completes Epic 1. After this, the full development infrastructure is in place. Epic 2+ stories add domain tools by populating the manifest and extending integration tests.

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Testing Strategy`
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 1.6`
- Additional requirements: `_bmad-output/planning-artifacts/epics.md#Additional Requirements` (CI spec)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
