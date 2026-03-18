# Story 9.6: Release Workflow

Status: review

## Story

As a maintainer of operaton-mcp,
I want a GitHub Actions release workflow that supports preliminary (SNAPSHOT) and final releases with a dry-run mode,
so that I can publish pre-releases for community testing and cut stable releases with auto-generated changelogs — safely and repeatably.

## Acceptance Criteria

1. **Given** `.github/workflows/release.yml` is reviewed **When** checking the workflow inputs **Then** it declares two inputs: `release_type` (choice: `preliminary` | `final`, required) and `dry_run` (boolean, default `false`).

2. **Given** the workflow is triggered with `release_type=preliminary` and `dry_run=false` **When** it completes **Then**:
   - The NPM package is published with version `x.y.z-SNAPSHOT` to the `next` dist-tag
   - A GitHub pre-release is created (or overwritten if it already exists) with the `SNAPSHOT` tag
   - The changelog in the pre-release is auto-generated from conventional commits since the last stable tag

3. **Given** the workflow is triggered with `release_type=final` and `dry_run=false` **When** it completes **Then**:
   - A semver git tag (`x.y.z`) is created from the current `main` HEAD
   - The NPM package is published to the stable (`latest`) dist-tag with npm provenance attestation (`--provenance`)
   - A GitHub Release is created with the auto-generated changelog
   - A commit bumping `package.json` version to `x.(y+1).0-SNAPSHOT` is pushed to `main`

4. **Given** the workflow is triggered with `dry_run=true` (any `release_type`) **When** it completes **Then**:
   - JReleaser runs with `--dry-run` flag
   - No NPM publish occurs (dry-run flag passed to npm or JReleaser skips publish)
   - No GitHub Release is created or modified
   - No git tags are pushed
   - No version bump commit is pushed
   - The workflow log shows what *would* have happened

5. **Given** the release workflow is reviewed **When** checking job permissions **Then** the job declares `contents: write` permission (for pushing tags and releases) and `id-token: write` permission (for npm provenance attestation).

6. **Given** the final release job runs **When** checking the version bump step **Then** it uses `npm version minor --no-git-tag-version` to increment to next minor, appends `-SNAPSHOT`, commits with message `chore(ci): bump version to x.(y+1).0-SNAPSHOT [skip ci]`, and pushes to `main`.

7. **Given** the release workflow file is reviewed **When** checking trigger conditions **Then** it is triggered only via `workflow_dispatch` (manual trigger) — not on push, not on tag, not on schedule.

## Tasks / Subtasks

- [x] Create `.github/workflows/release.yml` with `workflow_dispatch` trigger and two inputs: `release_type` and `dry_run` (AC: 1, 7)
- [x] Add preliminary release job:
  - [x] Build step: `npm ci && npm run build`
  - [x] Set version to `x.y.z-SNAPSHOT` in `package.json` (AC: 2)
  - [x] NPM publish to `next` dist-tag (skip if dry_run) (AC: 2, 4)
  - [x] JReleaser pre-release with `overwrite: true` (skip if dry_run) (AC: 2, 4)
- [x] Add final release job:
  - [x] Build step: `npm ci && npm run build`
  - [x] Create and push semver git tag (skip if dry_run) (AC: 3, 4)
  - [x] NPM publish to `latest` with `--provenance` (skip if dry_run) (AC: 3, 4, 5)
  - [x] JReleaser full-release (skip if dry_run) (AC: 3, 4)
  - [x] Version bump to `x.(y+1).0-SNAPSHOT` and push commit (skip if dry_run) (AC: 3, 4, 6)
- [x] Set job permissions: `contents: write`, `id-token: write` (AC: 5)
- [x] Test dry-run mode end-to-end: verify no external mutations (AC: 4)

## Dev Notes

### Workflow Trigger

```yaml
on:
  workflow_dispatch:
    inputs:
      release_type:
        description: 'Release type'
        required: true
        type: choice
        options:
          - preliminary
          - final
      dry_run:
        description: 'Dry run (no external mutations)'
        type: boolean
        default: false
```

### Job Permissions

```yaml
jobs:
  release:
    permissions:
      contents: write    # push tags, create releases, push version bump commit
      id-token: write    # npm provenance attestation
```

### Preliminary Release Steps

