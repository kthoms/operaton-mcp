# Story 1.3: HTTP Client Factory & Error Normalization

Status: ready-for-dev

## Story

As a developer implementing Operaton tool handlers,
I want a typed HTTP client factory that injects Basic Auth and engine name automatically, and a normalize function that maps Operaton errors to structured MCP error responses,
so that all tool handlers are protected from raw HTTP concerns and no silent failures are possible.

## Acceptance Criteria

1. **Given** `createOperatonClient(config)` is called with valid config **When** the client makes an HTTP request **Then** every request includes a `Basic {base64}` Authorization header derived from `OPERATON_USERNAME` and `OPERATON_PASSWORD`; the engine name is resolved into the path at call time, not hardcoded.

2. **Given** Operaton returns a 4xx or 5xx response with a JSON body containing a `type` field matching a known entry in the error map **When** `normalize(response)` is called **Then** it returns `{ isError: true, content: [{ type: "text", text: "[{errorType}] {message} — Suggested action: {hint}" }] }` with the BPM-domain hint for that error type.

3. **Given** Operaton returns an error with an unrecognized `type` value **When** `normalize(response)` is called **Then** the fallback (`__unknown__`) path is used; the raw Operaton body is preserved in the error text.

4. **Given** raw `fetch()` is searched across all source files **When** checking the codebase **Then** no direct `fetch()` calls exist outside `src/http/client.ts`.

5. **Given** unit tests are run for `src/http/client.ts` and `src/http/errors.ts` **When** `npm test` executes **Then** all unit tests pass covering: auth header construction, engine name injection, known error type mapping (≥3 types), unknown error fallback.

## Tasks / Subtasks

- [ ] Complete `src/http/client.ts` — HTTP client factory (AC: 1, 4)
  - [ ] Define `OperatonClient` type with typed HTTP methods: `get`, `post`, `put`, `delete`
  - [ ] Implement `createOperatonClient(config: Config): OperatonClient` factory
  - [ ] Inject `Authorization: Basic {base64(username:password)}` on every request
  - [ ] Resolve engine name into path at call time: paths contain `{engineName}` template; replace before calling
  - [ ] All HTTP through Node.js 22 built-in `fetch` — ONLY in this file
  - [ ] Return parsed JSON response body on success
  - [ ] On non-2xx: parse Operaton error body and call `normalize()` from `errors.ts`
  - [ ] Never retry in MVP
- [ ] Create `src/http/errors.ts` — error normalization (AC: 2, 3)
  - [ ] Define static error map: `Record<string, { hint: string }>` keyed by Operaton `type` string
  - [ ] Include at minimum these BPM-domain entries:
    - `"ProcessEngineException"` → hint about process engine state
    - `"InvalidRequestException"` → hint about request parameter validation
    - `"AuthorizationException"` → hint about permissions/credentials
    - `"NotFoundException"` → hint about checking IDs
    - `"TaskAlreadyClaimedException"` → hint about unclaiming first
    - `"__unknown__"` → fallback preserving raw Operaton body
  - [ ] Implement `normalize(errorBody: unknown): McpToolError` function
  - [ ] Lookup `errorBody.type` in map; if not found use `__unknown__` fallback
  - [ ] Output format: `[{errorType}] {message} — Suggested action: {hint}`
  - [ ] `McpToolError` shape: `{ isError: true, content: [{ type: "text", text: string }] }`
- [ ] Write unit tests `test/unit/http/client.test.ts` (AC: 5)
  - [ ] Test auth header: base64 encode `username:password` correctly
  - [ ] Test engine name injection: `{engineName}` in path replaced with config value
  - [ ] Test successful response: returns parsed JSON
  - [ ] Test 4xx response: calls normalize, returns structured error
  - [ ] Mock `fetch` using `vi.stubGlobal('fetch', mockFetch)` or undici MockAgent
- [ ] Write unit tests `test/unit/http/errors.test.ts` (AC: 5)
  - [ ] Test: known error type `"ProcessEngineException"` → correct hint in output
  - [ ] Test: known error type `"NotFoundException"` → correct hint
  - [ ] Test: known error type `"AuthorizationException"` → correct hint
  - [ ] Test: unknown type → `__unknown__` fallback, raw body preserved
  - [ ] Test: missing `type` field → `__unknown__` fallback

## Dev Notes

### Critical Architecture Rules

- **ALL HTTP goes through `createOperatonClient`** — raw `fetch()` is NEVER called in tool handlers, `src/index.ts`, or anywhere outside `src/http/client.ts`. This is an architectural hard rule.
- **Engine name is resolved at call time** — path templates use `{engineName}` placeholder (matching Operaton REST API path patterns); the client replaces this before the actual HTTP call. Never hardcode `"default"` in handler files.
- **`console.log()` FORBIDDEN** — only `console.error()` with `[operaton-mcp]` prefix.
- **No retry in MVP** — no backoff or retry logic to be added here.
- **Auth header format:** `Authorization: Basic {btoa(username + ':' + password)}`

### OperatonClient Interface

```typescript
// src/http/client.ts
export interface OperatonClient {
  get(path: string): Promise<unknown>;
  post(path: string, body?: unknown): Promise<unknown>;
  put(path: string, body?: unknown): Promise<unknown>;
  delete(path: string): Promise<unknown>;
}
```

### Error Response Shape

```typescript
// What generated tool handlers return on error:
return {
  isError: true,
  content: [{ type: "text", text: `[${errorType}] ${message} — Suggested action: ${hint}` }]
};
```

### Path Template Convention

Operaton REST API paths include engine name: `/engine/{engineName}/process-definition`. The client factory must resolve this template. Store the engine name from config and replace `{engineName}` in every path string before the fetch call.

### Key File Locations

- `src/http/client.ts` — `createOperatonClient`, `checkConnectivity`, `OperatonClient` type
- `src/http/errors.ts` — static error map, `normalize()` function, `McpToolError` type
- `test/unit/http/client.test.ts` — unit tests mirroring client.ts
- `test/unit/http/errors.test.ts` — unit tests mirroring errors.ts

### Import Convention

All relative imports in `src/` must use `.js` extension (ESM requirement):
```typescript
import { normalize } from './errors.js';
import { Config } from '../config.js';
```

### Project Structure Notes

This story completes the HTTP infrastructure that all domain epics (2–8) depend on. The `OperatonClient` type exported here is passed as a parameter to every generated tool handler. No domain-specific logic goes here — this is pure infrastructure.

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#Authentication & Security`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Format Patterns`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Testing Patterns`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines`
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 1.3`
- Additional requirements: `_bmad-output/planning-artifacts/epics.md#Additional Requirements`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
