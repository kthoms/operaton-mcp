# Story 9.4: CI Enhancements — License Check & Commitlint

Status: review

## Story

As a maintainer of operaton-mcp,
I want the CI workflow to automatically enforce license headers and conventional commit format on every PR,
so that contributors receive immediate, clear feedback when their contribution is missing required headers or uses a non-conforming commit message.

## Acceptance Criteria

1. **Given** a PR is opened with a `.ts` file in `src/` or `test/` missing the Operaton license header **When** `.github/workflows/ci.yml` runs **Then** the `check-license` step fails and prints the offending file paths; the workflow exits non-zero.

2. **Given** a PR is opened with a commit message that does not conform to conventional commits format (e.g., `"fixed stuff"`) **When** `.github/workflows/ci.yml` runs **Then** the `commitlint` step fails with a message identifying the non-conforming commit.

3. **Given** a PR is opened where all `.ts` files have the correct license header and all commits follow conventional commits format **When** `.github/workflows/ci.yml` runs **Then** both `check-license` and `commitlint` steps pass.

4. **Given** `.nvmrc` exists at the project root containing the LTS Node.js version **When** `.github/workflows/ci.yml` sets up Node.js **Then** it reads the version from `.nvmrc` (via `node-version-file: .nvmrc`) rather than a hardcoded version string.

5. **Given** `.commitlintrc.json` (or equivalent) exists at the project root **When** commitlint runs **Then** it enforces conventional commit format with the scopes defined in Story 9.2 (`process`, `task`, `job`, `incident`, `history`, `decision`, `user`, `deploy`, `config`, `ci`, `docs`, `test`) plus an empty scope (scope-less commits permitted).

6. **Given** the CI workflow file is reviewed **When** checking the job structure **Then** `check-license` and `commitlint` run as distinct steps within the existing `build-and-test` job (or a separate `lint` job), not as separate workflows; the existing build and test steps are unchanged.

## Tasks / Subtasks

- [x] Create `.nvmrc` at project root with current LTS Node.js version (e.g., `22`) (AC: 4)
- [x] Update `.github/workflows/ci.yml` to read Node.js version from `.nvmrc` via `node-version-file: .nvmrc` (AC: 4)
- [x] Add `commitlint` dev dependencies: `@commitlint/cli` and `@commitlint/config-conventional` (AC: 2, 5)
- [x] Create `.commitlintrc.json` with `extends: ['@commitlint/config-conventional']` and the defined scope list (AC: 5)
- [x] Add `check:commits` script to `package.json` (e.g., `commitlint --from HEAD~1 --to HEAD`) (AC: 2)
- [x] Add license check step to `.github/workflows/ci.yml` using `npm run check:license` (from Story 9.1) (AC: 1, 3)
- [x] Add commitlint step to `.github/workflows/ci.yml` (AC: 2, 3)
- [x] Verify all existing CI tests still pass (AC: 6)

## Dev Notes

### .nvmrc

```
22
```

Single line, just the major version. `actions/setup-node` with `node-version-file: .nvmrc` reads this correctly.

### ci.yml Changes

Add to the existing `build-and-test` job (after `checkout`, before `npm ci`), or as a separate `lint` job:

```yaml
- name: Check license headers
  run: npm run check:license

- name: Check commit messages
  run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }}
```

For `node-version-file`:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: .nvmrc
```

### .commitlintrc.json

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "scope-enum": [
      2,
      "always",
      [
        "process", "task", "job", "incident", "history",
        "decision", "user", "deploy", "config", "ci", "docs", "test"
      ]
    ],
    "scope-empty": [0]
  }
}
```

`"scope-empty": [0]` means scope is optional (level 0 = disabled), so scope-less commits like `chore: bump dependencies` are valid.

### Dependencies

- Story 9.1 (License Headers) must be complete — `npm run check:license` must exist before this story adds it to CI
- Story 9.2 (CONTRIBUTING.md) documents the scopes enforced here

### Key File Locations

- `.nvmrc` — project root
- `.commitlintrc.json` — project root
- `.github/workflows/ci.yml` — updated
- `package.json` — `check:commits` script added

### References

- PRD: FR-39
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 9.4`
- Story 9.1: `_bmad-output/implementation-artifacts/9-1-license-headers-on-source-files.md`
- Story 9.2: `_bmad-output/implementation-artifacts/9-2-contributing-md.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Build failed after adding license headers to `src/index.ts` because the shebang (`#!/usr/bin/env node`) was pushed to line 15. Fixed by updating `scripts/license-header.ts` to export `hasLicenseHeader()` that accepts shebang files, restoring `src/index.ts` with shebang first, and updating all scripts/tests to use the same logic.

### Completion Notes List

- Created `.nvmrc` with `22` (Node.js LTS major version) at project root (AC 4).
- Updated `.github/workflows/ci.yml`: `node-version: '22'` → `node-version-file: .nvmrc`; added `fetch-depth: 0` for full history; added "Check license headers" step; added "Check commit messages" step (runs only on `pull_request`) (AC 1, 2, 3, 4, 6).
- Added `@commitlint/cli` and `@commitlint/config-conventional` to devDependencies (AC 2, 5).
- Created `.commitlintrc.json` with all 12 Story 9.2 scopes and `scope-empty: [0]` to allow scope-less commits (AC 5).
- Added `check:commits` script to `package.json` (AC 2).
- Also fixed `scripts/license-header.ts` to export `hasLicenseHeader()` for shebang-aware header detection; updated `check-license.ts`, `add-license.ts`, and `license.test.ts` to use it.
- All 43 unit tests pass after changes.

### File List

- `.nvmrc` (new)
- `.commitlintrc.json` (new)
- `.github/workflows/ci.yml` (modified)
- `package.json` (modified — added commitlint devDependencies and check:commits script)
- `scripts/license-header.ts` (modified — added `hasLicenseHeader` export)
- `scripts/check-license.ts` (modified — imports `hasLicenseHeader` from `license-header.ts`)
- `scripts/add-license.ts` (modified — imports `hasLicenseHeader` from `license-header.ts`)
- `src/index.ts` (modified — shebang restored to first line)
- `test/unit/scripts/license.test.ts` (modified — uses shebang-aware `hasLicenseHeader`)
- `package-lock.json` (modified — commitlint packages added)

## Change Log

- 2026-03-18: Implemented Story 9.4 — added .nvmrc, .commitlintrc.json, commitlint dependencies, updated CI workflow with license check and commitlint steps, fixed shebang-aware license header handling.
