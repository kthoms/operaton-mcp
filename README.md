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

## Available Tool Groups

| Group | Description |
|---|---|
| `deployment` | Deploy BPMN, DMN, and CMMN artifacts |
| `processDefinition` | List, inspect, and delete process definitions |
| `processInstance` | Start, query, suspend, resume, and delete process instances |
| `task` | Query, claim, complete, and manage user tasks |
| `job` | Query jobs, trigger immediate execution, suspend/resume |
| `jobDefinition` | Query and manage job definitions |
| `incident` | List and resolve process incidents |
| `user` | Create, update, and delete Operaton users |
| `group` | Query and manage Operaton groups and memberships |
| `history` | Query historic process instances, activities, tasks, and variables |
| `decision` | Deploy and evaluate DMN decision tables |

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
