# Story 6.1: Create, Update, and Delete Operaton Users

Status: ready-for-dev

## Story

As an administrator using operaton-mcp,
I want to create new Operaton user accounts, update existing profiles and passwords, and delete accounts no longer needed,
so that I can manage the Operaton user landscape through AI without requiring Cockpit admin access.

## Acceptance Criteria

1. **Given** the user and group manifest groups are populated with real BPM-domain descriptions and `frMapping` for FR-24 to FR-29, and `npm run generate` is run **When** `tools/list` is called **Then** user and group tools appear in the list with descriptions ≤ 200 chars using BPM-domain terminology appropriate for an administrator audience; `frMapping` covers FR-24 through FR-29.

2. **Given** a create-user call is made with a unique ID, first name, last name, email, and password (FR-24) **When** the tool call completes **Then** the response confirms the user account was created.

3. **Given** a create-user call uses an ID that already exists **When** the tool call completes **Then** `isError: true` is returned with a structured error identifying the ID conflict.

4. **Given** an update-user call is made to change a user's profile or password (FR-25) **When** the tool call completes **Then** the response confirms the update.

5. **Given** a delete-user call is made for an existing user ID (FR-26) **When** the tool call completes **Then** the response confirms deletion.

6. **Given** a delete-user call targets a user ID that does not exist **When** the tool call completes **Then** `isError: true` is returned with a structured not-found error.

7. **Given** the integration tests for FR-24, FR-25, and FR-26 run **When** `npm run test:integration` executes **Then** all tests pass; test runs against `test/integration/user.test.ts`; created users are deleted in `afterEach`.

## Tasks / Subtasks

- [ ] Populate `config/tool-manifest.json` — user and group groups (AC: 1)
  - [ ] **user group:**
    - FR-24 (`createUser`): name `user_create`, `frMapping: ["FR-24"]`
    - FR-25 (`updateUser`): name `user_updateProfile`, `frMapping: ["FR-25"]`
    - FR-25 password (`updateUserCredentials`): name `user_updatePassword`, `frMapping: ["FR-25"]`
    - FR-26 (`deleteUser`): name `user_delete`, `frMapping: ["FR-26"]`
    - FR-27 (`getUsers`): name `user_list`, `frMapping: ["FR-27"]`
  - [ ] **group group:**
    - FR-28 create (`createGroup`): name `group_create`, `frMapping: ["FR-28"]`
    - FR-28 delete (`deleteGroup`): name `group_delete`, `frMapping: ["FR-28"]`
    - FR-29 add member (`createGroupMember`): name `group_addMember`, `frMapping: ["FR-29"]`
    - FR-29 remove member (`deleteGroupMember`): name `group_removeMember`, `frMapping: ["FR-29"]`
    - Query groups + get group members: `frMapping: []`
  - [ ] All descriptions ≤ 200 chars; administrator audience language
  - [ ] Run `npm run generate`
- [ ] Verify user create/update/delete handlers (AC: 2, 4, 5)
  - [ ] `user_create`: `POST /engine/{engineName}/user/create` body `{ "profile": { "id", "firstName", "lastName", "email" }, "credentials": { "password" } }`
    - Zod: `{ id: string, firstName: string, lastName: string, email: string, password: string }`
    - Success: confirm `"User {id} created successfully."`
  - [ ] `user_updateProfile`: `PUT /engine/{engineName}/user/{id}/profile` body with profile fields
    - Zod: `{ id: string, firstName?: string, lastName?: string, email?: string }`
  - [ ] `user_updatePassword`: `PUT /engine/{engineName}/user/{id}/credentials` body `{ "password" }`
    - Zod: `{ id: string, password: string }`
  - [ ] `user_delete`: `DELETE /engine/{engineName}/user/{id}` → success 204 → confirm
- [ ] Verify error handling for ID conflict and not-found (AC: 3, 6)
  - [ ] Duplicate ID: add `"UserAlreadyExistsException"` or `"InvalidRequestException"` to error map
    - Hint: "Choose a different user ID — this ID is already taken."
  - [ ] Not found on delete: `"NotFoundException"` → standard hint
- [ ] Create integration test `test/integration/user.test.ts` (AC: 7)
  - [ ] `beforeEach`: generate unique test user ID (e.g., `test-user-{timestamp}`)
  - [ ] Test: create user → confirm; verify user exists via list
  - [ ] Test: create duplicate ID → `isError: true`, conflict error
  - [ ] Test: update profile → confirm; verify updated via get/list
  - [ ] Test: update password → confirm (verification of password change is hard — just confirm no error)
  - [ ] Test: delete user → confirm; verify deleted (404 on get or empty list)
  - [ ] Test: delete non-existent user → `isError: true`, not-found
  - [ ] `afterEach`: delete test user (try/catch — may already be deleted)
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### Operaton User Management API

**Create:** `POST /engine/{engineName}/user/create`
```json
{
  "profile": { "id": "john", "firstName": "John", "lastName": "Doe", "email": "john@example.com" },
  "credentials": { "password": "secret" }
}
```

**Update profile:** `PUT /engine/{engineName}/user/{id}/profile`
**Update password:** `PUT /engine/{engineName}/user/{id}/credentials` body `{ "password": "newSecret" }`
**Delete:** `DELETE /engine/{engineName}/user/{id}`

All write operations return HTTP 204 on success.

### Error Types to Map

- `"InvalidRequestException"` (duplicate ID) → hint: "User ID {id} already exists. Choose a different ID."
- `"AuthorizationException"` → hint: "Check admin credentials have user management permission."

### Integration Test User ID Strategy

Use time-based unique IDs to prevent test interference:
```typescript
const testUserId = `test-user-${Date.now()}`;
```

Always clean up in `afterEach` — don't rely on test framework to clean up.

### Anti-Patterns to Avoid

- ❌ Do NOT use real user IDs (e.g., `demo`, `admin`) in tests — use generated unique IDs
- ❌ Do NOT test password verification (Operaton doesn't have a "verify password" endpoint) — just confirm no error on update

### Key File Locations

- `config/tool-manifest.json` — add user and group groups
- `src/generated/user/` — generated (do not edit)
- `src/generated/group/` — generated (do not edit)
- `test/integration/user.test.ts` — new integration test file

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 6.1`
- PRD FR-24, FR-25, FR-26

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
