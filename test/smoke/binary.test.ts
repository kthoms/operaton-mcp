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

import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { join } from "node:path";

const ROOT = join(new URL(import.meta.url).pathname, "../../..");
const BINARY = join(ROOT, "dist/index.js");

const MCP_INITIALIZE_REQUEST = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" },
  },
}) + "\n";

describe("binary smoke test", () => {
  it("responds to MCP initialize handshake", async () => {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("node", [BINARY], {
        env: {
          ...process.env,
          OPERATON_SKIP_HEALTH_CHECK: "true",
          OPERATON_BASE_URL: "http://localhost:8080/engine-rest",
          OPERATON_USERNAME: "demo",
          OPERATON_PASSWORD: "demo",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let resolved = false;

      proc.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
        // Check for a valid JSON-RPC response
        const lines = stdout.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          try {
            const msg = JSON.parse(line) as {
              jsonrpc?: string;
              id?: number;
              result?: { serverInfo?: unknown; capabilities?: unknown };
            };
            if (msg.jsonrpc === "2.0" && msg.id === 1 && msg.result) {
              if (!resolved) {
                resolved = true;
                proc.kill();
                // Verify required fields
                expect(msg.result).toHaveProperty("serverInfo");
                expect(msg.result).toHaveProperty("capabilities");
                resolve();
              }
            }
          } catch {
            // not JSON yet, keep reading
          }
        }
      });

      proc.stderr.on("data", () => {
        // ignore stderr (connectivity warnings, etc.)
      });

      proc.on("error", reject);
      proc.on("close", (code) => {
        if (!resolved) {
          reject(new Error(`Process exited with code ${code ?? "unknown"} without responding`));
        }
      });

      // Send initialize request
      proc.stdin.write(MCP_INITIALIZE_REQUEST);

      // Timeout after 5 seconds
      const timeout = setTimeout(() => {
        if (!resolved) {
          proc.kill();
          reject(new Error("Timeout: no MCP initialize response received"));
        }
      }, 5000);
      timeout.unref();
    });
  });
});