```yaml
- name: Set SNAPSHOT version
  run: |
    CURRENT=$(node -p "require('./package.json').version.replace(/-SNAPSHOT$/, '')")
    npm version "$CURRENT-SNAPSHOT" --no-git-tag-version

- name: Publish to NPM (next tag)
  if: ${{ !inputs.dry_run }}
  run: npm publish --tag next --provenance
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

- name: Create pre-release via JReleaser
  if: ${{ !inputs.dry_run }}
  uses: jreleaser/release-action@v2
  with:
    arguments: full-release
  env:
    JRELEASER_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    JRELEASER_PROJECT_VERSION: ${{ env.SNAPSHOT_VERSION }}
```

### Final Release Steps

```yaml
- name: Create and push tag
  if: ${{ !inputs.dry_run }}
  run: |
    git tag "v$VERSION"
    git push origin "v$VERSION"

- name: Publish to NPM (latest, with provenance)
  if: ${{ !inputs.dry_run }}
  run: npm publish --provenance
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

- name: Create release via JReleaser
  if: ${{ !inputs.dry_run }}
  uses: jreleaser/release-action@v2
  with:
    arguments: full-release
  env:
    JRELEASER_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Bump to next minor SNAPSHOT
  if: ${{ !inputs.dry_run }}
  run: |
    npm version minor --no-git-tag-version
    NEXT=$(node -p "require('./package.json').version")
    npm version "$NEXT-SNAPSHOT" --no-git-tag-version
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add package.json package-lock.json
    git commit -m "chore(ci): bump version to $NEXT-SNAPSHOT [skip ci]"
    git push origin main
```

### Dry-Run Handling

All mutating steps use `if: ${{ !inputs.dry_run }}`. JReleaser also accepts `--dry-run` flag for additional verification:

```yaml
- name: JReleaser dry-run validation
  if: ${{ inputs.dry_run }}
  uses: jreleaser/release-action@v2
  with:
    arguments: full-release --dry-run
```

### npm Provenance

`--provenance` generates a signed SLSA provenance attestation linked to the GitHub Actions run. Requires `id-token: write` permission. Available on npm registry as a trust signal for package consumers.

### Required Secrets

- `NPM_TOKEN` — npm automation token with publish permission
- `GITHUB_TOKEN` — automatically provided by GitHub Actions (no setup needed for releases in the same repo)

### Key File Locations

- `.github/workflows/release.yml` — new workflow
- `package.json` — version modified during workflow run

### Dependencies

- Story 9.4 (CI Enhancements) — `.nvmrc` used for Node.js version
- Story 9.5 (JReleaser Config) — `jreleaser.yml` must exist before this workflow runs

### References

- PRD: FR-41, NFR-07
- Epics: `_bmad-output/planning-artifacts/epics.md#Story 9.6`
- Story 9.5: `_bmad-output/implementation-artifacts/9-5-jreleaser-configuration.md`
- JReleaser release-action: https://github.com/jreleaser/release-action

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Created `.github/workflows/release.yml` with `workflow_dispatch` trigger and two inputs: `release_type` (choice: preliminary | final) and `dry_run` (boolean, default false) (AC 1, 7).
- Single `release` job with `contents: write` and `id-token: write` permissions (AC 5).
- Preliminary path: sets SNAPSHOT version, publishes to `next` dist-tag with `--provenance`, creates pre-release via JReleaser (all skipped if dry_run); JReleaser runs with `--dry-run` flag when dry_run=true (AC 2, 4).
- Final path: extracts clean version, creates and pushes semver tag, publishes to `latest` with `--provenance`, runs JReleaser full-release, bumps to next minor SNAPSHOT and pushes commit (all skipped if dry_run); JReleaser dry-run runs when dry_run=true (AC 3, 4, 6).
- Version bump commit uses message `chore(ci): bump version to $NEXT-SNAPSHOT [skip ci]` to prevent infinite CI loops (AC 6).
- All 44 unit tests pass; no code changes required beyond the workflow file.

### File List

- `.github/workflows/release.yml` (new)

## Change Log

- 2026-03-18: Implemented Story 9.6 — created release.yml workflow with preliminary/final release support, dry-run mode, JReleaser integration, npm provenance attestation, and automated version bump.
