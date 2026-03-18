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

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { LICENSE_HEADER } from "./license-header.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// ── Types ───────────────────────────────────────────────────────────────────

interface OpenApiParameter {
  name: string;
  in: "path" | "query" | "body" | "header" | "formData";
  required?: boolean;
  schema?: { type?: string; format?: string; items?: { type?: string } };
  description?: string;
}

interface OpenApiOperation {
  operationId: string;
  parameters?: OpenApiParameter[];
  requestBody?: unknown;
  summary?: string;
  description?: string;
}

interface OpenApiSpec {
  paths: Record<string, Record<string, OpenApiOperation>>;
}

interface ManifestEntry {
  name: string;
  description: string;
  expose: boolean;
  tags: string[];
  frMapping?: string[];
  examples?: string[];
  parameterOverrides?: Record<string, string>;
}

interface SpecOperation {
  path: string;
  method: string;
  parameters: OpenApiParameter[];
  hasRequestBody: boolean;
}

// ── Step 1: Parse spec ───────────────────────────────────────────────────────

function parseSpec(specPath: string): Map<string, SpecOperation> {
  const spec = JSON.parse(readFileSync(specPath, "utf8")) as OpenApiSpec;
  const ops = new Map<string, SpecOperation>();

  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (!op.operationId) continue;
      ops.set(op.operationId, {
        path,
        method,
        parameters: (op.parameters ?? []).filter(
          (p) => p.in === "path" || p.in === "query",
        ),
        hasRequestBody: !!op.requestBody,
      });
    }
  }

  return ops;
}

// ── Step 2: Spec diff ────────────────────────────────────────────────────────

function specDiff(specPath: string): void {
  const prevPath = specPath.replace(".json", ".prev.json");
  if (existsSync(prevPath)) {
    const prev = JSON.parse(readFileSync(prevPath, "utf8")) as OpenApiSpec;
    const curr = JSON.parse(readFileSync(specPath, "utf8")) as OpenApiSpec;
    const prevOps = new Set<string>();
    const currOps = new Set<string>();
    for (const methods of Object.values(prev.paths ?? {}))
      for (const op of Object.values(methods))
        if (op.operationId) prevOps.add(op.operationId);
    for (const methods of Object.values(curr.paths ?? {}))
      for (const op of Object.values(methods))
        if (op.operationId) currOps.add(op.operationId);
    const added = [...currOps].filter((id) => !prevOps.has(id));
    const removed = [...prevOps].filter((id) => !currOps.has(id));
    if (added.length > 0)
      console.error(`[operaton-mcp] generate: spec added ${added.length} operations: ${added.join(", ")}`);
    if (removed.length > 0)
      console.error(`[operaton-mcp] generate: spec removed ${removed.length} operations: ${removed.join(", ")}`);
  }
  // Write .prev.json for next run
  const currContent = readFileSync(specPath, "utf8");
  writeFileSync(prevPath, currContent);
}

// ── Step 3: Load manifest ────────────────────────────────────────────────────

function loadManifest(configDir: string): Record<string, ManifestEntry> {
  const fullPath = join(configDir, "tool-manifest.json");
  const fixturePath = join(configDir, "tool-manifest.fixture.json");
  const manifestPath = existsSync(fullPath) ? fullPath : fixturePath;
  console.error(`[operaton-mcp] generate: using manifest ${manifestPath}`);
  return JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, ManifestEntry>;
}

// ── Property name helpers ─────────────────────────────────────────────────────

function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

/** Safe object literal key: quoting if name contains hyphens etc. */
function propKey(name: string): string {
  return isValidIdentifier(name) ? name : `"${name}"`;
}

/** Safe property accessor: dot notation or bracket notation. */
function propAccess(name: string): string {
  return isValidIdentifier(name) ? `.${name}` : `["${name}"]`;
}

// ── Zod type helper ──────────────────────────────────────────────────────────

function zodType(schema?: { type?: string; format?: string; items?: { type?: string } }): string {
  if (!schema) return "z.string().optional()";
  switch (schema.type) {
    case "integer":
    case "number":
      return "z.number().optional()";
    case "boolean":
      return "z.boolean().optional()";
    case "array":
      return `z.array(z.${schema.items?.type === "integer" ? "number" : "string"}()).optional()`;
    default:
      return "z.string().optional()";
  }
}

// ── Step 8: Emit files ───────────────────────────────────────────────────────

