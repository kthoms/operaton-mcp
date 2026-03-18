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
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../..");

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectTsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        results.push(fullPath);
      }
    }
  } catch {
    // directory may not exist
  }
  return results;
}

const LICENSE_START = "// Copyright Operaton contributors.";
const LICENSE_URL = "https://www.apache.org/licenses/LICENSE-2.0";

/** Mirrors the hasLicenseHeader logic from scripts/license-header.ts */
function hasLicenseHeader(content: string): boolean {
  if (content.startsWith(LICENSE_START)) return true;
  if (content.startsWith("#!")) {
    const newlinePos = content.indexOf("\n");
    if (newlinePos === -1) return false;
    return content.slice(newlinePos + 1).startsWith(LICENSE_START);
  }
  return false;
}

describe("license headers", () => {
  it("all src TypeScript files start with the Operaton license header", () => {
    const files = collectTsFiles(join(ROOT, "src"));
    expect(files.length).toBeGreaterThan(0);
    const missing = files.filter((f) => !hasLicenseHeader(readFileSync(f, "utf8")));
    expect(missing).toEqual([]);
  });

  it("all test TypeScript files start with the Operaton license header", () => {
    const files = collectTsFiles(join(ROOT, "test"));
    expect(files.length).toBeGreaterThan(0);
    const missing = files.filter((f) => !hasLicenseHeader(readFileSync(f, "utf8")));
    expect(missing).toEqual([]);
  });

  it("all scripts TypeScript files start with the Operaton license header", () => {
    const files = collectTsFiles(join(ROOT, "scripts"));
    expect(files.length).toBeGreaterThan(0);
    const missing = files.filter((f) => !hasLicenseHeader(readFileSync(f, "utf8")));
    expect(missing).toEqual([]);
  });

  it("license header includes Apache 2.0 URL", () => {
    const indexTs = readFileSync(join(ROOT, "src/index.ts"), "utf8");
    expect(indexTs).toContain(LICENSE_URL);
  });

  it("hasLicenseHeader returns true for a valid header", () => {
    const validHeader = "// Copyright Operaton contributors.\n//\n// Licensed under the Apache License, Version 2.0";
    expect(hasLicenseHeader(validHeader)).toBe(true);
  });

  it("hasLicenseHeader returns false for a file missing the header", () => {
    expect(hasLicenseHeader('export const x = 1;\n')).toBe(false);
  });

  it("hasLicenseHeader returns true for shebang files with header on line 2", () => {
    const content = "#!/usr/bin/env node\n// Copyright Operaton contributors.\n//\n// Licensed under the Apache License, Version 2.0";
    expect(hasLicenseHeader(content)).toBe(true);
  });
});
