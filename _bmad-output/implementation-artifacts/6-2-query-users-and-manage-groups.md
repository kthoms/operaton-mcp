# Story 6.2: Query Users and Manage Groups

Status: review

## Story

As an administrator using operaton-mcp,
I want to query Operaton users by profile attributes, create and delete groups, and manage group membership,
so that I can perform full user and group administration through AI in a single conversation.

## Acceptance Criteria

1. **Given** a query-users call is made filtered by ID, first name, last name, or email (FR-27) **When** the tool call completes **Then** a structured list of matching users is returned.

2. **Given** a create-group call is made with a group ID and name (FR-28) **When** the tool call completes **Then** the response confirms the group was created.

3. **Given** a delete-group call is made for an existing group ID (FR-28) **When** the tool call completes **Then** the response confirms deletion; a structured error is returned if the group does not exist.

4. **Given** an add-member call is made with a valid user ID and group ID (FR-29) **When** the tool call completes **Then** the response confirms the user was added to the group.

5. **Given** a remove-member call is made for a user/group pair where the user is not a member **When** the tool call completes **Then** `isError: true` is returned with a structured error.

6. **Given** the integration tests for FR-27, FR-28, and FR-29 run **When** `npm run test:integration` executes **Then** all tests pass; test runs against `test/integration/group.test.ts`; created groups and group memberships are deleted in `afterEach`.

## Tasks / Subtasks

- [ ] Verify `user_list`, `group_create`, `group_delete`, `group_addMember`, `group_removeMember` manifest entries (manifest populated in Story 6.1)
  - [ ] `user_list`: `GET /engine/{engineName}/user` with query params; Zod: `{ id?: string, firstName?: string, lastName?: string, email?: string, memberOfGroup?: string }`
  - [ ] `group_create`: `POST /engine/{engineName}/group/create` body `{ "id": string, "name": string, "type": string }`; Zod: `{ id: string, name: string, type?: string }`
  - [ ] `group_delete`: `DELETE /engine/{engineName}/group/{id}`; Zod: `{ id: string }`
  - [ ] `group_addMember`: `PUT /engine/{engineName}/group/{id}/members/{userId}`; Zod: `{ groupId: string, userId: string }`
  - [ ] `group_removeMember`: `DELETE /engine/{engineName}/group/{id}/members/{userId}`; Zod: `{ groupId: string, userId: string }`
  - [ ] Run `npm run generate` to verify
- [ ] Verify user list handler returns correct fields (AC: 1)
  - [ ] Response: array of user objects with `id`, `firstName`, `lastName`, `email`
  - [ ] Supports all filter combinations from Zod schema
- [ ] Verify group management handlers (AC: 2, 3, 4, 5)
  - [ ] `group_create`: HTTP 204 → confirm `"Group {id} created successfully."`
  - [ ] `group_delete`: HTTP 204 → confirm; 404 → structured not-found error
  - [ ] `group_addMember`: HTTP 204 → confirm `"User {userId} added to group {groupId}."`
  - [ ] `group_removeMember`: HTTP 204 → confirm; error if not a member → structured error
    - Add error mapping: `"MembershipNotFoundException"` or similar → hint: "The user is not a member of this group."
- [ ] Create integration test `test/integration/group.test.ts` (AC: 6)
  - [ ] `beforeEach`: create a test user (unique ID) + generate unique group ID
  - [ ] Test: query user by ID → returns test user with correct profile fields
  - [ ] Test: query user by firstName → returns matching users
  - [ ] Test: create group → confirm
  - [ ] Test: delete existing group → confirm
  - [ ] Test: delete non-existent group → `isError: true`, not-found
  - [ ] Test: add user to group → confirm; verify via list-members or query-users with `memberOfGroup`
  - [ ] Test: remove member from group → confirm
  - [ ] Test: remove non-member → `isError: true`, not-member error
  - [ ] `afterEach`: delete group memberships → delete group → delete test user (order matters)
  - [ ] Skip if `OPERATON_BASE_URL` unset

## Dev Notes

### Prerequisite

Story 6.1 must be complete (user and group manifest groups populated, generation run).

### Operaton Group API

**Create group:** `POST /engine/{engineName}/group/create`
```json
{ "id": "testGroup", "name": "Test Group", "type": "WORKFLOW" }
```

**Delete group:** `DELETE /engine/{engineName}/group/{id}`

**Add member:** `PUT /engine/{engineName}/group/{id}/members/{userId}` (no body)

**Remove member:** `DELETE /engine/{engineName}/group/{id}/members/{userId}`

**List group members:** `GET /engine/{engineName}/user?memberOfGroup={groupId}` — uses the user list endpoint with `memberOfGroup` filter.

### afterEach Cleanup Order

```typescript
afterEach(async () => {
  // 1. Remove test user from group
  try { await client.delete(`/engine/default/group/${testGroupId}/members/${testUserId}`); } catch {}
  // 2. Delete group
  try { await client.delete(`/engine/default/group/${testGroupId}`); } catch {}
  // 3. Delete test user
  try { await client.delete(`/engine/default/user/${testUserId}`); } catch {}
});
```

### Error Type for Non-Member Removal

Operaton may return a 404 or a specific error when trying to remove a non-member. Check the spec and map accordingly.

### Anti-Patterns to Avoid

- ❌ Do NOT use production group names (`camunda-admin`, etc.) in tests
- ❌ `afterEach` must clean up in correct order: membership → group → user

### Key File Locations

- `config/tool-manifest.json` — user and group groups (from Story 6.1)
- `src/generated/user/`, `src/generated/group/` — generated (do not edit)
- `test/integration/group.test.ts` — new integration test file

### References

- Epics: `_bmad-output/planning-artifacts/epics.md#Story 6.2`
- PRD FR-27, FR-28, FR-29

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
