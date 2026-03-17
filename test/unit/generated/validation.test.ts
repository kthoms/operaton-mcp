import { describe, it, expect } from "vitest";
import { validateManifestOperationIds } from "../../../scripts/generate.js";

const mockSpec = new Map([
  ["getProcessDefinitions", { path: "/process-definition", method: "get", parameters: [], hasRequestBody: false }],
  ["getTasks", { path: "/task", method: "get", parameters: [], hasRequestBody: false }],
]);

describe("validateManifestOperationIds", () => {
  it("returns empty array when all operationIds are valid", () => {
    const manifest = {
      getProcessDefinitions: { name: "x", description: "x", expose: true, tags: ["x"], frMapping: [] },
      getTasks: { name: "y", description: "y", expose: true, tags: ["y"], frMapping: [] },
    };
    const unknowns = validateManifestOperationIds(manifest, mockSpec);
    expect(unknowns).toHaveLength(0);
  });

  it("returns unknown operationIds when manifest references nonexistent operations", () => {
    const manifest = {
      getProcessDefinitions: { name: "x", description: "x", expose: true, tags: ["x"], frMapping: [] },
      nonExistentOperation: { name: "z", description: "z", expose: true, tags: ["z"], frMapping: [] },
    };
    const unknowns = validateManifestOperationIds(manifest, mockSpec);
    expect(unknowns).toHaveLength(1);
    expect(unknowns[0]).toBe("nonExistentOperation");
  });

  it("returns all unknown operationIds when manifest is entirely invalid", () => {
    const manifest = {
      fakeOp1: { name: "a", description: "a", expose: true, tags: ["a"], frMapping: [] },
      fakeOp2: { name: "b", description: "b", expose: true, tags: ["b"], frMapping: [] },
    };
    const unknowns = validateManifestOperationIds(manifest, mockSpec);
    expect(unknowns).toHaveLength(2);
  });
});
