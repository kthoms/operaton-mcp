// Integration test for Stories 6.1, 6.2: User & Group Administration
// Requires a live Operaton instance — skipped when OPERATON_BASE_URL is unset
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";
import { createOperatonClient } from "../../src/http/client.js";
import { createUser } from "../../src/generated/user/createUser.js";
import { getUsers } from "../../src/generated/user/getUsers.js";
import { getUserProfile } from "../../src/generated/user/getUserProfile.js";
import { updateProfile } from "../../src/generated/user/updateProfile.js";
import { deleteUser } from "../../src/generated/user/deleteUser.js";
import { createGroup } from "../../src/generated/group/createGroup.js";
import { deleteGroup } from "../../src/generated/group/deleteGroup.js";
import { createGroupMember } from "../../src/generated/group/createGroupMember.js";
import { deleteGroupMember } from "../../src/generated/group/deleteGroupMember.js";

const skip = !process.env["OPERATON_BASE_URL"];

describe.skipIf(skip)("user and group integration", () => {
  const ts = Date.now();
  const testUserId = `test-user-${ts}`;
  const testGroupId = `test-group-${ts}`;

  beforeEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    // Create test user
    await createUser(
      {
        profile: { id: testUserId, firstName: "Test", lastName: "User", email: "test@example.com" },
        credentials: { password: "test-password-123" },
      } as Record<string, unknown>,
      client,
    );
  });

  afterEach(async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    // Remove group member and delete group if exists
    try { await deleteGroupMember({ id: testGroupId, userId: testUserId }, client); } catch { /* ok */ }
    try { await deleteGroup({ id: testGroupId }, client); } catch { /* ok */ }
    // Delete test user
    try { await deleteUser({ id: testUserId }, client); } catch { /* ok */ }
  });

  // Story 6.1 —— create, update, delete users
  it("creates a user and confirms success", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getUserProfile({ id: testUserId }, client);
    const profile = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(profile["id"]).toBe(testUserId);
    expect(profile["firstName"]).toBe("Test");
  });

  it("returns isError true when creating a user with a duplicate ID", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await createUser(
      {
        profile: { id: testUserId, firstName: "Dup", lastName: "User", email: "dup@example.com" },
        credentials: { password: "pass" },
      } as Record<string, unknown>,
      client,
    );
    expect((result as Record<string, unknown>)["isError"]).toBe(true);
  });

  it("updates a user profile", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await updateProfile(
      { id: testUserId, firstName: "Updated", lastName: "User", email: "updated@example.com" },
      client,
    );
    expect(result.isError).toBeUndefined();
  });

  it("deletes an existing user and returns confirmation", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await deleteUser({ id: testUserId }, client);
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain("deleteUser completed successfully");
    // Don't let afterEach try to delete again
  });

  it("returns isError true when deleting a non-existent user", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await deleteUser({ id: "nonexistent-user-xyz" }, client);
    expect((result as Record<string, unknown>)["isError"]).toBe(true);
  });

  // Story 6.2 —— query users, manage groups
  it("queries users by ID and returns profile info", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const result = await getUsers({ id: testUserId }, client);
    const users = JSON.parse(result.content[0]!.text) as Array<Record<string, unknown>>;
    expect(users.length).toBeGreaterThan(0);
    expect(users[0]!["id"]).toBe(testUserId);
  });

  it("creates and deletes a group", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    const createResult = await createGroup(
      { id: testGroupId, name: "Test Group", type: "WORKFLOW" } as Record<string, unknown>,
      client,
    );
    expect(createResult.isError).toBeUndefined();

    const deleteResult = await deleteGroup({ id: testGroupId }, client);
    expect(deleteResult.isError).toBeUndefined();
  });

  it("adds and removes a user from a group", async () => {
    const config = loadConfig();
    const client = createOperatonClient(config);
    await createGroup(
      { id: testGroupId, name: "Test Group", type: "WORKFLOW" } as Record<string, unknown>,
      client,
    );

    const addResult = await createGroupMember({ id: testGroupId, userId: testUserId }, client);
    expect(addResult.isError).toBeUndefined();

    const removeResult = await deleteGroupMember({ id: testGroupId, userId: testUserId }, client);
    expect(removeResult.isError).toBeUndefined();
  });
});