function emitOperationFile(
  outDir: string,
  operationId: string,
  entry: ManifestEntry,
  specOp: SpecOperation,
): void {
  const group = entry.tags[0] ?? "misc";
  const groupDir = join(outDir, group);
  mkdirSync(groupDir, { recursive: true });

  const params = specOp.parameters;
  const pathParams = params.filter((p) => p.in === "path");
  const queryParams = params.filter((p) => p.in === "query");

  const allParams = [...pathParams, ...queryParams];
  const schemaFields = allParams
    .map((p) => `  ${propKey(p.name)}: ${zodType(p.schema)},`)
    .join("\n");

  const method = specOp.method.toLowerCase();
  const hasBody = specOp.hasRequestBody && method !== "get" && method !== "delete";
  const pathTemplate = specOp.path.replace(
    /{([^}]+)}/g,
    (_, name: string) => `\${validated${propAccess(name)}}`,
  );
  const clientCall =
    method === "get" || method === "delete"
      ? `client.${method}(\`/engine/{engineName}${pathTemplate}${queryParams.length > 0 ? "?\${params}" : ""}\`)`
      : hasBody
        ? `client.${method}(\`/engine/{engineName}${pathTemplate}\`, body)`
        : `client.${method}(\`/engine/{engineName}${pathTemplate}\`)`;

  // For POST/PUT with a request body, strip out path params to build the body
  const bodyBlock = hasBody
    ? pathParams.length > 0
      ? (() => {
          const destructureParts = pathParams.map((p) => {
            if (isValidIdentifier(p.name)) return p.name;
            // rename hyphenated: "tenant-id": _tenantId
            const alias = `_${p.name.replace(/-/g, "_")}`;
            return `"${p.name}": ${alias}`;
          });
          const voids = pathParams.map((p) => {
            if (isValidIdentifier(p.name)) return p.name;
            return `_${p.name.replace(/-/g, "_")}`;
          });
          return `  const { ${destructureParts.join(", ")}, ...body } = input as Record<string, unknown>;\n  void ${voids.join("; void ")};\n`;
        })()
      : `  const body = input;\n`
    : ``;

  const queryParamsBlock =
    queryParams.length > 0
      ? `  const params = new URLSearchParams();
${queryParams.map((p) => `  if (validated${propAccess(p.name)} !== undefined) params.append("${p.name}", String(validated${propAccess(p.name)}));`).join("\n")}
`
      : "";

  const frComment =
    entry.frMapping && entry.frMapping.length > 0
      ? `// frMapping: ${entry.frMapping.join(", ")}\n`
      : "// frMapping: []\n";

  const schemaExtra = hasBody ? `.passthrough()` : ``;

  const content = `${LICENSE_HEADER}

// Generated by scripts/generate.ts — DO NOT EDIT MANUALLY
${frComment}import { z } from "zod";
import type { OperatonClient } from "../../http/client.js";

export const ${operationId}InputSchema = z.object({
${schemaFields || "  // no parameters"}
})${schemaExtra};

export const ${operationId}ResponseSchema = z.unknown();

export async function ${operationId}(
  input: z.infer<typeof ${operationId}InputSchema>,
  client: OperatonClient,
): Promise<{ isError?: boolean; content: Array<{ type: "text"; text: string }> }> {
  const validated = ${operationId}InputSchema.parse(input);
${bodyBlock}${queryParamsBlock}  const response = await ${clientCall};
  if (response !== null && typeof response === "object" && "isError" in (response as Record<string, unknown>)) {
    return response as { isError: true; content: Array<{ type: "text"; text: string }> };
  }
  if (response === null) {
    return { content: [{ type: "text", text: "${operationId} completed successfully." }] };
  }
  return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
}
`;

  writeFileSync(join(groupDir, `${operationId}.ts`), content);
}

function emitGroupBarrel(outDir: string, group: string, operationIds: string[]): void {
  const exports = operationIds
    .map((id) => `export { ${id}, ${id}InputSchema, ${id}ResponseSchema } from "./${id}.js";`)
    .join("\n");
  writeFileSync(join(outDir, group, "index.ts"), `${LICENSE_HEADER}\n\n// Generated — DO NOT EDIT\n${exports}\n`);
}

