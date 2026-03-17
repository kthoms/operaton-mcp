// Integration test for Stories 3.1, 3.2, 3.3, 3.4: Process Instance operations
// Requires a live Operaton instance — skipped when OPERATON_BASE_URL is unset
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";
import { createOperatonClient } from "../../src/http/client.js";
import { deploymentCreate } from "../../src/tools/deployment.js";
import { startProcessInstanceByKey } from "../../src/generated/processInstance/startProcessInstanceByKey.js";
import { getProcessInstances } from "../../src/generated/processInstance/getProcessInstances.js";
import { getProcessInstance } from "../../src/generated/processInstance/getProcessInstance.js";
import { deleteProcessInstance } from "../../src/generated/processInstance/deleteProcessInstance.js";
import { updateSuspensionStateById } from "../../src/generated/processInstance/updateSuspensionStateById.js";
import { getProcessInstanceVariables } from "../../src/generated/processInstance/getProcessInstanceVariables.js";
import { modifyProcessInstanceVariables } from "../../src/generated/processInstance/modifyProcessInstanceVariables.js";

// Process with user task so instance stays active
const INSTANCE_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  targetNamespace="http://test">
  <bpmn:process id="test-instance-process" name="Test Instance Process" isExecutable="true">
    <bpmn:startEvent id="start"/>
    <bpmn:userTask id="task" name="Test Task"/>
    <bpmn:endEvent id="end"/>
    <bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="task"/>
    <bpmn:sequenceFlow id="f2" sourceRef="task" targetRef="end"/>
  </bpmn:process>
</bpmn:definitions>`;

const skip = !process.env["OPERATON_BASE_URL"];

describe.skipIf(skip)("processInstance integration", () => {
  let deploymentId: string | undefined;
  let instanceIds: string[] = [];

  beforeEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await deploymentCreate(
      {
        "deployment-name": "integration-test-instance",
        "bpmn-content": INSTANCE_BPMN,
        "bpmn-filename": "test-instance-process.bpmn",
        "deployment-source": "integration-test",
      },
      client,
    );
    const body = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    deploymentId = body["id"] as string;
    instanceIds = [];
  });

  afterEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    // Delete all started instances first
    for (const id of instanceIds) {
      try {
        await client.delete(`/engine/{engineName}/process-instance/${id}`);
      } catch {
        // best-effort
      }
    }
    instanceIds = [];
    // Then delete deployment
    if (deploymentId) {
      try {
        await client.delete(`/engine/{engineName}/deployment/${deploymentId}?cascade=true`);
      } catch {
        // best-effort
      }
      deploymentId = undefined;
    }
  });

  // Story 3.1 —— start and delete
  it("starts a process instance by key and returns id, definitionKey, and state", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await startProcessInstanceByKey(
      { key: "test-instance-process", businessKey: "test-bk-001" },
      client,
    );
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(typeof body["id"]).toBe("string");
    expect(body["definitionKey"]).toBe("test-instance-process");
    expect(typeof body["state"]).toBe("string");
    instanceIds.push(body["id"] as string);
  });

  it("returns isError true when starting with an unknown process key", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await startProcessInstanceByKey({ key: "nonexistent-process-key" }, client);
    expect((result as Record<string, unknown>)["isError"]).toBe(true);
  });

  it("deletes an existing process instance with a reason and returns confirmation", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    // Start an instance to delete
    const startResult = await startProcessInstanceByKey({ key: "test-instance-process" }, client);
    const startBody = JSON.parse(startResult.content[0]!.text) as Record<string, unknown>;
    const id = startBody["id"] as string;

    const result = await deleteProcessInstance({ id, deleteReason: "test cleanup" }, client);
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain("deleteProcessInstance completed successfully");
    // Don't add to instanceIds since already deleted
  });

  // Story 3.2 —— query active instances
  it("lists active process instances and finds the started one", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const startResult = await startProcessInstanceByKey({ key: "test-instance-process" }, client);
    const startBody = JSON.parse(startResult.content[0]!.text) as Record<string, unknown>;
    const instanceId = startBody["id"] as string;
    instanceIds.push(instanceId);

    const result = await getProcessInstances({ processDefinitionKey: "test-instance-process" }, client);
    const body = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    const found = body.find((i) => i["id"] === instanceId);
    expect(found).toBeDefined();
    expect(found!["definitionKey"]).toBe("test-instance-process");
  });

  it("retrieves a single process instance by ID", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const startResult = await startProcessInstanceByKey({ key: "test-instance-process" }, client);
    const startBody = JSON.parse(startResult.content[0]!.text) as Record<string, unknown>;
    const instanceId = startBody["id"] as string;
    instanceIds.push(instanceId);

    const result = await getProcessInstance({ id: instanceId }, client);
    const body = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(body["id"]).toBe(instanceId);
    expect(body["definitionKey"]).toBe("test-instance-process");
  });

  // Story 3.3 —— suspend and resume
  it("suspends and resumes a process instance", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const startResult = await startProcessInstanceByKey({ key: "test-instance-process" }, client);
    const startBody = JSON.parse(startResult.content[0]!.text) as Record<string, unknown>;
    const instanceId = startBody["id"] as string;
    instanceIds.push(instanceId);

    // Suspend
    const suspendResult = await updateSuspensionStateById({ id: instanceId, suspended: true }, client);
    expect(suspendResult.isError).toBeUndefined();

    // Resume
    const resumeResult = await updateSuspensionStateById({ id: instanceId, suspended: false }, client);
    expect(resumeResult.isError).toBeUndefined();
  });

  // Story 3.4 —— variables
  it("sets and retrieves process instance variables", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const startResult = await startProcessInstanceByKey({ key: "test-instance-process" }, client);
    const startBody = JSON.parse(startResult.content[0]!.text) as Record<string, unknown>;
    const instanceId = startBody["id"] as string;
    instanceIds.push(instanceId);

    // Set variables
    await modifyProcessInstanceVariables(
      {
        id: instanceId,
        modifications: { amount: { value: 5000, type: "Integer" } },
      } as Record<string, unknown>,
      client,
    );

    // Get variables
    const result = await getProcessInstanceVariables({ id: instanceId }, client);
    const vars = JSON.parse(result.content[0]!.text) as Record<string, Record<string, unknown>>;
    expect(vars["amount"]).toBeDefined();
    expect(vars["amount"]!["value"]).toBe(5000);
  });
});
