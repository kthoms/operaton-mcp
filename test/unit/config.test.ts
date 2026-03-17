import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => {
        throw new Error("process.exit called");
      });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns Config when all required env vars are set", () => {
    process.env["OPERATON_BASE_URL"] = "http://localhost:8080/engine-rest";
    process.env["OPERATON_USERNAME"] = "admin";
    process.env["OPERATON_PASSWORD"] = "admin";
    process.env["OPERATON_ENGINE"] = "my-engine";

    const config = loadConfig();

    expect(config.baseUrl).toBe("http://localhost:8080/engine-rest");
    expect(config.username).toBe("admin");
    expect(config.password).toBe("admin");
    expect(config.engineName).toBe("my-engine");
    expect(config.skipHealthCheck).toBe(false);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("defaults engineName to 'default' when OPERATON_ENGINE is unset", () => {
    process.env["OPERATON_BASE_URL"] = "http://localhost:8080/engine-rest";
    process.env["OPERATON_USERNAME"] = "admin";
    process.env["OPERATON_PASSWORD"] = "admin";
    delete process.env["OPERATON_ENGINE"];

    const config = loadConfig();
    expect(config.engineName).toBe("default");
  });

  it("sets skipHealthCheck=true when OPERATON_SKIP_HEALTH_CHECK=true", () => {
    process.env["OPERATON_BASE_URL"] = "http://localhost:8080/engine-rest";
    process.env["OPERATON_USERNAME"] = "admin";
    process.env["OPERATON_PASSWORD"] = "admin";
    process.env["OPERATON_SKIP_HEALTH_CHECK"] = "true";

    const config = loadConfig();
    expect(config.skipHealthCheck).toBe(true);
  });

  it("exits with error when OPERATON_BASE_URL is missing", () => {
    delete process.env["OPERATON_BASE_URL"];
    process.env["OPERATON_USERNAME"] = "admin";
    process.env["OPERATON_PASSWORD"] = "admin";

    expect(() => loadConfig()).toThrow("process.exit called");
    expect(errorSpy).toHaveBeenCalledWith(
      "[operaton-mcp] Missing required env var: OPERATON_BASE_URL",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits with error when OPERATON_USERNAME is missing", () => {
    process.env["OPERATON_BASE_URL"] = "http://localhost:8080/engine-rest";
    delete process.env["OPERATON_USERNAME"];
    process.env["OPERATON_PASSWORD"] = "admin";

    expect(() => loadConfig()).toThrow("process.exit called");
    expect(errorSpy).toHaveBeenCalledWith(
      "[operaton-mcp] Missing required env var: OPERATON_USERNAME",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits with error when OPERATON_PASSWORD is missing", () => {
    process.env["OPERATON_BASE_URL"] = "http://localhost:8080/engine-rest";
    process.env["OPERATON_USERNAME"] = "admin";
    delete process.env["OPERATON_PASSWORD"];

    expect(() => loadConfig()).toThrow("process.exit called");
    expect(errorSpy).toHaveBeenCalledWith(
      "[operaton-mcp] Missing required env var: OPERATON_PASSWORD",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
