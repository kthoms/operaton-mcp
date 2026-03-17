import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";
import { checkConnectivity, createOperatonClient } from "../../../src/http/client.js";
import type { Config } from "../../../src/config.js";

const baseConfig: Config = {
  baseUrl: "http://localhost:8080/engine-rest",
  username: "admin",
  password: "admin",
  engineName: "default",
  skipHealthCheck: false,
};

describe("createOperatonClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects correct Basic Auth header", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "123" }), { status: 200 }),
    );

    const client = createOperatonClient(baseConfig);
    await client.get("/engine/{engineName}/process-definition");

    const call = fetchSpy.mock.calls[0];
    expect(call).toBeDefined();
    const options = call![1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    const expectedAuth =
      "Basic " + Buffer.from("admin:admin").toString("base64");
    expect(headers["Authorization"]).toBe(expectedAuth);
  });

  it("resolves {engineName} placeholder in path", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const config: Config = { ...baseConfig, engineName: "my-engine" };
    const client = createOperatonClient(config);
    await client.get("/engine/{engineName}/process-definition");

    const call = fetchSpy.mock.calls[0];
    const url = call![0] as string;
    expect(url).toContain("/engine/my-engine/process-definition");
    expect(url).not.toContain("{engineName}");
  });

  it("returns parsed JSON on successful response", async () => {
    const payload = [{ id: "abc", name: "My Process" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    const client = createOperatonClient(baseConfig);
    const result = await client.get("/engine/{engineName}/process-definition");

    expect(result).toEqual(payload);
  });

  it("returns normalized McpToolError on 4xx response", async () => {
    const errorBody = {
      type: "NotFoundException",
      message: "Process definition not found",
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(errorBody), { status: 404 }),
    );

    const client = createOperatonClient(baseConfig);
    const result = (await client.get(
      "/engine/{engineName}/process-definition/nonexistent",
    )) as { isError: boolean; content: Array<{ text: string }> };

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("[NotFoundException]");
    expect(result.content[0]?.text).toContain("Suggested action:");
  });
});

describe("checkConnectivity", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips check when skipHealthCheck is true", async () => {
    const config: Config = { ...baseConfig, skipHealthCheck: true };
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await checkConnectivity(config);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs warning when fetch throws (unreachable host)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    await checkConnectivity(baseConfig);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[operaton-mcp] Warning: Cannot reach Operaton at"),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("curl -u $OPERATON_USERNAME:$OPERATON_PASSWORD"),
    );
  });

  it("logs warning on non-2xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );

    await checkConnectivity(baseConfig);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[operaton-mcp] Warning: Cannot reach Operaton at"),
    );
  });

  it("does not log when connectivity check succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ name: "default" }]), { status: 200 }),
    );

    await checkConnectivity(baseConfig);

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
