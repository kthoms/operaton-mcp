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

// Integration test for Stories 7.1, 7.2: Historic Data & Audit
// Requires a live Operaton instance — skipped when OPERATON_BASE_URL is unset
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";
import { createOperatonClient } from "../../src/http/client.js";
import { deploymentCreate } from "../../src/tools/deployment.js";
import { startProcessInstanceByKey } from "../../src/generated/processInstance/startProcessInstanceByKey.js";
import { getTasks } from "../../src/generated/task/getTasks.js";
import { claim } from "../../src/generated/task/claim.js";
import { complete } from "../../src/generated/task/complete.js";
import { getHistoricProcessInstances } from "../../src/generated/history/getHistoricProcessInstances.js";
import { getHistoricActivityInstances } from "../../src/generated/history/getHistoricActivityInstances.js";
import { getHistoricTaskInstances } from "../../src/generated/history/getHistoricTaskInstances.js";
import { getHistoricVariableInstances } from "../../src/generated/history/getHistoricVariableInstances.js";

const HISTORY_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  targetNamespace="http://test">
  <bpmn:process id="test-history-process" name="Test History Process" isExecutable="true">
    <bpmn:startEvent id="start"/>
    <bpmn:userTask id="review" name="Review Task"/>
    <bpmn:endEvent id="end"/>
    <bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="review"/>
    <bpmn:sequenceFlow id="f2" sourceRef="review" targetRef="end"/>
  </bpmn:process>
</bpmn:definitions>`;

const skip = !process.env["OPERATON_BASE_URL"];

describe.skipIf(skip)("history integration", () => {
  let deploymentId: string | undefined;
  let instanceId: string | undefined;

  beforeEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    // Deploy
    const deployResult = await deploymentCreate(
      {
        "deployment-name": "integration-test-history",
        "bpmn-content": HISTORY_BPMN,
        "bpmn-filename": "test-history-process.bpmn",
        "deployment-source": "integration-test",
      },
      client,
    );
    deploymentId = JSON.parse(deployResult.content[0]!.text)["id"] as string;

    // Start and complete an instance to populate history
    const startResult = await startProcessInstanceByKey(
      { key: "test-history-process", businessKey: "history-test-bk" },
      client,
    );
    instanceId = JSON.parse(startResult.content[0]!.text)["id"] as string;

    // Claim and complete the task with variables
    const tasksResult = await getTasks({ processInstanceId: instanceId }, client);
    const tasks = JSON.parse(tasksResult.content[0]!.text) as Array<Record<string, unknown>>;
    const taskId = tasks[0]!["id"] as string;
    await claim({ id: taskId, userId: "history-tester" }, client);
    await complete(
      {
        id: taskId,
        variables: { result: { value: "approved", type: "String" } },
      } as Record<string, unknown>,
      client,
    );
  });

  afterEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    if (deploymentId) {
      try { await client.delete(`/engine/{engineName}/deployment/${deploymentId}?cascade=true`); } catch { /* ok */ }
      deploymentId = undefined;
    }
    instanceId = undefined;
  });

  // Story 7.1 —— historic process and activity instances
  it("queries historic process instances by key and returns required fields", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getHistoricProcessInstances(
      { processDefinitionKey: "test-history-process", completed: true },
      client,
    );
    const instances = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(Array.isArray(instances)).toBe(true);
    const found = instances.find((i) => i["id"] === instanceId);
    expect(found).toBeDefined();
    expect(found!["processDefinitionKey"]).toBe("test-history-process");
    expect(typeof found!["startTime"]).toBe("string");
    expect(typeof found!["state"]).toBe("string");
  });

  it("queries historic activity instances for a process instance", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getHistoricActivityInstances({ processInstanceId: instanceId }, client);
    const activities = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(Array.isArray(activities)).toBe(true);
    expect(activities.length).toBeGreaterThan(0);
    const activity = activities[0]!;
    expect(typeof activity["activityId"]).toBe("string");
    expect(typeof activity["activityType"]).toBe("string");
    expect(typeof activity["startTime"]).toBe("string");
  });

  // Story 7.2 —— historic tasks and variables
  it("queries historic task instances for a process instance", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getHistoricTaskInstances({ processInstanceId: instanceId }, client);
    const tasks = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
    const t = tasks[0]!;
    expect(typeof t["id"]).toBe("string");
    expect(t["processInstanceId"]).toBe(instanceId);
  });

  it("queries historic variable instances for a process instance", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getHistoricVariableInstances({ processInstanceId: instanceId }, client);
    const vars = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(Array.isArray(vars)).toBe(true);
    const resultVar = vars.find((v) => v["name"] === "result");
    expect(resultVar).toBeDefined();
    expect(resultVar!["value"]).toBe("approved");
  });

  it("returns empty array for a non-existent process instance ID", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getHistoricProcessInstances(
      { processInstanceId: "nonexistent-history-id" },
      client,
    );
    const instances = JSON.parse(result.content[0]!.text) as Array<unknown>;
    expect(Array.isArray(instances)).toBe(true);
    expect(instances.length).toBe(0);
  });
});
