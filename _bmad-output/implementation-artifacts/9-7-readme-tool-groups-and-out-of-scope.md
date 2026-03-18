# Story 9.7: README Tool Groups & Out-of-Scope Section

Status: review

## Story

As a user evaluating or setting up operaton-mcp,
I want the README to show me exactly which tool groups are available, what operations each group covers, and what is explicitly not supported,
so that I can quickly determine whether operaton-mcp meets my needs and what to expect from it.

## Acceptance Criteria

1. **Given** `README.md` is reviewed **When** checking the Available Tool Groups section **Then** it lists all 9 MCP tool groups, each with:
   - Group name (matching the tool naming convention: `processDefinition`, `processInstance`, `task`, `job`, `incident`, `user`, `history`, `decision`, `deployment`)
   - A one-line description of the group
   - A bullet list of the key operations available (matching the FR-level operations, not low-level API paths)

2. **Given** `README.md` is reviewed **When** checking the tool groups section **Then** the 9 groups and their operations are:

   | Group | Operations |
   |---|---|
   | `processDefinition` | list, get by ID/key, get XML, get statistics, suspend by key, delete by ID/key, restart instances |
   | `deployment` | create, list, get, get resources, redeploy, delete, count |
   | `processInstance` | start, list, get, suspend, resume, delete, get/set variables, get activity tree |
   | `task` | list, get, claim, unclaim, complete, delegate, resolve, set assignee, get/set variables, create, update, throw BPMN error |
   | `job` | list, get, trigger execution, suspend, resume, set retries, get stack trace |
   | `incident` | list, get, resolve, count |
   | `user` | list, get profile, create, update profile, update password, delete, unlock |
   | `history` | list process instances, list activity instances, list task instances, list variable instances, list incidents, list job logs, list user operations |
   | `decision` | list, get, get XML, evaluate, list requirements |

3. **Given** `README.md` is reviewed **When** checking for an out-of-scope section **Then** it contains an explicit "Out of Scope" (or "What's Not Included") section listing at minimum:
   - Autonomous/proactive process monitoring and alerting
   - BPMN generation from natural language (Growth feature)
   - Multi-engine support
   - Any UI, dashboard, or web interface
   - Prompt templates and guided workflows

4. **Given** `README.md` is reviewed **When** checking the out-of-scope section **Then** it references Growth and Vision phases to signal these capabilities are planned, not permanently excluded.

5. **Given** `README.md` is reviewed **When** checking the existing sections from Story 1.6 **Then** all 5 original sections (Install & Run, Environment Variables, MCP Client Configuration, Available Tool Groups, Development) are still present and unchanged in content — this story only expands the "Available Tool Groups" section and adds the out-of-scope section.

## Tasks / Subtasks

- [x] Expand the "Available Tool Groups" section in `README.md` with all 9 tool groups, per-group descriptions, and operations lists (AC: 1, 2)
  - [x] `processDefinition` — list, get, XML, statistics, suspend, delete, restart
  - [x] `deployment` — create, list, get, get resources, redeploy, delete, count
  - [x] `processInstance` — start, list, get, suspend, resume, delete, variables, activity tree
  - [x] `task` — full lifecycle: list, get, claim, unclaim, complete, delegate, resolve, assign, variables, create, update, throw error
  - [x] `job` — list, get, trigger, suspend, resume, retries, stack trace
  - [x] `incident` — list, get, resolve, count
  - [x] `user` — list, get profile, create, update, delete, unlock
  - [x] `history` — process instances, activity instances, task instances, variable instances, incidents, job logs, user operations
  - [x] `decision` — list, get, get XML, evaluate, list requirements
- [x] Add "Out of Scope" section to `README.md` with Growth/Vision feature list (AC: 3, 4)
- [x] Verify original 5 sections from Story 1.6 are preserved intact (AC: 5)

## Dev Notes

### README Structure After This Story

```
# operaton-mcp

## Install & Run                         ← Story 1.6 (unchanged)
## Environment Variables                 ← Story 1.6 (unchanged)
## MCP Client Configuration              ← Story 1.6 (unchanged)
## Available Tool Groups                 ← EXPANDED by this story
## Out of Scope                          ← NEW section
## Development                           ← Story 1.6 (unchanged)
```

### Available Tool Groups Format

Each group entry should follow this pattern:

```markdown
### `processDefinition`

Manage deployed process definitions — browse, inspect, suspend, and delete BPMN definitions.

- **list** — query definitions with optional filters (key, name, version, tenant)
- **get by ID/key** — retrieve metadata and BPMN XML for a specific definition
- **statistics** — activity-level statistics across running instances
- **suspend by key** — suspend or resume all instances for a definition
- **delete** — remove a definition by ID or key
- **restart instances** — restart historic process instances from a definition
```

### Tool Naming Convention

Tool names follow `{groupName}_{verbNoun}` camelCase format (defined in manifest). The README uses the group names as-is. Do not invent tool names that don't exist — cross-reference with `config/tool-manifest.json` for actual tool names when listing operations.

### Out of Scope Section

```markdown
## Out of Scope

The following capabilities are not available in the current release:

- **Autonomous monitoring** — AI-initiated process health watching and alerting (planned: Vision phase)
- **BPMN generation** — natural language → BPMN authoring and AI-assisted process design (planned: Growth phase)
- **Multi-engine support** — connecting to multiple Operaton instances simultaneously (planned: Growth phase)
- **Prompt templates** — guided scenario workflows for common operational tasks (planned: Growth phase)
- **UI or dashboard** — no web interface; operaton-mcp is a pure MCP server

Growth and Vision phase features are tracked in the project roadmap.
```

### Cross-Reference with Manifest

Before writing the operations list for each group, check `config/tool-manifest.json` to ensure listed operations match actual implemented tools. The FR coverage and tool manifest are the source of truth — do not document tools that are not in the manifest.

### Key File Locations

- `README.md` — updated

### Dependencies

- Story 1.6 (CI Workflows & npm Publishing) must be complete — this story extends the README created there
- All Epic 2–8 stories should be complete or in review before this story is implemented, so the tool manifest is fully populated

### References

- PRD: FR-42, Product Scope (Out of Scope section)
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 9.7`
- Story 1.6: `_bmad-output/implementation-artifacts/1-6-ci-workflows-and-npm-publishing-configuration.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Cross-referenced `config/tool-manifest.json` to verify actual exposed operations per group before writing descriptions.
- Noted that `deployment_create` is a custom hand-written tool in `src/tools/deployment.ts` (not in the generated manifest) but IS exposed as `deployment_create` MCP tool.

### Completion Notes List

- Expanded `README.md` "Available Tool Groups" section with detailed per-group entries for all 11 exposed groups (9 required + jobDefinition + group) including descriptions and operation bullet lists (AC 1, 2).
- All 9 required groups (processDefinition, deployment, processInstance, task, job, incident, user, history, decision) have detailed operation lists cross-referenced with `config/tool-manifest.json` (AC 2).
- Added "Out of Scope" section after "Available Tool Groups" with 5 out-of-scope items referencing Growth and Vision phases (AC 3, 4).
- All original sections (Install & Run, Environment Variables, MCP Client Configuration, Example Prompts, Development, Project Structure) preserved unchanged (AC 5).
- All 44 unit tests pass.

### File List

- `README.md` (modified — Available Tool Groups section expanded, Out of Scope section added)

## Change Log

- 2026-03-18: Implemented Story 9.7 — expanded README with detailed per-group tool documentation and added Out of Scope section.
