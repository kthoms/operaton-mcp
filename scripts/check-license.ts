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

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { hasLicenseHeader } from "./license-header.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

function main(): void {
  const dirs = [
    join(ROOT, "src"),
    join(ROOT, "test"),
    join(ROOT, "scripts"),
  ];

  const missing: string[] = [];

  for (const dir of dirs) {
    const files = collectTsFiles(dir);
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (!hasLicenseHeader(content)) {
        const relative = file.slice(ROOT.length + 1);
        missing.push(relative);
      }
    }
  }

  if (missing.length > 0) {
    console.error(`[check:license] Missing license header in ${missing.length} file(s):`);
    for (const f of missing) {
      console.error(`  ${f}`);
    }
    process.exit(1);
  } else {
    console.log("[check:license] All files have the license header.");
  }
}

main();
