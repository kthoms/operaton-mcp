// Integration test for Stories 2.1, 2.2, 2.3: Process Definition operations
// Story 2.3: delete tests follow the list/get tests
// Requires a live Operaton instance — skipped when OPERATON_BASE_URL is unset
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";
import { createOperatonClient } from "../../src/http/client.js";
import { deploymentCreate } from "../../src/tools/deployment.js";
import { getProcessDefinitions } from "../../src/generated/processDefinition/getProcessDefinitions.js";
import { getProcessDefinition } from "../../src/generated/processDefinition/getProcessDefinition.js";
import { getProcessDefinitionBpmn20Xml } from "../../src/generated/processDefinition/getProcessDefinitionBpmn20Xml.js";
import { deleteProcessDefinition } from "../../src/generated/processDefinition/deleteProcessDefinition.js";

const TEST_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  targetNamespace="http://test">
  <bpmn:process id="test-process" name="Test Process" isExecutable="true">
    <bpmn:startEvent id="start"/>
    <bpmn:endEvent id="end"/>
    <bpmn:sequenceFlow id="flow1" sourceRef="start" targetRef="end"/>
  </bpmn:process>
</bpmn:definitions>`;

const skip = !process.env["OPERATON_BASE_URL"];

describe.skipIf(skip)("processDefinition integration", () => {
  let deploymentId: string | undefined;
  let definitionId: string | undefined;

  beforeEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await deploymentCreate(
      {
        "deployment-name": "integration-test-deploy",
        "bpmn-content": TEST_BPMN,
        "bpmn-filename": "test-process.bpmn",
        "deployment-source": "integration-test",
      },
      client,
    );
    const body = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    deploymentId = body["id"] as string;
    const defs = body["deployedProcessDefinitions"] as Record<string, Record<string, unknown>>;
    definitionId = Object.values(defs)[0]!["id"] as string;
  });

  afterEach(async () => {
    if (deploymentId) {
      const config = loadConfig();
      const client = createOperatonClient(config);
      try {
        await client.delete(`/engine/{engineName}/deployment/${deploymentId}?cascade=true`);
      } catch {
        // best-effort cleanup
      }
      deploymentId = undefined;
      definitionId = undefined;
    }
  });

  // Story 2.1 —— deploy
  it("deploys a valid BPMN and returns deployment ID and process definition key", () => {
    expect(typeof deploymentId).toBe("string");
    expect(typeof definitionId).toBe("string");
  });

  // Story 2.2 —— list
  it("lists process definitions with no filter and returns required fields", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getProcessDefinitions({}, client);
    const body = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    const deployed = body.find((d) => d["id"] === definitionId);
    expect(deployed).toBeDefined();
    expect(typeof deployed!["id"]).toBe("string");
    expect(typeof deployed!["key"]).toBe("string");
    expect(typeof deployed!["version"]).toBe("number");
    expect(typeof deployed!["deploymentId"]).toBe("string");
  });

  it("lists process definitions filtered by key and returns only matching entries", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getProcessDefinitions({ key: "test-process" }, client);
    const body = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    for (const d of body) {
      expect(d["key"]).toBe("test-process");
    }
  });

  it("retrieves a process definition by ID with full metadata", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getProcessDefinition({ id: definitionId }, client);
    const body = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(body["id"]).toBe(definitionId);
    expect(body["key"]).toBe("test-process");
    expect(typeof body["version"]).toBe("number");
    expect(typeof body["deploymentId"]).toBe("string");
  });

  it("retrieves BPMN XML by definition ID", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getProcessDefinitionBpmn20Xml({ id: definitionId }, client);
    const body = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(typeof body["bpmn20Xml"]).toBe("string");
    expect((body["bpmn20Xml"] as string).includes("test-process")).toBe(true);
  });

  it("returns isError true for a non-existent definition ID (get)", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getProcessDefinition({ id: "nonexistent-id-that-does-not-exist" }, client);
    expect((result as Record<string, unknown>)["isError"]).toBe(true);
  });

  // Story 2.3 —— delete
  it("deletes a process definition with no active instances and returns confirmation", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await deleteProcessDefinition({ id: definitionId }, client);
    // On success, the handler returns a confirmation message (204 → null → success text)
    expect(result.isError).toBeUndefined();
    const text = result.content[0]!.text;
    expect(text).toContain("deleteProcessDefinition completed successfully");
    // Mark deploymentId as cleaned so afterEach doesn't attempt a second delete
    deploymentId = undefined;
    definitionId = undefined;
  });

  it("returns isError true when deleting a non-existent definition ID", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await deleteProcessDefinition({ id: "nonexistent-id-that-does-not-exist" }, client);
    expect((result as Record<string, unknown>)["isError"]).toBe(true);
  });
});
