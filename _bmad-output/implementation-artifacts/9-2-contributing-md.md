# Story 9.2: CONTRIBUTING.md

Status: review

## Story

As a contributor to operaton-mcp,
I want a CONTRIBUTING.md that tells me exactly how to set up the project, write commits, and run tests,
so that I can contribute without needing to ask questions or reverse-engineer the project conventions.

## Acceptance Criteria

1. **Given** `CONTRIBUTING.md` is opened **When** inspecting the top of the file **Then** it begins with the Operaton Apache 2.0 license header in Markdown comment form (HTML comment block: `<!-- ... -->`), exactly matching the operaton/operaton CONTRIBUTING.md reference format.

2. **Given** `CONTRIBUTING.md` is reviewed **When** checking the conventional commits section **Then** it contains a scope table listing all defined scopes with their coverage areas, at minimum:

   | Scope | Covers |
   |---|---|
   | `process` | process definitions, instances |
   | `task` | user tasks |
   | `job` | jobs, job definitions |
   | `incident` | incident management |
   | `history` | historic data queries |
   | `decision` | DMN / decision tables |
   | `user` | users & groups |
   | `deploy` | deployments |
   | `config` | connection config, env vars |
   | `ci` | GitHub Actions, release workflow |
   | `docs` | README, CONTRIBUTING, any docs |
   | `test` | test files only |

3. **Given** `CONTRIBUTING.md` is reviewed **When** checking the conventional commits section **Then** it includes at least 4 concrete examples covering `feat`, `fix`, `chore`, and `docs` types with real scope values, e.g.:
   - `feat(process): add bulk suspend endpoint`
   - `fix(incident): handle null incident message on resolve`
   - `chore(ci): add commitlint to PR workflow`
   - `docs(deploy): document deployment ID return format`

4. **Given** `CONTRIBUTING.md` is reviewed **When** checking for a link to the spec **Then** a link to `https://www.conventionalcommits.org/` is present in the conventional commits section.

5. **Given** `CONTRIBUTING.md` is reviewed **When** checking the contributor workflow section **Then** it covers: forking, cloning, `npm install`, `npm run build`, `npm test`, opening a PR — in that order.

6. **Given** `CONTRIBUTING.md` is reviewed **When** checking the development section **Then** it documents: running tests (`npm test`, `npm run test:integration`), the `OPERATON_SKIP_HEALTH_CHECK=true` dev mode flag, and the code generation pipeline (`npm run generate`).

## Tasks / Subtasks

- [x] Create `CONTRIBUTING.md` with Operaton license header in HTML comment block at top (AC: 1)
- [x] Add contributor workflow section: fork → clone → install → build → test → PR (AC: 5)
- [x] Add conventional commits section with scope table (AC: 2)
- [x] Add 4+ commit message examples with real scope values (AC: 3)
- [x] Add link to conventionalcommits.org spec (AC: 4)
- [x] Add development section: test commands, `OPERATON_SKIP_HEALTH_CHECK`, `npm run generate` (AC: 6)

## Dev Notes

### License Header Format for Markdown

The Operaton license header appears as an HTML comment block at the very top of `CONTRIBUTING.md`, before any other content:

```markdown
<!--
  Copyright Operaton contributors.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at:

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

# Contributing to operaton-mcp
```

Reference: https://github.com/operaton/operaton/blob/main/CONTRIBUTING.md

### Document Structure

Recommended section order:
1. License header (HTML comment)
2. `# Contributing to operaton-mcp`
3. Getting Started (fork, clone, install, build)
4. Development (test commands, OPERATON_SKIP_HEALTH_CHECK, code generation)
5. Commit Conventions (scope table, examples, link to spec)
6. Submitting a PR

### Key File Locations

- `CONTRIBUTING.md` — project root

### Dependencies

- Story 9.1 (License Headers) — establishes the Operaton header format used in this document

### References

- PRD: FR-37
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 9.2`
- Reference: https://github.com/operaton/operaton/blob/main/CONTRIBUTING.md
- Spec: https://www.conventionalcommits.org/

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Created `CONTRIBUTING.md` at project root with all required sections.
- License header present as HTML comment block at top of file (AC 1).
- Contributor workflow covers fork → clone → npm install → npm run build → npm test → open PR in that order (AC 5).
- Development section documents `npm test`, `npm run test:integration`, `OPERATON_SKIP_HEALTH_CHECK=true`, and `npm run generate` (AC 6).
- Commit conventions section includes full scope table with all 12 required scopes (AC 2).
- 4 concrete examples covering feat, fix, chore, docs types with real scope values (AC 3).
- Link to https://www.conventionalcommits.org/ in commit conventions section (AC 4).
- Also documented `add:license` / `check:license` scripts in the license headers section.

### File List

- `CONTRIBUTING.md` (new)

## Change Log

- 2026-03-18: Implemented Story 9.2 — created CONTRIBUTING.md with license header, contributor workflow, development guide, and commit conventions.
