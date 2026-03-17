import type { Config } from "../config.js";
import { normalize } from "./errors.js";
import type { McpToolError } from "./errors.js";

export interface OperatonClient {
  get(path: string): Promise<unknown>;
  post(path: string, body?: unknown): Promise<unknown>;
  postMultipart(path: string, fields: Record<string, string>): Promise<unknown>;
  put(path: string, body?: unknown): Promise<unknown>;
  delete(path: string): Promise<unknown>;
}

export function createOperatonClient(config: Config): OperatonClient {
  const authHeader =
    "Basic " +
    Buffer.from(`${config.username}:${config.password}`).toString("base64");

  const baseUrl = config.baseUrl.replace(/\/$/, "");

  function resolvePath(path: string): string {
    return path.replace("{engineName}", config.engineName);
  }

  async function request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const resolvedPath = resolvePath(path);
    const url = `${baseUrl}${resolvedPath}`;
    const headers: Record<string, string> = {
      Authorization: authHeader,
      Accept: "application/json",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const text = await response.text();
      let errorBody: unknown;
      try {
        errorBody = JSON.parse(text) as unknown;
      } catch {
        errorBody = text;
      }
      return normalize(errorBody) as McpToolError;
    }
    const text = await response.text();
    return text ? (JSON.parse(text) as unknown) : null;
  }

  async function requestMultipart(path: string, fields: Record<string, string>): Promise<unknown> {
    const resolvedPath = resolvePath(path);
    const url = `${baseUrl}${resolvedPath}`;
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      const blobContent = new Blob([value], { type: "application/octet-stream" });
      form.append(key, blobContent, key);
    }
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, Accept: "application/json" },
      body: form,
    });
    if (!response.ok) {
      const text = await response.text();
      let errorBody: unknown;
      try {
        errorBody = JSON.parse(text) as unknown;
      } catch {
        errorBody = text;
      }
      return normalize(errorBody) as McpToolError;
    }
    const text = await response.text();
    return text ? (JSON.parse(text) as unknown) : null;
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    postMultipart: (path, fields) => requestMultipart(path, fields),
    put: (path, body) => request("PUT", path, body),
    delete: (path) => request("DELETE", path),
  };
}

export async function checkConnectivity(config: Config): Promise<void> {
  if (config.skipHealthCheck) {
    return;
  }

  const authHeader =
    "Basic " +
    Buffer.from(`${config.username}:${config.password}`).toString("base64");
  const url = config.baseUrl.replace(/\/$/, "");

  try {
    const response = await fetch(`${url}/engine`, {
      headers: { Authorization: authHeader },
    });
    if (!response.ok) {
      console.error(
        `[operaton-mcp] Warning: Cannot reach Operaton at ${url}. Verify with: curl -u $OPERATON_USERNAME:$OPERATON_PASSWORD $OPERATON_BASE_URL/engine`,
      );
    }
  } catch {
    console.error(
      `[operaton-mcp] Warning: Cannot reach Operaton at ${url}. Verify with: curl -u $OPERATON_USERNAME:$OPERATON_PASSWORD $OPERATON_BASE_URL/engine`,
    );
  }
}
