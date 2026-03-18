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
import { normalize } from "../../../src/http/errors.js";

describe("normalize", () => {
  it("normalizes ProcessEngineException with BPM hint", () => {
    const body = { type: "ProcessEngineException", message: "Engine error" };
    const result = normalize(body);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain("[ProcessEngineException]");
    expect(result.content[0]?.text).toContain("Engine error");
    expect(result.content[0]?.text).toContain("Suggested action:");
    expect(result.content[0]?.text).toContain("process engine");
  });

  it("normalizes NotFoundException with correct hint", () => {
    const body = { type: "NotFoundException", message: "Process not found" };
    const result = normalize(body);
    expect(result.content[0]?.text).toContain("[NotFoundException]");
    expect(result.content[0]?.text).toContain("Process not found");
    expect(result.content[0]?.text).toContain("resource ID");
  });

  it("normalizes AuthorizationException with permissions hint", () => {
    const body = { type: "AuthorizationException", message: "Access denied" };
    const result = normalize(body);
    expect(result.content[0]?.text).toContain("[AuthorizationException]");
    expect(result.content[0]?.text).toContain("permissions");
  });

  it("normalizes TaskAlreadyClaimedException with unclaim hint", () => {
    const body = { type: "TaskAlreadyClaimedException", message: "Task claimed" };
    const result = normalize(body);
    expect(result.content[0]?.text).toContain("[TaskAlreadyClaimedException]");
    expect(result.content[0]?.text).toContain("unclaim");
  });

  it("uses __unknown__ fallback for unrecognized error types", () => {
    const body = { type: "SomeWeirdException", message: "Something failed" };
    const result = normalize(body);
    expect(result.content[0]?.text).toContain("[SomeWeirdException]");
    expect(result.content[0]?.text).toContain("Suggested action:");
    expect(result.content[0]?.text).toContain("logs");
  });

  it("uses __unknown__ fallback when type field is missing", () => {
    const body = { message: "No type field" };
    const result = normalize(body);
    expect(result.content[0]?.text).toContain("[__unknown__]");
  });

  it("preserves raw body for unknown string errors", () => {
    const result = normalize("raw error string");
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("raw error string");
  });
});
