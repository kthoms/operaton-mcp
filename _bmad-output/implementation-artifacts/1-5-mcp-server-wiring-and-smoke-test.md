# Story 1.5: MCP Server Wiring & Smoke Test

Status: ready-for-dev

## Story

As an MCP client user,
I want the server to respond to `tools/list` with registered tools and handle `tools/call` round-trips correctly — including a structured error for unknown tool names,
so that I can confirm the server is working and LLMs can self-correct when they call an unknown tool.

## Acceptance Criteria

1. **Given** the MCP server starts with `OPERATON_SKIP_HEALTH_CHECK=true` **When** `tools/list` is called **Then** at least 1 tool is returned (fixture manifest operations); the response conforms to MCP protocol.

2. **Given** `tools/call` is invoked with a tool name from the fixture manifest and a fetch-level mock returns a minimal valid Operaton response **When** the call completes **Then** the response contains `content: [{ type: "text", text: <JSON string> }]` and `isError` is absent or `false`.

3. **Given** `tools/call` is invoked with a tool name that does not exist in the manifest **When** the call completes **Then** the response contains `isError: true` and the text matches `"Unknown tool: {name}. Available groups: {groupList}"`.

4. **Given** `src/index.ts` is reviewed after wiring **When** checking line count and tool registration pattern **Then** `src/index.ts` is under 50 lines; tool registration is solely via `registerAllTools(server, client)` — no individual `server.tool()` calls in the entry point.

5. **Given** `npm test` is run **When** the smoke test suite executes **Then** `test/smoke/mcp-protocol.test.ts` passes: `tools/list` count ≥ 1 and `tools/call` round-trip succeeds with fetch mock.

## Tasks / Subtasks

- [ ] Complete `src/index.ts` MCP server wiring (AC: 4)
  - [ ] Shebang: `#!/usr/bin/env node` as first line
  - [ ] Import sequence: config → http client → generated index → MCP SDK
  - [ ] Call `loadConfig()` → `checkConnectivity(config)` → `createOperatonClient(config)` → `new McpServer(...)` → `registerAllTools(server, client)` → `server.connect(new StdioServerTransport())`
  - [ ] File MUST stay under 50 lines — no per-tool `server.tool()` calls
  - [ ] `console.log()` FORBIDDEN — only `console.error()` with `[operaton-mcp]` prefix
- [ ] Implement unknown tool handler in `src/generated/index.ts` (AC: 3)
  - [ ] `registerAllTools` must include a fallback dispatch that returns structured error for unknown tool names
  - [ ] Error format: `"Unknown tool: {name}. Available groups: processDefinition, task, incident, ..."`
  - [ ] The group list should be dynamic — derived from actual registered groups, not hardcoded
  - [ ] Returns: `{ isError: true, content: [{ type: "text", text: "Unknown tool: ..." }] }`
- [ ] Create `test/smoke/mcp-protocol.test.ts` (AC: 1, 2, 5)
  - [ ] Set `OPERATON_SKIP_HEALTH_CHECK=true` environment for test
  - [ ] Mock `fetch` at the global level (undici MockAgent or `vi.stubGlobal('fetch', ...)`)
  - [ ] Test 1: `tools/list` returns array with length ≥ 1; each tool has `name` and `description`
  - [ ] Test 2: `tools/call` with a valid fixture tool name and mocked Operaton response → `content[0].type === "text"` and `isError` is falsy
  - [ ] Test 3: `tools/call` with unknown tool name → `isError: true`, text contains `"Unknown tool:"`
  - [ ] Use `child_process` to spawn the server binary OR use the MCP SDK's in-process test client
  - [ ] Smoke test does NOT require live Operaton instance
- [ ] Verify `registerAllTools` export from generated barrel (AC: 1)
  - [ ] `src/generated/index.ts` exports `registerAllTools(server: McpServer, client: OperatonClient): void`
  - [ ] Called once in `src/index.ts` — registers all tools from fixture manifest
- [ ] Add `npm test` script (AC: 5)
  - [ ] `"test": "vitest run"` in package.json
  - [ ] Smoke tests run without live Operaton: no `OPERATON_BASE_URL` needed

## Dev Notes

### Critical Architecture Rules

- **`src/index.ts` must stay under 50 lines** — all tool registration goes through `registerAllTools(server, client)` from `@generated/index`. Individual `server.tool()` calls in `src/index.ts` are an anti-pattern.
- **Unknown tool error text must be exact format:** `"Unknown tool: {name}. Available groups: processDefinition, task, ..."` — enables LLM self-correction.
- **Smoke test mocks fetch at the HTTP level** — it does NOT mock the OperatonClient directly. This tests the full MCP protocol framing end-to-end.
- **`OPERATON_SKIP_HEALTH_CHECK=true` required in smoke tests** — the connectivity check would fail without a live Operaton instance.

### `src/index.ts` Final Form

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { checkConnectivity, createOperatonClient } from "./http/client.js";
import { registerAllTools } from "@generated/index";

const config = loadConfig();
await checkConnectivity(config);
const client = createOperatonClient(config);
const server = new McpServer({ name: "operaton-mcp", version: "1.0.0" });
registerAllTools(server, client);
await server.connect(new StdioServerTransport());
```
(~15 lines including imports — well under the 50-line limit)

### Unknown Tool Handler Pattern

```typescript
// In src/generated/index.ts (generated by scripts/generate.ts)
export function registerAllTools(server: McpServer, client: OperatonClient): void {
  const registeredGroups = ['processDefinition', 'task', 'incident']; // dynamic list

  // Register all known tools...
  server.tool('processDefinition_list', ..., async (input) => processDefinition_list(input, client));

  // Unknown tool fallback
  server.setRequestHandler('tools/call', async (req) => {
    if (!knownTools.has(req.params.name)) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Unknown tool: ${req.params.name}. Available groups: ${registeredGroups.join(', ')}` }]
      };
    }
    // ... dispatch to known handler
  });
}
```
(Exact implementation depends on MCP SDK version; adapt to SDK's tool registration API)

### Smoke Test Pattern

```typescript
// test/smoke/mcp-protocol.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('MCP Protocol Smoke', () => {
  // Use MCP SDK in-process client for testing, OR spawn child_process
  it('tools/list returns at least 1 tool', async () => {
    const result = await client.listTools();
    expect(result.tools.length).toBeGreaterThanOrEqual(1);
  });

  it('tools/call with valid tool returns content', async () => {
    // fetch is mocked to return minimal valid Operaton response
    const result = await client.callTool({ name: 'processDefinition_list', arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].type).toBe('text');
  });

  it('tools/call with unknown tool returns isError: true', async () => {
    const result = await client.callTool({ name: 'nonExistentTool', arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/Unknown tool: nonExistentTool/);
  });
});
```

### Key File Locations

- `src/index.ts` — server entry point; must be under 50 lines
- `src/generated/index.ts` — `registerAllTools` + unknown tool fallback (generated)
- `test/smoke/mcp-protocol.test.ts` — smoke test suite

### Project Structure Notes

This story ties together all prior Epic 1 stories. The smoke test validates the full MCP protocol chain without a live Operaton instance — it is a CI gate for every push. The generated `registerAllTools` in Story 1.4 is the actual implementation; this story wires it into `src/index.ts` and validates it with the smoke suite.

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#MCP Tool Organization`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Client Initialization & Registration`
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Testing Strategy` (smoke test layer)
- Architecture: `_bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines`
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 1.5`
- Additional requirements: `_bmad-output/planning-artifacts/epics.md#Additional Requirements`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
