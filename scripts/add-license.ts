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

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { LICENSE_HEADER, hasLicenseHeader } from "./license-header.js";

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

function addHeaderIfMissing(filePath: string): boolean {
  const content = readFileSync(filePath, "utf8");
  if (hasLicenseHeader(content)) return false;

  let newContent: string;
  if (content.startsWith("#!")) {
    // Keep shebang as first line, insert header immediately after
    const newlinePos = content.indexOf("\n");
    const shebang = content.slice(0, newlinePos + 1);
    const rest = content.slice(newlinePos + 1);
    newContent = shebang + LICENSE_HEADER + "\n\n" + rest;
  } else {
    newContent = LICENSE_HEADER + "\n\n" + content;
  }

  writeFileSync(filePath, newContent);
  return true;
}

function main(): void {
  const dirs = [
    join(ROOT, "src"),
    join(ROOT, "test"),
    join(ROOT, "scripts"),
  ];

  let added = 0;

  for (const dir of dirs) {
    const files = collectTsFiles(dir);
    for (const file of files) {
      if (addHeaderIfMissing(file)) {
        const relative = file.slice(ROOT.length + 1);
        console.log(`[add:license] Added header: ${relative}`);
        added++;
      }
    }
  }

  if (added === 0) {
    console.log("[add:license] All files already have the license header.");
  } else {
    console.log(`[add:license] Added license header to ${added} file(s).`);
  }
}

main();
