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

// frMapping: FR-01
import { z } from "zod";
import type { OperatonClient } from "../http/client.js";

export const deploymentCreateInputSchema = z.object({
  "deployment-name": z.string().describe("Name for this deployment (e.g. 'loan-approval-v2')"),
  "bpmn-content": z.string().describe("BPMN 2.0 XML content as a string"),
  "bpmn-filename": z.string().optional().describe("Filename for the BPMN resource (default: process.bpmn)"),
  "deployment-source": z.string().optional().describe("Source identifier for this deployment (e.g. 'git', 'manual')"),
  "tenant-id": z.string().optional().describe("Tenant ID for multi-tenant deployments"),
});

export async function deploymentCreate(
  input: z.infer<typeof deploymentCreateInputSchema>,
  client: OperatonClient,
): Promise<{ isError?: boolean; content: Array<{ type: "text"; text: string }> }> {
  const validated = deploymentCreateInputSchema.parse(input);

  const fields: Record<string, string> = {
    "deployment-name": validated["deployment-name"],
    [validated["bpmn-filename"] ?? "process.bpmn"]: validated["bpmn-content"],
  };
  if (validated["deployment-source"]) {
    fields["deployment-source"] = validated["deployment-source"];
  }
  if (validated["tenant-id"]) {
    fields["tenant-id"] = validated["tenant-id"];
  }

  const response = await client.postMultipart(
    "/engine/{engineName}/deployment/create",
    fields,
  );

  return {
    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
  };
}
