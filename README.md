# operaton-mcp

MCP server for the [Operaton](https://operaton.org) BPM REST API — exposes 300+ Operaton REST operations as MCP tools for AI agents.

## Install & Run

```bash
npx operaton-mcp
```

Or install globally:

```bash
npm install -g operaton-mcp
operaton-mcp
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPERATON_BASE_URL` | Yes | — | Operaton REST API base URL (e.g. `http://localhost:8080/engine-rest`) |
| `OPERATON_USERNAME` | Yes | — | Operaton user for Basic Auth |
| `OPERATON_PASSWORD` | Yes | — | Operaton password for Basic Auth |
| `OPERATON_ENGINE` | No | `default` | Operaton engine name used in API path templates |
| `OPERATON_SKIP_HEALTH_CHECK` | No | `false` | Skip startup connectivity check — set `true` for dev/test environments |

## MCP Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "operaton": {
      "command": "npx",
      "args": ["-y", "operaton-mcp"],
      "env": {
        "OPERATON_BASE_URL": "http://localhost:8080/engine-rest",
        "OPERATON_USERNAME": "demo",
        "OPERATON_PASSWORD": "demo"
      }
    }
  }
}
```

## Example Prompts

Once connected, you can ask your AI assistant natural-language questions about your Operaton instance:

**Deployments & Definitions**
> "Deploy this BPMN file to Operaton and name it `loan-approval-v3`."
> "List all deployed versions of the `invoice-approval` process."
> "Show me the BPMN XML for the latest version of the `onboarding` process."
> "Delete the old `loan-approval` definition — it has no active instances."

**Process Instances**
> "Start a new `invoice-approval` process with business key `INV-2024-001` and set the `amount` variable to 15000."
> "List all active instances of the `loan-approval` process."
> "Suspend the instance `abc-123` while we investigate the failure."
> "What variables are currently set on process instance `abc-123`?"

**User Tasks**
> "Show me all unassigned tasks for the `approvers` group."
> "Claim task `task-456` for user `john.doe`."
> "Complete the approval task for invoice INV-2024-001 and set `approved = true`."
> "How many overdue tasks are there across all processes?"

**Operations & Incidents**
> "Are there any failed jobs with no retries left?"
> "Reset the retry count to 3 for job `job-789` and trigger immediate execution."
> "List all open incidents for the `payment-processing` process."

**History & Audit**
> "Show me all completed `invoice-approval` instances from last week."
> "What activities were executed in process instance `abc-123`, and how long did each take?"
> "Who completed the approval task for business key `INV-2024-001`, and when?"

**Decisions**
> "Deploy this DMN decision table for loan eligibility checking."
> "Evaluate the `credit-check` decision with `income = 50000` and `creditScore = 720`."

**Administration**
> "Create a new user `jane.smith` with email `jane@example.com`."
> "Add `john.doe` to the `senior-approvers` group."

## Available Tool Groups

### `processDefinition`

Manage deployed process definitions — browse, inspect, suspend, and delete BPMN definitions.

- **list** — query definitions with optional filters (key, name, version, tenant); count total matches
- **get by ID / key** — retrieve definition metadata for a specific ID or latest by key
- **get XML** — fetch BPMN 2.0 XML for a definition by ID or key
- **statistics** — process-level and activity-level statistics across all running instances
- **suspend by key** — suspend or resume all instances belonging to a definition
- **delete by ID / key** — remove a definition (and optionally its instances and history)
- **restart instances** — restart historic process instances synchronously or asynchronously
- **set history TTL** — update the history time-to-live for a definition
- **get called processes** — list static called process definitions for a given definition

### `deployment`

Deploy, inspect, and manage Operaton deployments (BPMN, DMN, CMMN, and form files).

- **create** — upload a BPMN/DMN/CMMN resource to create a new deployment
- **list** — query deployments with optional filters; count total matches
- **get by ID** — retrieve metadata for a specific deployment
- **list resources** — list all resources included in a deployment
- **redeploy** — create a new deployment from the resources of an existing one
- **delete** — remove a deployment by ID

### `processInstance`

Start and manage the lifecycle of running process instances.

- **start** — start a new instance by definition ID or key, with optional business key and variables
- **list** — query active instances with filters; count total matches
- **get** — retrieve metadata for a specific instance
- **get activity tree** — inspect the current activity instance hierarchy
- **suspend / resume** — suspend or resume execution of an instance or a group of instances
- **delete** — terminate and remove a process instance
- **get / set variables** — read or write individual or multiple process variables
- **set suspension** — bulk suspend/resume by definition ID, key, or tenant

### `task`

Query and manage the full lifecycle of user tasks.

- **list** — query tasks with rich filter criteria; count total matches
- **get** — retrieve a task by ID
- **claim / unclaim** — assign or release a task
- **complete** — complete a task with optional output variables
- **delegate** — delegate a task to another user
- **resolve** — resolve a delegated task back to the owner
- **set assignee** — directly set or change task assignee
- **create / update** — create a standalone task or update task properties
- **get / set variables** — read or write task-local variables
- **throw BPMN error** — trigger a BPMN error boundary event from a task

### `job`

Inspect and control asynchronous jobs (timers, async continuations, retries).

- **list** — query jobs with filters; count total matches
- **get** — retrieve a job by ID
- **trigger execution** — execute a job immediately (bypass timer)
- **suspend / resume** — suspend or resume a job
- **set retries** — update the retry count on a failed job
- **get stack trace** — retrieve the exception stack trace for a failed job

### `jobDefinition`

Manage job definitions — the templates from which individual jobs are created.

- **list** — query job definitions with filters
- **get** — retrieve a job definition by ID
- **set suspension** — suspend or activate job definitions by process definition

### `incident`

Query and resolve process incidents (failed jobs, failed external tasks, etc.).

- **list** — query open incidents with filters; count total matches
- **get** — retrieve an incident by ID
- **resolve** — resolve an open incident

### `user`

Manage Operaton users and their credentials.

- **list** — query users with filters
- **get profile** — retrieve a user's profile information
- **create** — create a new user with profile and credentials
- **update profile** — update a user's display name and email
- **update password** — change a user's password
- **delete** — remove a user
- **unlock** — unlock a user account after too many failed logins

### `group`

Manage Operaton groups and their memberships.

- **list** — query groups with filters
- **create / delete** — create or remove a group
- **add / remove member** — manage group membership

### `history`

Query the audit trail of completed and historic process data.

- **list process instances** — query finished or active process instances in history
- **list activity instances** — query historic activity executions
- **list task instances** — query historic task completions and assignments
- **list variable instances** — query historic variable values
- **list incidents** — query historic incidents (including resolved)
- **list job logs** — query historic job execution log entries
- **list user operations** — query the audit log of user operations (claims, completions, etc.)

### `decision`

Deploy and evaluate DMN decision tables.

- **list** — query deployed decision definitions
- **get by key** — retrieve a decision definition by key
- **get XML by key** — fetch DMN XML for a decision
- **evaluate** — evaluate a decision table with input variables
- **list requirements** — list decision requirement diagrams (DRDs)

## Out of Scope

The following capabilities are not available in the current release:

- **Autonomous monitoring** — AI-initiated process health watching and alerting (planned: Vision phase)
- **BPMN generation** — natural language → BPMN authoring and AI-assisted process design (planned: Growth phase)
- **Multi-engine support** — connecting to multiple Operaton instances simultaneously (planned: Growth phase)
- **Prompt templates** — guided scenario workflows for common operational tasks (planned: Growth phase)
- **UI or dashboard** — no web interface; operaton-mcp is a pure MCP server

Growth and Vision phase features are tracked in the project roadmap.

## Development

```bash
# Install dependencies (triggers code generation automatically)
npm install

# Run code generation manually
npm run generate

# Build (generate + compile + alias rewrite)
npm run build

# Watch mode for local development
npm run dev

# Run all tests (unit + smoke)
npm test

# Run integration tests (requires live Operaton instance)
OPERATON_BASE_URL=http://localhost:8080/engine-rest \
OPERATON_USERNAME=demo \
OPERATON_PASSWORD=demo \
npm run test:integration
```

### Project Structure

```
src/
  index.ts          — MCP server entry point
  config.ts         — Environment variable loading and validation
  http/
    client.ts       — Operaton HTTP client with Basic Auth
    errors.ts       — Error normalization with BPM-domain hints
  generated/        — Build artifact (gitignored); produced by npm run generate
  tools/            — Curated tool wrappers (hand-written)
config/
  tool-manifest.json         — Full curation manifest (name, description, frMapping per operationId)
  tool-manifest.fixture.json — Fixture for development/testing
resources/
  operaton-rest-api.json     — Authoritative OpenAPI 3.0.2 spec (never modify)
scripts/
  generate.ts       — Code generation pipeline
```
