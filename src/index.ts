#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { checkConnectivity, createOperatonClient } from "./http/client.js";
import { registerAllTools } from "@generated/index.js";

const config = loadConfig();
await checkConnectivity(config);
const client = createOperatonClient(config);
const server = new McpServer({ name: "operaton-mcp", version: "1.0.0" });
registerAllTools(server, client);
await server.connect(new StdioServerTransport());
