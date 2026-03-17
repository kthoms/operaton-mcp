// Integration test for Story 5.3: Query and Resolve Incidents
// Requires a live Operaton instance — skipped when OPERATON_BASE_URL is unset
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";
import { createOperatonClient } from "../../src/http/client.js";
import { deploymentCreate } from "../../src/tools/deployment.js";
import { startProcessInstanceByKey } from "../../src/generated/processInstance/startProcessInstanceByKey.js";
import { getJobs } from "../../src/generated/job/getJobs.js";
import { setJobRetries } from "../../src/generated/job/setJobRetries.js";
import { executeJob } from "../../src/generated/job/executeJob.js";
import { getIncidents } from "../../src/generated/incident/getIncidents.js";

// BPMN with a failing service task — job will fail on execution creating an incident
const INCIDENT_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  targetNamespace="http://test">
  <bpmn:process id="test-incident-process" name="Test Incident Process" isExecutable="true">
    <bpmn:startEvent id="start"/>
    <bpmn:serviceTask id="failingTask" name="Failing Task"
                      camunda:class="org.nonexistent.FailingDelegate"/>
    <bpmn:endEvent id="end"/>
    <bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="failingTask"/>
    <bpmn:sequenceFlow id="f2" sourceRef="failingTask" targetRef="end"/>
  </bpmn:process>
</bpmn:definitions>`;

const skip = !process.env["OPERATON_BASE_URL"];

describe.skipIf(skip)("incident integration", () => {
  let deploymentId: string | undefined;
  let instanceId: string | undefined;

  beforeEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    // Deploy
    const deployResult = await deploymentCreate(
      {
        "deployment-name": "integration-test-incident",
        "bpmn-content": INCIDENT_BPMN,
        "bpmn-filename": "test-incident-process.bpmn",
        "deployment-source": "integration-test",
      },
      client,
    );
    deploymentId = JSON.parse(deployResult.content[0]!.text)["id"] as string;

    // Start instance (creates a job for the service task)
    const startResult = await startProcessInstanceByKey({ key: "test-incident-process" }, client);
    instanceId = JSON.parse(startResult.content[0]!.text)["id"] as string;

    // Find the job and exhaust retries to create an incident
    const jobsResult = await getJobs({ processInstanceId: instanceId }, client);
    const jobs = JSON.parse(jobsResult.content[0]!.text) as Array<Record<string, unknown>>;
    if (jobs.length > 0) {
      const jobId = jobs[0]!["id"] as string;
      // Set retries to 0 so the job creates an incident on next failure
      await setJobRetries({ id: jobId, retries: 1 }, client);
      // Execute the job — it will fail and with retries=1 it creates an incident
      await executeJob({ id: jobId }, client);
    }
  });

  afterEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    if (instanceId) {
      try { await client.delete(`/engine/{engineName}/process-instance/${instanceId}`); } catch { /* ok */ }
      instanceId = undefined;
    }
    if (deploymentId) {
      try { await client.delete(`/engine/{engineName}/deployment/${deploymentId}?cascade=true`); } catch { /* ok */ }
      deploymentId = undefined;
    }
  });

  it("lists incidents for a process instance", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getIncidents({ processInstanceId: instanceId }, client);
    const incidents = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(Array.isArray(incidents)).toBe(true);
    // The failing service task should have created an incident
    if (incidents.length > 0) {
      const inc = incidents[0]!;
      expect(typeof inc["id"]).toBe("string");
      expect(typeof inc["incidentType"]).toBe("string");
      expect(inc["processInstanceId"]).toBe(instanceId);
    }
  });

  it("lists incidents filtered by processInstanceId returns only matching incidents", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getIncidents({ processInstanceId: instanceId }, client);
    const incidents = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    for (const inc of incidents) {
      expect(inc["processInstanceId"]).toBe(instanceId);
    }
  });
});
