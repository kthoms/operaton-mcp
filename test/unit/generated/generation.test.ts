import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../..");

describe("code generation pipeline", () => {
  beforeAll(() => {
    // Run generation to ensure fresh output
    execSync("node --import tsx/esm scripts/generate.ts", {
      cwd: ROOT,
      stdio: "pipe",
    });
  });

  it("emits top-level barrel src/generated/index.ts", () => {
    const path = join(ROOT, "src/generated/index.ts");
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf8");
    expect(content).toContain("registerAllTools");
    expect(content).toContain("McpServer");
    expect(content).toContain("OperatonClient");
  });

  it("emits correct tool name from manifest for getProcessDefinitions", () => {
    const path = join(ROOT, "src/generated/index.ts");
    const content = readFileSync(path, "utf8");
    expect(content).toContain('"processDefinition_list"');
  });

  it("emits correct tool name for getTasks", () => {
    const path = join(ROOT, "src/generated/index.ts");
    const content = readFileSync(path, "utf8");
    expect(content).toContain('"task_list"');
  });

  it("emits operation file for getProcessDefinitions with Zod schema", () => {
    const path = join(
      ROOT,
      "src/generated/processDefinition/getProcessDefinitions.ts",
    );
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf8");
    expect(content).toContain("getProcessDefinitionsInputSchema");
    expect(content).toContain("z.object(");
    expect(content).toContain("z.string().optional()");
  });

  it("generated handler calls client (not raw fetch)", () => {
    const path = join(
      ROOT,
      "src/generated/processDefinition/getProcessDefinitions.ts",
    );
    const content = readFileSync(path, "utf8");
    expect(content).toContain("client.get(");
    expect(content).not.toContain("fetch(");
  });

  it("generated handler includes frMapping comment for FR-mapped operations", () => {
    const path = join(
      ROOT,
      "src/generated/processDefinition/getProcessDefinitions.ts",
    );
    const content = readFileSync(path, "utf8");
    expect(content).toContain("frMapping: FR-02");
  });

  it("emits group barrel for processDefinition group", () => {
    const path = join(ROOT, "src/generated/processDefinition/index.ts");
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf8");
    expect(content).toContain("getProcessDefinitions");
    expect(content).toContain("getProcessDefinitionsInputSchema");
  });

  it("emits group barrel for task group", () => {
    const path = join(ROOT, "src/generated/task/index.ts");
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf8");
    expect(content).toContain("getTasks");
  });

  it("emits group barrel for incident group", () => {
    const path = join(ROOT, "src/generated/incident/index.ts");
    expect(existsSync(path)).toBe(true);
  });

  it("path parameter included in Zod schema for getProcessDefinition", () => {
    const path = join(
      ROOT,
      "src/generated/processDefinition/getProcessDefinition.ts",
    );
    const content = readFileSync(path, "utf8");
    expect(content).toContain("id:");
  });
});
