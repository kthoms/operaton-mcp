# Story 9.1: License Headers on Source Files

Status: review

## Story

As a contributor to operaton-mcp,
I want every source file in `src/` and `test/` to carry the Operaton Apache 2.0 license header with the correct copyright notice,
so that the project's licensing is immediately clear to anyone reading the code and complies with Operaton community standards.

## Acceptance Criteria

1. **Given** any `.ts` file in `src/` or `test/` is opened **When** inspecting the first lines **Then** it begins with the Operaton Apache 2.0 license header using `//` comment syntax, exactly matching the format below — no blank line before the header, no deviation from the copyright text:
   ```
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
   ```

2. **Given** the license header check runs in CI (`npm run check:license` or equivalent) **When** a file in `src/` or `test/` is missing the header **Then** the check exits non-zero and prints the offending file paths.

3. **Given** a new `.ts` file is added to `src/` or `test/` without the header **When** CI runs on the PR **Then** the license check step fails and blocks merge.

4. **Given** `scripts/` contains helper scripts (e.g., `generate.ts`) **When** checking for license headers **Then** they also carry the header (same format).

5. **Given** generated files under `src/generated/` are inspected **When** the generation pipeline runs **Then** each emitted `.ts` file includes the Operaton license header as its first block (prepended by the generator, not manually edited).

## Tasks / Subtasks

- [x] Add license header tool to dev dependencies — e.g., `addlicense` (Go) via npm wrapper or equivalent JS tool that supports SPDX headers (AC: 2, 3)
  - [x] Add `check:license` script to `package.json`: checks all `src/**/*.ts` and `test/**/*.ts`
  - [x] Add `add:license` script: inserts header into all files missing it
- [x] Run `add:license` to insert header into all existing `.ts` files in `src/`, `test/`, `scripts/` (AC: 1, 4)
  - [x] Verify header text exactly matches the Operaton format (copyright line, URL, disclaimer)
- [x] Update code generation pipeline (`scripts/generate.ts`) to prepend the license header to every emitted `.ts` file (AC: 5)
  - [x] Confirm generated files under `src/generated/` carry the header after `npm run generate`
- [x] Verify all existing tests still pass after header addition (AC: 1)

## Dev Notes

### License Header Format

Exact header (TypeScript `//` comment style):

```typescript
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
```

Reference: https://github.com/operaton/operaton/blob/main/CONTRIBUTING.md#license-header

### CI Integration

The `check:license` script is added to the existing `ci.yml` workflow in Story 9.4. This story only introduces the headers and the npm script — the CI integration is part of Story 9.4.

### Code Generation

In `scripts/generate.ts`, prepend the header to each emitted file:

```typescript
const LICENSE_HEADER = `// Copyright Operaton contributors.\n//\n// Licensed under the Apache License, Version 2.0...`

// When writing a generated file:
await fs.writeFile(outputPath, LICENSE_HEADER + '\n' + generatedContent)
```

### Key File Locations

- `src/**/*.ts` — all source files
- `test/**/*.ts` — all test files
- `scripts/**/*.ts` — build/generation scripts
- `src/generated/**/*.ts` — generated files (header added by generator)
- `package.json` — `check:license` and `add:license` scripts

### Dependencies

- Story 9.4 (CI Enhancement) adds `check:license` to the CI workflow

### References

- PRD: FR-36
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 9.1`
- Reference: https://github.com/operaton/operaton/blob/main/CONTRIBUTING.md#license-header

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Implemented `scripts/license-header.ts` as a shared module exporting the exact `LICENSE_HEADER` constant — single source of truth used by all scripts and the generator.
- Implemented `scripts/check-license.ts` that checks `src/`, `test/`, `scripts/` for `.ts` files missing the header; exits non-zero and prints offending paths.
- Implemented `scripts/add-license.ts` that inserts the header into all `.ts` files in `src/`, `test/`, `scripts/` that are missing it.
- Added `check:license` and `add:license` scripts to `package.json` (uses `node --import tsx/esm`).
- Updated `scripts/generate.ts` to import `LICENSE_HEADER` from `./license-header.js` and prepend it to every emitted `.ts` file (operation files, group barrels, top-level barrel).
- Ran `npm run add:license` — added headers to 239 files (all existing src/test/scripts files).
- Ran `npm run generate` — regenerated all generated files with embedded headers.
- `npm run check:license` exits 0 — all files covered.
- All 43 unit tests pass (no regressions; 9 new tests added for license header coverage).

### File List

- `scripts/license-header.ts` (new)
- `scripts/check-license.ts` (new)
- `scripts/add-license.ts` (new)
- `scripts/generate.ts` (modified — added LICENSE_HEADER import and prepend to all emitters)
- `package.json` (modified — added `check:license` and `add:license` scripts)
- `src/**/*.ts` (all modified — license header added)
- `test/**/*.ts` (all modified — license header added)
- `test/unit/scripts/license.test.ts` (new)
- `test/unit/generated/generation.test.ts` (modified — added 3 license header tests)

## Change Log

- 2026-03-18: Implemented Story 9.1 — added Operaton Apache 2.0 license headers to all TypeScript source files, test files, and scripts; implemented check:license and add:license npm scripts; updated code generator to embed headers in all emitted files.
