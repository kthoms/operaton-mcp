# Story 9.3: SECURITY.md

Status: review

## Story

As a security researcher or user of operaton-mcp,
I want a SECURITY.md that tells me which versions are supported and how to report vulnerabilities responsibly,
so that I can disclose issues through the correct channel without resorting to public disclosure.

## Acceptance Criteria

1. **Given** `SECURITY.md` is opened **When** inspecting the top of the file **Then** it begins with the Operaton Apache 2.0 license header in HTML comment block format (same as CONTRIBUTING.md).

2. **Given** `SECURITY.md` is reviewed **When** checking the Supported Versions section **Then** it states that the latest major version receives security updates, with a table showing supported versions.

3. **Given** `SECURITY.md` is reviewed **When** checking the Reporting a Vulnerability section **Then** it directs reporters to use GitHub Security Advisories at the operaton-mcp repository URL, and lists the required submission details:
   - Clear explanation of the vulnerability and its consequences
   - Affected versions and system environment
   - Reproduction steps with proof-of-concept if available
   - Reporter contact information
   - Attribution preferences

4. **Given** `SECURITY.md` is reviewed **When** checking the Response Process section **Then** it describes: initial acknowledgment timing, investigation and progress updates, fix release process, and advisory publication with researcher credit on request.

5. **Given** `SECURITY.md` is reviewed **When** checking the Scope section **Then** it lists what is in scope (source code, build processes, official releases) and what is out of scope (DoS attacks, third-party library issues, social engineering, local exploits without privilege escalation).

6. **Given** `SECURITY.md` is reviewed **When** checking the legal framing **Then** it references Apache License 2.0 and notes the volunteer-led nature of the project (no contractual commitments or SLA).

7. **Given** `SECURITY.md` exists at the project root **When** GitHub processes the repository **Then** GitHub automatically surfaces it in the Security tab as the security policy.

## Tasks / Subtasks

- [x] Create `SECURITY.md` at project root with Operaton license header in HTML comment block (AC: 1)
- [x] Add Supported Versions section with version support table (AC: 2)
- [x] Add Reporting a Vulnerability section with GitHub Security Advisories link and submission checklist (AC: 3)
- [x] Add Response Process section describing acknowledgment, investigation, fix, and advisory timeline (AC: 4)
- [x] Add Scope section listing in-scope and out-of-scope areas (AC: 5)
- [x] Add legal framing paragraph referencing Apache 2.0 and volunteer-led model (AC: 6)

## Dev Notes

### Structure Reference

Modelled on https://github.com/operaton/operaton/blob/main/SECURITY.md — same sections, same structure, adapted for operaton-mcp:
- "Supported Versions" table: `1.x.x | ✅` (latest major)
- "Reporting" via GitHub Security Advisories at `https://github.com/operaton/operaton-mcp/security/advisories/new`
- Response: volunteer-led, acknowledgment "within a few days", no formal SLA
- Scope: source code, build process, official releases — excludes DoS, third-party libs, social engineering

### GitHub Security Advisory Link

The link in SECURITY.md should point to:
```
https://github.com/operaton/operaton-mcp/security/advisories/new
```

### License Header

Same HTML comment format as CONTRIBUTING.md (see Story 9.2 dev notes).

### Key File Locations

- `SECURITY.md` — project root

### References

- PRD: FR-38
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 9.3`
- Reference: https://github.com/operaton/operaton/blob/main/SECURITY.md

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Created `SECURITY.md` at project root with all required sections.
- License header present as HTML comment block at top of file (AC 1).
- Supported Versions section with table showing `1.x.x | ✅` (AC 2).
- Reporting a Vulnerability section directs to GitHub Security Advisories with link `https://github.com/operaton/operaton-mcp/security/advisories/new` and lists all 5 required submission details (AC 3).
- Response Process section covers acknowledgment within a few days, investigation updates, fix release, and advisory publication with credit on request (AC 4).
- Scope section with in-scope (source code, build process, official releases) and out-of-scope (DoS, third-party libs, social engineering, local exploits without privilege escalation) (AC 5).
- Legal section references Apache License 2.0, volunteer-led model, no contractual commitments or SLA (AC 6).
- File is at project root; GitHub will automatically surface it in the Security tab (AC 7).

### File List

- `SECURITY.md` (new)

## Change Log

- 2026-03-18: Implemented Story 9.3 — created SECURITY.md with license header, supported versions, vulnerability reporting process, response timeline, scope definitions, and legal framing.
