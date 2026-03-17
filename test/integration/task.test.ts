// Integration test for Stories 4.1, 4.2, 4.3: Task Management
// Requires a live Operaton instance — skipped when OPERATON_BASE_URL is unset
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";
import { createOperatonClient } from "../../src/http/client.js";
import { deploymentCreate } from "../../src/tools/deployment.js";
import { startProcessInstanceByKey } from "../../src/generated/processInstance/startProcessInstanceByKey.js";
import { getTasks } from "../../src/generated/task/getTasks.js";
import { getTask } from "../../src/generated/task/getTask.js";
import { claim } from "../../src/generated/task/claim.js";
import { unclaim } from "../../src/generated/task/unclaim.js";
import { delegateTask } from "../../src/generated/task/delegateTask.js";
import { complete } from "../../src/generated/task/complete.js";
import { modifyTaskVariables } from "../../src/generated/task/modifyTaskVariables.js";
import { getTaskVariables } from "../../src/generated/task/getTaskVariables.js";

const TASK_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  targetNamespace="http://test">
  <bpmn:process id="test-task-process" name="Test Task Process" isExecutable="true">
    <bpmn:startEvent id="start"/>
    <bpmn:userTask id="approval" name="Approval Task">
      <bpmn:extensionElements>
        <camunda:candidateGroups>testGroup</camunda:candidateGroups>
      </bpmn:extensionElements>
    </bpmn:userTask>
    <bpmn:endEvent id="end"/>
    <bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="approval"/>
    <bpmn:sequenceFlow id="f2" sourceRef="approval" targetRef="end"/>
  </bpmn:process>
</bpmn:definitions>`;

const skip = !process.env["OPERATON_BASE_URL"];

describe.skipIf(skip)("task integration", () => {
  let deploymentId: string | undefined;
  let instanceId: string | undefined;
  let taskId: string | undefined;

  beforeEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    // Deploy process
    const deployResult = await deploymentCreate(
      {
        "deployment-name": "integration-test-task",
        "bpmn-content": TASK_BPMN,
        "bpmn-filename": "test-task-process.bpmn",
        "deployment-source": "integration-test",
      },
      client,
    );
    const deployBody = JSON.parse(deployResult.content[0]!.text) as Record<string, unknown>;
    deploymentId = deployBody["id"] as string;

    // Start instance
    const startResult = await startProcessInstanceByKey({ key: "test-task-process" }, client);
    const startBody = JSON.parse(startResult.content[0]!.text) as Record<string, unknown>;
    instanceId = startBody["id"] as string;

    // Get task
    const tasksResult = await getTasks({ processInstanceId: instanceId }, client);
    const tasks = JSON.parse(tasksResult.content[0]!.text) as Array<Record<string, unknown>>;
    taskId = tasks[0]!["id"] as string;
  });

  afterEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    if (instanceId) {
      try {
        await client.delete(`/engine/{engineName}/process-instance/${instanceId}`);
      } catch { /* best-effort */ }
      instanceId = undefined;
    }
    if (deploymentId) {
      try {
        await client.delete(`/engine/{engineName}/deployment/${deploymentId}?cascade=true`);
      } catch { /* best-effort */ }
      deploymentId = undefined;
    }
    taskId = undefined;
  });

  // Story 4.1 —— query tasks
  it("lists tasks with no filter and returns required fields", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getTasks({ processInstanceId: instanceId }, client);
    const tasks = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(tasks.length).toBeGreaterThan(0);
    const t = tasks[0]!;
    expect(typeof t["id"]).toBe("string");
    expect(typeof t["name"]).toBe("string");
    expect(t["processInstanceId"]).toBe(instanceId);
  });

  it("retrieves a single task by ID", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getTask({ id: taskId }, client);
    const t = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(t["id"]).toBe(taskId);
    expect(t["processInstanceId"]).toBe(instanceId);
  });

  // Story 4.2 —— claim, unclaim, delegate
  it("claims a task and sets assignee", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await claim({ id: taskId, userId: "test-user" }, client);
    expect(result.isError).toBeUndefined();
  });

  it("unclaims a task to return it to the queue", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    await claim({ id: taskId, userId: "test-user" }, client);
    const result = await unclaim({ id: taskId }, client);
    expect(result.isError).toBeUndefined();
  });

  it("delegates a task to another user", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    await claim({ id: taskId, userId: "test-user" }, client);
    const result = await delegateTask({ id: taskId, userId: "delegate-user" }, client);
    expect(result.isError).toBeUndefined();
  });

  // Story 4.3 —— complete tasks and task variables
  it("sets task variables and retrieves them", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    await modifyTaskVariables(
      { id: taskId, modifications: { decision: { value: "approve", type: "String" } } } as Record<string, unknown>,
      client,
    );
    const result = await getTaskVariables({ id: taskId }, client);
    const vars = JSON.parse(result.content[0]!.text) as Record<string, Record<string, unknown>>;
    expect(vars["decision"]).toBeDefined();
    expect(vars["decision"]!["value"]).toBe("approve");
  });

  it("completes a task and returns confirmation", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await complete({ id: taskId }, client);
    expect(result.isError).toBeUndefined();
    // Task completed — instance finished, so clear it from cleanup
    instanceId = undefined;
  });
});
