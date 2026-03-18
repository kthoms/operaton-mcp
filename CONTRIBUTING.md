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

Thank you for your interest in contributing to **operaton-mcp** — the MCP server that exposes the Operaton BPM REST API to AI agents.

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/operaton-mcp.git
   cd operaton-mcp
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Build** the project:
   ```bash
   npm run build
   ```
5. **Test** your changes:
   ```bash
   npm test
   ```
6. **Open a PR** against the `main` branch of the upstream repository.

## Development

### Running Tests

| Command | Description |
|---|---|
| `npm test` | Run all unit and smoke tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:smoke` | Smoke tests (requires built binary) |
| `npm run test:integration` | Integration tests against a live Operaton instance |

Integration tests require a running Operaton instance. Set `OPERATON_BASE_URL` to point at your instance. To skip the startup connectivity check during development, set:

```bash
export OPERATON_SKIP_HEALTH_CHECK=true
```

### Code Generation

The MCP tool handlers in `src/generated/` are produced by the code generator. After modifying `config/tool-manifest.json` or the generator itself, re-run:

```bash
npm run generate
```

Do **not** manually edit files in `src/generated/` — they will be overwritten on the next generation run.

### License Headers

Every `.ts` file must begin with the Operaton Apache 2.0 license header. To add missing headers:

```bash
npm run add:license
```

To verify all files have the header:

```bash
npm run check:license
```

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <short description>
```

### Scopes

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

### Examples

```
feat(process): add bulk suspend endpoint
fix(incident): handle null incident message on resolve
chore(ci): add commitlint to PR workflow
docs(deploy): document deployment ID return format
```

## Submitting a PR

- Keep PRs focused — one logical change per PR.
- Ensure `npm test` passes before opening the PR.
- Run `npm run check:license` to verify all new files carry the license header.
- Write a clear PR description explaining what changed and why.
- Reference any related issues in the PR body.
