# Story 8.1: Deploy and Evaluate DMN Decisions

Status: review

## Story

As an operator or analyst using operaton-mcp,
I want to deploy DMN decision tables to Operaton and evaluate them with input variables,
so that I can manage and test decision logic through AI alongside BPMN process management.

## Acceptance Criteria

1. **Given** the decision and decisionRequirements manifest groups are populated with real BPM-domain descriptions and `frMapping` for FR-34 and FR-35, and `npm run generate` is run **When** `tools/list` is called **Then** decision tools appear in the list with descriptions ≤ 200 chars using BPM-domain terminology appropriate for an operator/analyst audience; `frMapping` covers FR-34 and FR-35.

2. **Given** a valid DMN artifact is submitted via the deploy-decision tool (FR-34) **When** the tool call completes **Then** the response contains the decision definition key and deployment ID.

3. **Given** an invalid DMN artifact is submitted **When** the tool call completes **Then** `isError: true` is returned with a structured error containing the error type, cause, and a suggested corrective action.

4. **Given** an evaluate-decision call is made with a valid decision definition key and correct input variables (FR-35) **When** the tool call completes **Then** the response contains the structured evaluation result.

5. **Given** an evaluate-decision call is made with input variables that fail decision evaluation **When** the tool call completes **Then** `isError: true` is returned with a structured error describing the evaluation failure.

6. **Given** the integration tests for FR-34 and FR-35 run **When** `npm run test:integration` executes **Then** all tests pass; deployed DMN artifacts are cleaned up in `afterEach`.

## Tasks / Subtasks

- [ ] Populate `config/tool-manifest.json` — decision and decisionRequirements groups (AC: 1)
  - [ ] **decision group:**
    - FR-34 (`deployDecision` — same deployment endpoint as BPMN): expose via deploy tool with DMN support
    - FR-35 (`evaluateDecisionById`): name `decision_evaluate`, `frMapping: ["FR-35"]`
    - `getDecisionDefinitions`: name `decision_list`, `frMapping: []`
    - `getDecisionDefinitionById`: name `decision_getById`, `frMapping: []`
    - `getDecisionDefinitionDiagramById`: expose for DMN XML retrieval
  - [ ] **decisionRequirements group:** expose relevant DRD (Decision Requirements Diagram) operations; `frMapping: []`
  - [ ] All descriptions ≤ 200 chars; analyst audience language (decision tables, rule evaluation)
  - [ ] Run `npm run generate`
- [ ] Verify DMN deployment (FR-34) (AC: 2, 3)
  - [ ] DMN deployment uses the SAME Operaton deployment endpoint as BPMN: `POST /engine/{engineName}/deployment/create`
  - [ ] The deploy tool from Epic 2 (Story 2.1) already handles this if the manifest description is updated for DMN context
  - [ ] Alternatively: ensure `processDefinition_deploy` description mentions DMN support, OR create a dedicated `decision_deploy` tool
  - [ ] Verify that deploying a `.dmn` file returns `deployedDecisionDefinitions` in the response
  - [ ] Invalid DMN → `ParseException` → structured error with parse hint
- [ ] Verify `decision_evaluate` handler (AC: 4, 5)
  - [ ] Calls `POST /engine/{engineName}/decision-definition/key/{key}/evaluate` with input variables body
  - [ ] Zod input: `{ key: string, variables: Record<string, { value: unknown, type?: string }> }`
  - [ ] Success: returns evaluation result array (one entry per matched rule)
  - [ ] Evaluation failure: Operaton returns `"DecisionDefinitionNotFoundException"` or evaluation error → normalize to structured error
- [ ] Create integration test `test/integration/decision.test.ts` (AC: 6)
  - [ ] Use a simple DMN decision table fixture (e.g., age-based eligibility rule):
    ```xml
    <!-- input: age (integer), output: eligible (boolean) -->
    <!-- Rule 1: age >= 18 → eligible = true -->
    <!-- Rule 2: age < 18 → eligible = false -->
    ```
  - [ ] `beforeEach`: deploy the DMN fixture; get decision definition key
  - [ ] Test: evaluate with `age = 25` → result contains `eligible = true`
  - [ ] Test: evaluate with `age = 16` → result contains `eligible = false`
  - [ ] Test: evaluate with invalid input (missing required input) → `isError: true`, structured evaluation error
  - [ ] Test: deploy invalid DMN artifact → `isError: true`, parse error
  - [ ] `afterEach`: delete deployed DMN definition (use decision definition delete endpoint)
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### DMN Deployment is Shared with BPMN

The Operaton deployment endpoint `POST /engine/{engineName}/deployment/create` handles both BPMN and DMN files. If you submit a `.dmn` file, the response includes `deployedDecisionDefinitions` instead of (or in addition to) `deployedProcessDefinitions`.

Options for FR-34:
1. **Reuse `processDefinition_deploy`** with updated description mentioning DMN support (simplest)
2. **Add a `decision_deploy` alias** pointing to the same endpoint (cleaner separation for LLM)

Recommend option 2 for clarity — LLMs benefit from explicit decision-domain tool names.

### Evaluate Decision Endpoint

`POST /engine/{engineName}/decision-definition/key/{key}/evaluate`

Request body:
```json
{
  "variables": {
    "age": { "value": 25, "type": "Integer" }
  }
}
```

Response: array of result maps (one per matched rule in the decision table):
```json
[
  { "eligible": { "value": true, "type": "Boolean" } }
]
```

### DMN Fixture for Testing

Create a minimal DMN file as a test fixture:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
             id="eligibility" name="Eligibility" namespace="http://test">
  <decision id="eligibility-decision" name="Eligibility Decision">
    <decisionTable id="dt1">
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
</definitions>
```

### Error Types for Decision Domain

Add to `src/http/errors.ts` if not already present:
- `"DecisionDefinitionNotFoundException"` → hint: "Check the decision definition key is correct and the DMN is deployed."
- `"DecisionEvaluationException"` → hint: "Verify input variables match the decision table's input definitions."

### Delete DMN Decision Definition

To clean up in `afterEach`:
`DELETE /engine/{engineName}/decision-definition/{id}` — use decision definition ID (not key) for deletion.

### Anti-Patterns to Avoid

- ❌ Do NOT confuse decision definition key (string) with decision definition ID (UUID) — evaluate uses key, delete uses ID
- ❌ `afterEach` must delete the deployed decision definition — same `cascade=true` concern as BPMN if instances reference it

### Key File Locations

- `config/tool-manifest.json` — add decision and decisionRequirements groups
- `src/generated/decision/` — generated (do not edit)
- `src/generated/decisionRequirements/` — generated (do not edit)
- `test/integration/decision.test.ts` — new integration test file

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 8.1`
- PRD FR-34, FR-35

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
