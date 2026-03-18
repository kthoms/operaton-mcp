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
