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

# Security Policy

## Supported Versions

The following versions of operaton-mcp currently receive security updates:

| Version | Supported |
|---|---|
| 1.x.x | ✅ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use [GitHub Security Advisories](https://github.com/operaton/operaton-mcp/security/advisories/new) to disclose vulnerabilities privately.

When submitting a report, please include:

- A clear explanation of the vulnerability and its potential consequences
- Affected versions and your system environment
- Step-by-step reproduction instructions, with proof-of-concept code or screenshots if available
- Your contact information for follow-up questions
- Your attribution preferences (credit, anonymous, or no mention)

## Response Process

We are a volunteer-led open-source project. While we do not offer a formal SLA, we aim to:

1. **Acknowledge** your report within a few days of receipt.
2. **Investigate** the issue and keep you informed of progress.
3. **Release a fix** as soon as a patch is ready; security fixes are prioritised over feature work.
4. **Publish a GitHub Security Advisory** once the fix is available, crediting the reporter on request.

## Scope

### In Scope

- Vulnerabilities in the operaton-mcp source code
- Issues in the build or release process that could compromise artifact integrity
- Security issues in official npm releases

### Out of Scope

- Denial-of-service attacks against the Operaton REST API itself
- Vulnerabilities in third-party libraries (report those to the relevant upstream project)
- Social engineering attacks
- Local exploits that do not involve privilege escalation

## Legal

operaton-mcp is released under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). It is maintained by volunteers on a best-effort basis. There are no contractual commitments or service-level agreements of any kind. By participating in responsible disclosure, you agree that your report will be handled in good faith.
