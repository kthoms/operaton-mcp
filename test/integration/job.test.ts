// Integration test for Stories 5.1, 5.2: Job operations
// Requires a live Operaton instance — skipped when OPERATON_BASE_URL is unset
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";
import { createOperatonClient } from "../../src/http/client.js";
import { deploymentCreate } from "../../src/tools/deployment.js";
import { startProcessInstanceByKey } from "../../src/generated/processInstance/startProcessInstanceByKey.js";
import { getJobs } from "../../src/generated/job/getJobs.js";
import { getJob } from "../../src/generated/job/getJob.js";
import { updateJobSuspensionState } from "../../src/generated/job/updateJobSuspensionState.js";
import { setJobRetries } from "../../src/generated/job/setJobRetries.js";

// BPMN with an async service task — creates a job on instance start
const JOB_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  targetNamespace="http://test">
  <bpmn:process id="test-job-process" name="Test Job Process" isExecutable="true">
    <bpmn:startEvent id="start"/>
    <bpmn:intermediateCatchEvent id="timer" name="Wait 1h">
      <bpmn:timerEventDefinition>
        <bpmn:timeDuration>PT1H</bpmn:timeDuration>
      </bpmn:timerEventDefinition>
    </bpmn:intermediateCatchEvent>
    <bpmn:endEvent id="end"/>
    <bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="timer"/>
    <bpmn:sequenceFlow id="f2" sourceRef="timer" targetRef="end"/>
  </bpmn:process>
</bpmn:definitions>`;

const skip = !process.env["OPERATON_BASE_URL"];

describe.skipIf(skip)("job integration", () => {
  let deploymentId: string | undefined;
  let instanceId: string | undefined;
  let jobId: string | undefined;

  beforeEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    // Deploy
    const deployResult = await deploymentCreate(
      {
        "deployment-name": "integration-test-job",
        "bpmn-content": JOB_BPMN,
        "bpmn-filename": "test-job-process.bpmn",
        "deployment-source": "integration-test",
      },
      client,
    );
    deploymentId = JSON.parse(deployResult.content[0]!.text)["id"] as string;

    // Start instance (creates a timer job)
    const startResult = await startProcessInstanceByKey({ key: "test-job-process" }, client);
    instanceId = JSON.parse(startResult.content[0]!.text)["id"] as string;

    // Find job for this instance
    const jobsResult = await getJobs({ processInstanceId: instanceId }, client);
    const jobs = JSON.parse(jobsResult.content[0]!.text) as Array<Record<string, unknown>>;
    jobId = jobs[0]!["id"] as string;
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
    jobId = undefined;
  });

  // Story 5.1 —— query jobs
  it("lists jobs for a process instance and returns required fields", async () => {
    expect(typeof jobId).toBe("string");
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getJobs({ processInstanceId: instanceId }, client);
    const jobs = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(jobs.length).toBeGreaterThan(0);
    const j = jobs[0]!;
    expect(typeof j["id"]).toBe("string");
    expect(typeof j["retries"]).toBe("number");
  });

  it("retrieves a single job by ID", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getJob({ id: jobId }, client);
    const j = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(j["id"]).toBe(jobId);
  });

  // Story 5.2 —— suspend, resume, set retries
  it("suspends and resumes a job by ID", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const suspendResult = await updateJobSuspensionState({ id: jobId, suspended: true }, client);
    expect(suspendResult.isError).toBeUndefined();

    const resumeResult = await updateJobSuspensionState({ id: jobId, suspended: false }, client);
    expect(resumeResult.isError).toBeUndefined();
  });

  it("sets the retry count for a job", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await setJobRetries({ id: jobId, retries: 3 }, client);
    expect(result.isError).toBeUndefined();
  });

  it("returns isError true when setting retries on a non-existent job ID", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await setJobRetries({ id: "nonexistent-job-id", retries: 1 }, client);
    expect((result as Record<string, unknown>)["isError"]).toBe(true);
  });
});
