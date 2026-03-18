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

// Hand-written tool overrides for operations requiring special treatment
// (e.g. multipart uploads, complex request shaping)
import { z } from "zod";
import type { OperatonClient } from "../http/client.js";
import {
  deploymentCreate,
  deploymentCreateInputSchema,
} from "./deployment.js";

export interface CustomToolEntry {
  name: string;
  description: string;
  group: string;
  schema: z.ZodObject<z.ZodRawShape>;
  handler: (input: Record<string, unknown>, client: OperatonClient) => Promise<{ isError?: boolean; content: Array<{ type: "text"; text: string }> }>;
}

export function getCustomTools(client: OperatonClient): CustomToolEntry[] {
  return [
    {
      name: "deployment_create",
      description:
        "Deploy a BPMN or DMN artifact to Operaton. Provide the XML content, filename (.bpmn or .dmn), and a deployment name. Returns deployment ID and deployed definition keys.",
      group: "deployment",
      schema: deploymentCreateInputSchema,
      handler: (input, _client) =>
        deploymentCreate(input as z.infer<typeof deploymentCreateInputSchema>, _client),
    },
  ];
  void client;
}
