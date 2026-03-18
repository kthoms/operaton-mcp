// Copyright Operaton contributors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at:
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { loadConfig } from "../../src/config.js";
import { createOperatonClient } from "../../src/http/client.js";
import { registerAllTools } from "../../src/generated/index.js";

describe("MCP Protocol Smoke", () => {
  let client: Client;

  beforeAll(async () => {
    // Set required env vars for config loading
    process.env["OPERATON_BASE_URL"] = "http://localhost:8080/engine-rest";
    process.env["OPERATON_USERNAME"] = "admin";
    process.env["OPERATON_PASSWORD"] = "admin";
    process.env["OPERATON_SKIP_HEALTH_CHECK"] = "true";

    // Mock fetch to return empty array for any Operaton call
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const config = loadConfig();
    const operatonClient = createOperatonClient(config);

    const server = new McpServer({ name: "operaton-mcp", version: "1.0.0" });
    registerAllTools(server, operatonClient);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test-client", version: "1.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env["OPERATON_BASE_URL"];
    delete process.env["OPERATON_USERNAME"];
    delete process.env["OPERATON_PASSWORD"];
    delete process.env["OPERATON_SKIP_HEALTH_CHECK"];
  });

  it("tools/list returns at least 1 tool", async () => {
    const result = await client.listTools();
    expect(result.tools.length).toBeGreaterThanOrEqual(1);
    expect(result.tools[0]).toHaveProperty("name");
    expect(result.tools[0]).toHaveProperty("description");
  });

  it("tools/list includes processDefinition_list tool", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain("processDefinition_list");
  });

  it("tools/call with valid tool returns content", async () => {
    const result = await client.callTool({
      name: "processDefinition_list",
      arguments: {},
    });
    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty("type", "text");
  });

  it("tools/call with unknown tool returns isError: true", async () => {
    const result = await client.callTool({
      name: "nonExistentTool_xyz",
      arguments: {},
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]).toHaveProperty("type", "text");
    const text = (result.content[0] as { type: string; text: string }).text;
    expect(text).toContain("Unknown tool: nonExistentTool_xyz");
    expect(text).toContain("Available groups:");
  });
});