function emitTopLevelBarrel(
  outDir: string,
  entries: Array<{ operationId: string; entry: ManifestEntry }>,
  hasCustomTools: boolean,
): void {
  const groupSet = new Set<string>();
  for (const item of entries) {
    const group = item.entry.tags[0] ?? "misc";
    groupSet.add(group);
  }

  const groupImports = [...groupSet]
    .map((g) => `import * as ${g} from "./${g}/index.js";`)
    .join("\n");

  const exposedEntries = entries.filter((e) => e.entry.expose);

  const toolRegistrations = exposedEntries
    .map((e) => {
      const group = e.entry.tags[0] ?? "misc";
      const schemaRef = `${group}.${e.operationId}InputSchema`;
      return `  tools.set(${JSON.stringify(e.entry.name)}, {
    description: ${JSON.stringify(e.entry.description)},
    schema: ${schemaRef},
    handler: (input: z.infer<typeof ${schemaRef}>) => ${group}.${e.operationId}(input, client),
    group: ${JSON.stringify(group)},
  });`;
    })
    .join("\n");

  const customToolsImport = hasCustomTools
    ? `import { getCustomTools } from "../tools/index.js";`
    : "";

  const customToolsMerge = hasCustomTools
    ? `
  // Merge custom hand-written tools (overrides generated tools with same name)
  for (const ct of getCustomTools(client)) {
    tools.set(ct.name, {
      description: ct.description,
      schema: ct.schema,
      handler: (input) => ct.handler(input, client),
      group: ct.group,
    });
  }`
    : "";

  const content = `${LICENSE_HEADER}

// Generated by scripts/generate.ts — DO NOT EDIT MANUALLY
import { z } from "zod";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OperatonClient } from "../http/client.js";
${customToolsImport}
${groupImports}

interface ToolEntry {
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  handler: (input: Record<string, unknown>) => Promise<{ isError?: boolean; content: Array<{ type: "text"; text: string }> }>;
  group: string;
}

export function registerAllTools(server: McpServer, client: OperatonClient): void {
  const tools = new Map<string, ToolEntry>();

${toolRegistrations}
${customToolsMerge}

  const groups = [...new Set([...tools.values()].map((t) => t.group))];

  server.server.registerCapabilities({ tools: {} });

  server.server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [...tools.entries()].map(([name, t]) => ({
      name,
      description: t.description,
      inputSchema: { type: "object" as const, properties: t.schema.shape },
    })),
  }));

  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = tools.get(toolName);
    if (!tool) {
      return {
        isError: true as const,
        content: [
          {
            type: "text" as const,
            text: \`Unknown tool: \${toolName}. Available groups: \${groups.join(", ")}\`,
          },
        ],
      };
    }
    const input = (request.params.arguments ?? {}) as Record<string, unknown>;
    return tool.handler(input);
  });
}
`;

  writeFileSync(join(outDir, "index.ts"), content);
}

// ── Exported validation (testable) ──────────────────────────────────────────

export function validateManifestOperationIds(
  manifest: Record<string, ManifestEntry>,
  specOps: Map<string, SpecOperation>,
): string[] {
  const unknowns: string[] = [];
  for (const [operationId] of Object.entries(manifest)) {
    if (!specOps.has(operationId)) {
      unknowns.push(operationId);
    }
  }
  return unknowns;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const specPath = join(ROOT, "resources", "operaton-rest-api.json");
  const configDir = join(ROOT, "config");
  const outDir = join(ROOT, "src", "generated");

  // Step 1
  const specOps = parseSpec(specPath);
  console.error(`[operaton-mcp] generate: spec loaded — ${specOps.size} operations`);

  // Step 2
  specDiff(specPath);

  // Step 3
  const manifest = loadManifest(configDir);
  const manifestEntries = Object.entries(manifest);
  console.error(`[operaton-mcp] generate: manifest has ${manifestEntries.length} entries`);

  // Step 4 — validate
  let valid = true;
  for (const [operationId] of manifestEntries) {
    if (!specOps.has(operationId)) {
      console.error(`[operaton-mcp] generate: ERROR — unknown operationId in manifest: "${operationId}"`);
      valid = false;
    }
  }
  if (!valid) {
    console.error("[operaton-mcp] generate: build failed due to unknown operationIds");
    process.exit(1);
  }

  // Step 5 — coverage audit
  const exposedCount = manifestEntries.filter(([, e]) => e.expose).length;
  console.error(
    `[operaton-mcp] generate: coverage — ${manifestEntries.length}/${specOps.size} operations in manifest; ${exposedCount} exposed`,
  );

  // Step 6 — length check
  for (const [id, entry] of manifestEntries) {
    if (entry.description.length > 200) {
      console.error(
        `[operaton-mcp] generate: WARN — description for "${id}" exceeds 200 chars (${entry.description.length})`,
      );
    }
    for (const ex of entry.examples ?? []) {
      if (ex.length > 100) {
        console.error(
          `[operaton-mcp] generate: WARN — example for "${id}" exceeds 100 chars (${ex.length})`,
        );
      }
    }
  }

  // Step 7 — frMapping check
  for (const [id, entry] of manifestEntries) {
    if (!Object.prototype.hasOwnProperty.call(entry, "frMapping")) {
      console.error(
        `[operaton-mcp] generate: WARN — manifest entry "${id}" is missing frMapping key`,
      );
    }
  }

  // Step 8 — emit
  mkdirSync(outDir, { recursive: true });

  const groups = new Map<string, string[]>();
  const allItems: Array<{ operationId: string; entry: ManifestEntry }> = [];

  for (const [operationId, entry] of manifestEntries) {
    const specOp = specOps.get(operationId)!;
    emitOperationFile(outDir, operationId, entry, specOp);

    const group = entry.tags[0] ?? "misc";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(operationId);
    allItems.push({ operationId, entry });
  }

  for (const [group, ids] of groups) {
    emitGroupBarrel(outDir, group, ids);
  }

  const customToolsFile = join(ROOT, "src", "tools", "index.ts");
  const hasCustomTools = existsSync(customToolsFile);
  emitTopLevelBarrel(outDir, allItems, hasCustomTools);

  console.error(
    `[operaton-mcp] generate: emitted ${manifestEntries.length} operation files + ${groups.size} group barrels + index.ts`,
  );
}

await main();
