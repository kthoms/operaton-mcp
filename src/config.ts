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

export interface Config {
  baseUrl: string;
  username: string;
  password: string;
  engineName: string;
  skipHealthCheck: boolean;
}

export function loadConfig(): Config {
  const required: Array<keyof Pick<Config, "baseUrl" | "username" | "password">> = [];
  const baseUrl = process.env["OPERATON_BASE_URL"];
  const username = process.env["OPERATON_USERNAME"];
  const password = process.env["OPERATON_PASSWORD"];

  if (!baseUrl) {
    console.error("[operaton-mcp] Missing required env var: OPERATON_BASE_URL");
    process.exit(1);
  }
  if (!username) {
    console.error("[operaton-mcp] Missing required env var: OPERATON_USERNAME");
    process.exit(1);
  }
  if (!password) {
    console.error("[operaton-mcp] Missing required env var: OPERATON_PASSWORD");
    process.exit(1);
  }

  void required;

  return {
    baseUrl,
    username,
    password,
    engineName: process.env["OPERATON_ENGINE"] ?? "default",
    skipHealthCheck: process.env["OPERATON_SKIP_HEALTH_CHECK"] === "true",
  };
}
