# Story 1.2: Configuration Module & Startup Validation

Status: ready-for-dev

## Story

As an engineer setting up operaton-mcp,
I want the server to fail fast with a clear diagnostic when required environment variables are missing, and warn clearly when Operaton is unreachable,
so that misconfiguration is immediately actionable without inspecting source code.

## Acceptance Criteria

1. **Given** `OPERATON_BASE_URL` is missing from the environment **When** the server starts **Then** it exits with `[operaton-mcp] Missing required env var: OPERATON_BASE_URL` and a non-zero exit code.

2. **Given** all required env vars are set but `OPERATON_BASE_URL` points to an unreachable host **When** the server starts **Then** it logs `[operaton-mcp] Warning: Cannot reach Operaton at {url}. Verify with: curl -u $OPERATON_USERNAME:$OPERATON_PASSWORD $OPERATON_BASE_URL/engine` and continues without exiting.

3. **Given** `OPERATON_SKIP_HEALTH_CHECK=true` is set **When** the server starts **Then** the connectivity check is skipped entirely; no warning is logged.

4. **Given** `OPERATON_ENGINE` is not set **When** `loadConfig()` is called **Then** the engine name defaults to `"default"`.

5. **Given** `src/config.ts` is reviewed **When** checking for `process.env` usage **Then** `src/config.ts` is the only file that reads `process.env`; all other modules receive config as parameters.

## Tasks / Subtasks

- [ ] Create `src/config.ts` as the sole `process.env` reader (AC: 5)
  - [ ] Define `Config` interface/type with all env var fields
  - [ ] Export `loadConfig(): Config` function
  - [ ] Required vars: `OPERATON_BASE_URL`, `OPERATON_USERNAME`, `OPERATON_PASSWORD`
  - [ ] Optional vars: `OPERATON_ENGINE` (default `"default"`), `OPERATON_SKIP_HEALTH_CHECK` (default `false`)
  - [ ] Fail-fast on missing required vars: `console.error('[operaton-mcp] Missing required env var: {VAR_NAME}')` then `process.exit(1)`
  - [ ] Check ALL required vars before exiting — report first missing one found
- [ ] Implement connectivity check in `src/http/client.ts` (AC: 2, 3)
  - [ ] Export `checkConnectivity(config: Config): Promise<void>` function
  - [ ] Calls `GET {OPERATON_BASE_URL}/engine` with Basic Auth header
  - [ ] On failure (network error or non-2xx): log warning with curl diagnostic and return (do NOT exit)
  - [ ] Skip entirely if `config.skipHealthCheck === true`
  - [ ] Warning message format exactly: `[operaton-mcp] Warning: Cannot reach Operaton at {url}. Verify with: curl -u $OPERATON_USERNAME:$OPERATON_PASSWORD $OPERATON_BASE_URL/engine`
- [ ] Wire `loadConfig()` and `checkConnectivity()` into `src/index.ts` (AC: 1, 2, 3)
  - [ ] Call `loadConfig()` first — any config failure exits before doing anything else
  - [ ] Call `await checkConnectivity(config)` after config loaded
  - [ ] Keep `src/index.ts` under 50 lines
- [ ] Write unit tests for `src/config.ts`
  - [ ] Test: missing `OPERATON_BASE_URL` → process.exit(1) called with error message
  - [ ] Test: missing `OPERATON_USERNAME` → process.exit(1) with correct message
  - [ ] Test: all vars set → returns Config with correct values
  - [ ] Test: `OPERATON_ENGINE` unset → defaults to `"default"`
  - [ ] Test: `OPERATON_SKIP_HEALTH_CHECK=true` → `skipHealthCheck: true` in config
  - [ ] Use `vi.spyOn(process, 'exit')` to assert exit behavior without actually exiting test process

## Dev Notes

### Critical Architecture Rules

- **`src/config.ts` is the ONLY file that reads `process.env`** — all other modules receive config as typed parameters. This is an architectural invariant enforced by the architecture document.
- **Fail-fast for config errors:** `process.exit(1)` immediately on missing required vars.
- **Warn-and-continue for connectivity failures** — the server must start even if Operaton is temporarily unreachable; it serves tools/list and can attempt calls when they come in.
- **Log format is exact:** `[operaton-mcp] {level}: {message}` — always prefix with `[operaton-mcp]`.
- **`console.log()` is FORBIDDEN** — only `console.error()` for all logging including warnings.

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPERATON_BASE_URL` | Yes | — | Base URL of Operaton REST API, e.g. `http://localhost:8080/engine-rest` |
| `OPERATON_USERNAME` | Yes | — | Basic Auth username |
| `OPERATON_PASSWORD` | Yes | — | Basic Auth password |
| `OPERATON_ENGINE` | No | `"default"` | Operaton engine name used in path templates |
| `OPERATON_SKIP_HEALTH_CHECK` | No | `false` | Set to `"true"` to skip startup connectivity check (used in tests/CI) |

### Config Interface

```typescript
// src/config.ts
export interface Config {
  baseUrl: string;
  username: string;
  password: string;
  engineName: string;
  skipHealthCheck: boolean;
}

export function loadConfig(): Config {
  // Only file allowed to read process.env
}
```

### Connectivity Check Behavior

The check calls `GET {baseUrl}/engine` — the Operaton engine list endpoint. A successful 2xx response means Operaton is reachable. Any error (DNS failure, connection refused, timeout, non-2xx) triggers the warning. The server continues in all cases.

### Unit Test Pattern for process.exit

```typescript
import { vi, describe, it, expect, afterEach } from 'vitest';

const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });
// Restore in afterEach
```

### Key File Locations

- `src/config.ts` — sole `process.env` reader; exports `loadConfig()` + `Config` type
- `src/http/client.ts` — exports `checkConnectivity()` and `createOperatonClient()` (client factory in Story 1.3)
- `src/index.ts` — calls `loadConfig()` then `checkConnectivity()`, stays under 50 lines

### Project Structure Notes

`checkConnectivity` lives in `src/http/client.ts` (not `src/config.ts`) because it makes an HTTP call and depends on auth config. The config module only reads and validates env vars — it has no I/O other than `console.error()` and `process.exit()`.

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#Authentication & Security`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Format Patterns` (log message formats)
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines`
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 1.2`
- Additional requirements: `_bmad-output/planning-artifacts/epics.md#Additional Requirements` (env var list)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
