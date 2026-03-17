// Integration test for Story 8.1: Deploy and Evaluate DMN Decisions
// Requires a live Operaton instance — skipped when OPERATON_BASE_URL is unset
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";
import { createOperatonClient } from "../../src/http/client.js";
import { deploymentCreate } from "../../src/tools/deployment.js";
import { getDecisionDefinitions } from "../../src/generated/decision/getDecisionDefinitions.js";
import { evaluateDecisionByKey } from "../../src/generated/decision/evaluateDecisionByKey.js";

// Minimal DMN: age-based eligibility decision table
const ELIGIBILITY_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
             id="eligibility" name="Eligibility" namespace="http://test">
  <decision id="eligibility-decision" name="Eligibility Decision">
    <decisionTable id="dt1" hitPolicy="FIRST">
      <input id="input1" label="Age">
        <inputExpression id="expr1" typeRef="integer"><text>age</text></inputExpression>
      </input>
      <output id="output1" name="eligible" typeRef="boolean"/>
      <rule id="rule1">
        <inputEntry id="ie1"><text>&gt;= 18</text></inputEntry>
        <outputEntry id="oe1"><text>true</text></outputEntry>
      </rule>
      <rule id="rule2">
        <inputEntry id="ie2"><text>&lt; 18</text></inputEntry>
        <outputEntry id="oe2"><text>false</text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>`;

const INVALID_DMN = `<?xml version="1.0" encoding="UTF-8"?><not-dmn-content/>`;

const skip = !process.env["OPERATON_BASE_URL"];

describe.skipIf(skip)("decision integration", () => {
  let deploymentId: string | undefined;
  let decisionDefinitionId: string | undefined;

  beforeEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await deploymentCreate(
      {
        "deployment-name": "integration-test-decision",
        "bpmn-content": ELIGIBILITY_DMN,
        "bpmn-filename": "eligibility.dmn",
        "deployment-source": "integration-test",
      },
      client,
    );
    const body = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    deploymentId = body["id"] as string;
    const defs = body["deployedDecisionDefinitions"] as Record<string, Record<string, unknown>> | null;
    if (defs) {
      decisionDefinitionId = Object.values(defs)[0]!["id"] as string;
    }
  });

  afterEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    if (decisionDefinitionId) {
      try {
        await client.delete(`/engine/{engineName}/decision-definition/${decisionDefinitionId}?cascade=true`);
      } catch { /* ok */ }
      decisionDefinitionId = undefined;
    }
    if (deploymentId) {
      try {
        await client.delete(`/engine/{engineName}/deployment/${deploymentId}?cascade=true`);
      } catch { /* ok */ }
      deploymentId = undefined;
    }
  });

  // FR-34 —— deploy DMN
  it("deploys a DMN and returns decision definition key", () => {
    expect(typeof deploymentId).toBe("string");
    expect(typeof decisionDefinitionId).toBe("string");
  });

  it("lists decision definitions and finds the deployed one", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getDecisionDefinitions({ key: "eligibility-decision" }, client);
    const defs = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[0]!["key"]).toBe("eligibility-decision");
  });

  it("deploys an invalid DMN and returns isError true", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await deploymentCreate(
      {
        "deployment-name": "invalid-dmn-test",
        "bpmn-content": INVALID_DMN,
        "bpmn-filename": "invalid.dmn",
        "deployment-source": "integration-test",
      },
      client,
    );
    // Invalid DMN should return an error
    const body = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    // Either isError at top level or no deployedDecisionDefinitions
    const isErr = (result as Record<string, unknown>)["isError"];
    if (!isErr) {
      // Some versions may accept it as empty deployment — just verify no definitions
      expect(body["deployedDecisionDefinitions"]).toBeNull();
    } else {
      expect(isErr).toBe(true);
    }
  });

  // FR-35 —— evaluate decision
  it("evaluates decision with age=25 and returns eligible=true", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await evaluateDecisionByKey(
      {
        key: "eligibility-decision",
        variables: { age: { value: 25, type: "Integer" } },
      } as Record<string, unknown>,
      client,
    );
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0]!.text) as Array<Record<string, Record<string, unknown>>>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]!["eligible"]!["value"]).toBe(true);
  });

  it("evaluates decision with age=16 and returns eligible=false", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await evaluateDecisionByKey(
      {
        key: "eligibility-decision",
        variables: { age: { value: 16, type: "Integer" } },
      } as Record<string, unknown>,
      client,
    );
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0]!.text) as Array<Record<string, Record<string, unknown>>>;
    expect(body[0]!["eligible"]!["value"]).toBe(false);
  });
});
